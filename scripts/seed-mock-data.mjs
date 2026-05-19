import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Client } = pg;
const scrypt = promisify(scryptCallback);
const password = "Password123!";

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(value, salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

function daysFromNow(days, hour = 9, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value;
}

async function upsertUser(client, user) {
  const result = await client.query(
    `
      INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "locale", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5::"UserRole", $6, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE
      SET "passwordHash" = EXCLUDED."passwordHash",
          "name" = EXCLUDED."name",
          "role" = EXCLUDED."role",
          "locale" = EXCLUDED."locale",
          "updatedAt" = NOW()
      RETURNING "id"
    `,
    [user.id, user.email, user.passwordHash, user.name, user.role, user.locale ?? "en"],
  );
  return result.rows[0].id;
}

async function upsertOrganization(client, organization) {
  const result = await client.query(
    `
      INSERT INTO "Organization" (
        "id", "userId", "name", "nameKana", "nameEn", "contactName", "type",
        "representativeName", "purpose", "description", "activityAreas",
        "activityRegions", "environmentStyle", "prefecture", "city", "address",
        "publicEmail", "publicPhone", "contactFormUrl", "website", "snsLinks",
        "founded", "recruitmentStatus", "hasWaterDispenser", "hasRestRoom",
        "hasAirConditioning", "activitySpaceSize", "profileImageUrl",
        "workspaceImageUrls", "certificationStatus", "certificationSource",
        "certifiedAt", "certificationSubmittedAt", "certificationReviewedAt",
        "certificationReviewNote", "managerPhone", "managerLegalName",
        "identityDocumentNote", "managerAddress", "isLocationPublic",
        "contactPersonName", "contactPersonRole", "contactPersonPhone",
        "contactPersonEmail", "antiSocialForcesConfirmed", "termsAccepted",
        "legalEntityType", "corporateNumber", "legalName", "legalAddress",
        "registrationDocumentUrl", "bylawsUrl", "profileCompleted", "createdAt",
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::"OrganizationType",
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37,
        $38, $39, $40,
        $41, $42, $43,
        $44, $45, $46,
        $47, $48, $49, $50,
        $51, $52, TRUE, NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE
      SET "name" = EXCLUDED."name",
          "nameKana" = EXCLUDED."nameKana",
          "nameEn" = EXCLUDED."nameEn",
          "contactName" = EXCLUDED."contactName",
          "type" = EXCLUDED."type",
          "representativeName" = EXCLUDED."representativeName",
          "purpose" = EXCLUDED."purpose",
          "description" = EXCLUDED."description",
          "activityAreas" = EXCLUDED."activityAreas",
          "activityRegions" = EXCLUDED."activityRegions",
          "environmentStyle" = EXCLUDED."environmentStyle",
          "prefecture" = EXCLUDED."prefecture",
          "city" = EXCLUDED."city",
          "address" = EXCLUDED."address",
          "publicEmail" = EXCLUDED."publicEmail",
          "publicPhone" = EXCLUDED."publicPhone",
          "contactFormUrl" = EXCLUDED."contactFormUrl",
          "website" = EXCLUDED."website",
          "snsLinks" = EXCLUDED."snsLinks",
          "founded" = EXCLUDED."founded",
          "recruitmentStatus" = EXCLUDED."recruitmentStatus",
          "hasWaterDispenser" = EXCLUDED."hasWaterDispenser",
          "hasRestRoom" = EXCLUDED."hasRestRoom",
          "hasAirConditioning" = EXCLUDED."hasAirConditioning",
          "activitySpaceSize" = EXCLUDED."activitySpaceSize",
          "profileImageUrl" = EXCLUDED."profileImageUrl",
          "workspaceImageUrls" = EXCLUDED."workspaceImageUrls",
          "certificationStatus" = EXCLUDED."certificationStatus",
          "certificationSource" = EXCLUDED."certificationSource",
          "certifiedAt" = EXCLUDED."certifiedAt",
          "certificationSubmittedAt" = EXCLUDED."certificationSubmittedAt",
          "certificationReviewedAt" = EXCLUDED."certificationReviewedAt",
          "certificationReviewNote" = EXCLUDED."certificationReviewNote",
          "managerPhone" = EXCLUDED."managerPhone",
          "managerLegalName" = EXCLUDED."managerLegalName",
          "identityDocumentNote" = EXCLUDED."identityDocumentNote",
          "managerAddress" = EXCLUDED."managerAddress",
          "isLocationPublic" = EXCLUDED."isLocationPublic",
          "contactPersonName" = EXCLUDED."contactPersonName",
          "contactPersonRole" = EXCLUDED."contactPersonRole",
          "contactPersonPhone" = EXCLUDED."contactPersonPhone",
          "contactPersonEmail" = EXCLUDED."contactPersonEmail",
          "antiSocialForcesConfirmed" = EXCLUDED."antiSocialForcesConfirmed",
          "termsAccepted" = EXCLUDED."termsAccepted",
          "legalEntityType" = EXCLUDED."legalEntityType",
          "corporateNumber" = EXCLUDED."corporateNumber",
          "legalName" = EXCLUDED."legalName",
          "legalAddress" = EXCLUDED."legalAddress",
          "registrationDocumentUrl" = EXCLUDED."registrationDocumentUrl",
          "bylawsUrl" = EXCLUDED."bylawsUrl",
          "profileCompleted" = TRUE,
          "updatedAt" = NOW()
      RETURNING "id"
    `,
    [
      organization.id,
      organization.userId,
      organization.name,
      organization.nameKana,
      organization.nameEn,
      organization.contactName,
      organization.type,
      organization.representativeName,
      organization.purpose,
      organization.description,
      organization.activityAreas,
      organization.activityRegions,
      organization.environmentStyle,
      organization.prefecture,
      organization.city,
      organization.address,
      organization.publicEmail,
      organization.publicPhone,
      organization.contactFormUrl,
      organization.website,
      organization.snsLinks,
      organization.founded,
      organization.recruitmentStatus,
      organization.hasWaterDispenser,
      organization.hasRestRoom,
      organization.hasAirConditioning,
      organization.activitySpaceSize,
      organization.profileImageUrl,
      organization.workspaceImageUrls,
      organization.certificationStatus,
      organization.certificationSource,
      organization.certifiedAt,
      organization.certificationSubmittedAt,
      organization.certificationReviewedAt,
      organization.certificationReviewNote,
      organization.managerPhone,
      organization.managerLegalName,
      organization.identityDocumentNote,
      organization.managerAddress,
      organization.isLocationPublic,
      organization.contactPersonName,
      organization.contactPersonRole,
      organization.contactPersonPhone,
      organization.contactPersonEmail,
      organization.antiSocialForcesConfirmed,
      organization.termsAccepted,
      organization.legalEntityType,
      organization.corporateNumber,
      organization.legalName,
      organization.legalAddress,
      organization.registrationDocumentUrl,
      organization.bylawsUrl,
    ],
  );
  return result.rows[0].id;
}

async function upsertVolunteerProfile(client, profile) {
  await client.query(
    `
      INSERT INTO "VolunteerProfile" (
        "id", "userId", "bio", "skills", "interests", "languages",
        "availability", "preferredTaskTypes", "preferredEnvironmentStyle",
        "profileCompleted", "prefecture", "city", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE
      SET "bio" = EXCLUDED."bio",
          "skills" = EXCLUDED."skills",
          "interests" = EXCLUDED."interests",
          "languages" = EXCLUDED."languages",
          "availability" = EXCLUDED."availability",
          "preferredTaskTypes" = EXCLUDED."preferredTaskTypes",
          "preferredEnvironmentStyle" = EXCLUDED."preferredEnvironmentStyle",
          "profileCompleted" = TRUE,
          "prefecture" = EXCLUDED."prefecture",
          "city" = EXCLUDED."city",
          "updatedAt" = NOW()
    `,
    [
      profile.id,
      profile.userId,
      profile.bio,
      profile.skills,
      profile.interests,
      profile.languages,
      profile.availability,
      profile.preferredTaskTypes,
      profile.preferredEnvironmentStyle,
      profile.prefecture,
      profile.city,
    ],
  );
}

async function upsertOpportunity(client, opportunity) {
  await client.query(
    `
      INSERT INTO "Opportunity" (
        "id", "title", "shortDescription", "description", "type", "status",
        "category", "tags", "taskTypeColor", "environmentShape",
        "physicalEffort", "mentalEffort", "skills", "prefecture", "city",
        "address", "googleMapsUrl", "startAt", "endAt", "arrivalTime",
        "durationMinutes", "volunteersNeeded", "maxApplicants", "allowWaitlist",
        "allowMultipleTaskSelection", "taskFlow", "instructions",
        "toolsProvided", "thingsToBring", "arrivalGuidance",
        "firstLandmarkDescription", "firstLandmarkImageUrl", "firstContactName",
        "firstContactRole", "firstContactImageUrl", "coverImageUrl",
        "workspaceImageUrls", "workspace3dEmbedUrl", "preApplicationQuestions",
        "requesterId", "organizationId", "aiDrafted", "publishedAt",
        "completedAt", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, 'EVENT'::"OpportunityType", $5::"OpportunityStatus",
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23,
        FALSE, $24::jsonb, $25,
        $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37::jsonb,
        $38, $39, FALSE, $40,
        $41, NOW(), NOW()
      )
      ON CONFLICT ("id") DO UPDATE
      SET "title" = EXCLUDED."title",
          "shortDescription" = EXCLUDED."shortDescription",
          "description" = EXCLUDED."description",
          "status" = EXCLUDED."status",
          "category" = EXCLUDED."category",
          "tags" = EXCLUDED."tags",
          "taskTypeColor" = EXCLUDED."taskTypeColor",
          "environmentShape" = EXCLUDED."environmentShape",
          "physicalEffort" = EXCLUDED."physicalEffort",
          "mentalEffort" = EXCLUDED."mentalEffort",
          "skills" = EXCLUDED."skills",
          "prefecture" = EXCLUDED."prefecture",
          "city" = EXCLUDED."city",
          "address" = EXCLUDED."address",
          "googleMapsUrl" = EXCLUDED."googleMapsUrl",
          "startAt" = EXCLUDED."startAt",
          "endAt" = EXCLUDED."endAt",
          "arrivalTime" = EXCLUDED."arrivalTime",
          "durationMinutes" = EXCLUDED."durationMinutes",
          "volunteersNeeded" = EXCLUDED."volunteersNeeded",
          "maxApplicants" = EXCLUDED."maxApplicants",
          "allowWaitlist" = EXCLUDED."allowWaitlist",
          "taskFlow" = EXCLUDED."taskFlow",
          "instructions" = EXCLUDED."instructions",
          "toolsProvided" = EXCLUDED."toolsProvided",
          "thingsToBring" = EXCLUDED."thingsToBring",
          "arrivalGuidance" = EXCLUDED."arrivalGuidance",
          "firstLandmarkDescription" = EXCLUDED."firstLandmarkDescription",
          "firstLandmarkImageUrl" = EXCLUDED."firstLandmarkImageUrl",
          "firstContactName" = EXCLUDED."firstContactName",
          "firstContactRole" = EXCLUDED."firstContactRole",
          "firstContactImageUrl" = EXCLUDED."firstContactImageUrl",
          "coverImageUrl" = EXCLUDED."coverImageUrl",
          "workspaceImageUrls" = EXCLUDED."workspaceImageUrls",
          "workspace3dEmbedUrl" = EXCLUDED."workspace3dEmbedUrl",
          "preApplicationQuestions" = EXCLUDED."preApplicationQuestions",
          "requesterId" = EXCLUDED."requesterId",
          "organizationId" = EXCLUDED."organizationId",
          "publishedAt" = EXCLUDED."publishedAt",
          "completedAt" = EXCLUDED."completedAt",
          "updatedAt" = NOW()
    `,
    [
      opportunity.id,
      opportunity.title,
      opportunity.shortDescription,
      opportunity.description,
      opportunity.status,
      opportunity.category,
      opportunity.tags,
      opportunity.taskTypeColor,
      opportunity.environmentShape,
      opportunity.physicalEffort,
      opportunity.mentalEffort,
      opportunity.skills,
      opportunity.prefecture,
      opportunity.city,
      opportunity.address,
      opportunity.googleMapsUrl,
      opportunity.startAt,
      opportunity.endAt,
      opportunity.arrivalTime,
      opportunity.durationMinutes,
      opportunity.volunteersNeeded,
      opportunity.maxApplicants,
      opportunity.allowWaitlist,
      JSON.stringify(opportunity.taskFlow),
      opportunity.instructions,
      opportunity.toolsProvided,
      opportunity.thingsToBring,
      opportunity.arrivalGuidance,
      opportunity.firstLandmarkDescription,
      opportunity.firstLandmarkImageUrl,
      opportunity.firstContactName,
      opportunity.firstContactRole,
      opportunity.firstContactImageUrl,
      opportunity.coverImageUrl,
      opportunity.workspaceImageUrls,
      opportunity.workspace3dEmbedUrl,
      JSON.stringify(opportunity.preApplicationQuestions),
      opportunity.requesterId,
      opportunity.organizationId,
      opportunity.publishedAt,
      opportunity.completedAt,
    ],
  );
}

async function upsertApplication(client, application) {
  await client.query(
    `
      INSERT INTO "Application" (
        "id", "opportunityId", "volunteerId", "status", "selectedTaskItems",
        "confirmedTimeCommitment", "skillTags", "experienceNote", "message",
        "waitlistPosition", "participantGroup", "participantRole", "accessLevel",
        "attendanceStatus", "organizerNote", "matchScore", "aiRecommended", "reviewedAt", "createdAt",
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4::"ApplicationStatus", $5::jsonb,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18, NOW(),
        NOW()
      )
      ON CONFLICT ("opportunityId", "volunteerId") DO UPDATE
      SET "status" = EXCLUDED."status",
          "selectedTaskItems" = EXCLUDED."selectedTaskItems",
          "confirmedTimeCommitment" = EXCLUDED."confirmedTimeCommitment",
          "skillTags" = EXCLUDED."skillTags",
          "experienceNote" = EXCLUDED."experienceNote",
          "message" = EXCLUDED."message",
          "waitlistPosition" = EXCLUDED."waitlistPosition",
          "participantGroup" = EXCLUDED."participantGroup",
          "participantRole" = EXCLUDED."participantRole",
          "accessLevel" = EXCLUDED."accessLevel",
          "attendanceStatus" = EXCLUDED."attendanceStatus",
          "organizerNote" = EXCLUDED."organizerNote",
          "matchScore" = EXCLUDED."matchScore",
          "aiRecommended" = EXCLUDED."aiRecommended",
          "reviewedAt" = EXCLUDED."reviewedAt",
          "updatedAt" = NOW()
    `,
    [
      application.id,
      application.opportunityId,
      application.volunteerId,
      application.status,
      JSON.stringify(application.selectedTaskItems),
      application.confirmedTimeCommitment,
      application.skillTags,
      application.experienceNote,
      application.message,
      application.waitlistPosition,
      application.participantGroup,
      application.participantRole,
      application.accessLevel,
      application.attendanceStatus,
      application.organizerNote,
      application.matchScore,
      application.aiRecommended,
      application.reviewedAt,
    ],
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    const passwordHash = await hashPassword(password);

    const primaryRows = await client.query(`
      SELECT u."id", u."email", COALESCE(u."name", 'Demo Organizer') AS "name"
      FROM "User" u
      WHERE u."role" IN ('REQUESTER'::"UserRole", 'BOTH'::"UserRole", 'ADMIN'::"UserRole")
        AND u."id" NOT LIKE 'mock-user-%'
        AND u."email" NOT LIKE '%.example.test'
      ORDER BY u."updatedAt" DESC
      LIMIT 1
    `);

    let primaryOrganizer = primaryRows.rows[0];
    if (!primaryOrganizer) {
      primaryOrganizer = {
        id: "mock-user-primary-organizer",
        email: "demo.organizer@example.test",
        name: "Demo Organizer",
      };
      await upsertUser(client, {
        ...primaryOrganizer,
        passwordHash,
        role: "REQUESTER",
        locale: "en",
      });
    }

    const demoUsers = [
      {
        id: "mock-user-employer-kyoto",
        email: "employer.kyoto@example.test",
        name: "Kyoto Green Commons",
        role: "REQUESTER",
      },
      {
        id: "mock-user-employer-campus",
        email: "employer.campus@example.test",
        name: "Kamo Campus Circle",
        role: "REQUESTER",
      },
      {
        id: "mock-user-admin",
        email: "admin@example.test",
        name: "Platform Admin",
        role: "ADMIN",
      },
      {
        id: "mock-user-volunteer-anna",
        email: "anna.volunteer@example.test",
        name: "Anna Tanaka",
        role: "VOLUNTEER",
      },
      {
        id: "mock-user-volunteer-haruto",
        email: "haruto.volunteer@example.test",
        name: "Haruto Sato",
        role: "VOLUNTEER",
      },
      {
        id: "mock-user-volunteer-mei",
        email: "mei.volunteer@example.test",
        name: "Mei Chen",
        role: "VOLUNTEER",
      },
      {
        id: "mock-user-volunteer-luca",
        email: "luca.volunteer@example.test",
        name: "Luca Rossi",
        role: "VOLUNTEER",
      },
    ];

    const demoUserIds = new Map();
    for (const user of demoUsers) {
      const userId = await upsertUser(client, {
        ...user,
        passwordHash,
        locale: user.role === "VOLUNTEER" ? "en" : "ja",
      });
      demoUserIds.set(user.id, userId);
      demoUserIds.set(user.email, userId);
    }

    const organizations = [
      {
        id: "mock-org-primary",
        userId: primaryOrganizer.id,
        name: "Kyoto Neighborhood Garden Lab",
        nameKana: "キョウトネイバーフッドガーデンラボ",
        nameEn: "Kyoto Neighborhood Garden Lab",
        contactName: primaryOrganizer.name,
        type: "NPO",
        representativeName: "Mika Aoyama",
        purpose: "Improve small public green spaces through beginner-friendly volunteer activities.",
        description: "A Kyoto-based civic group running garden care, river cleanups, and seasonal community events.",
        activityAreas: ["Environment", "Community", "Education"],
        activityRegions: ["Kyoto City", "Sakyo Ward", "Online prep"],
        environmentStyle: "mixed",
        prefecture: "Kyoto",
        city: "Sakyo Ward",
        address: "Yoshida Honmachi, Sakyo-ku, Kyoto",
        publicEmail: "hello@garden-lab.example",
        publicPhone: "075-000-1200",
        contactFormUrl: "https://garden-lab.example/contact",
        website: "https://garden-lab.example",
        snsLinks: ["https://instagram.com/garden-lab-example"],
        founded: "2021-04",
        recruitmentStatus: "recruiting",
        hasWaterDispenser: true,
        hasRestRoom: true,
        hasAirConditioning: true,
        activitySpaceSize: "Outdoor garden plus 20-person meeting room",
        profileImageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735",
        workspaceImageUrls: [
          "https://images.unsplash.com/photo-1416879595882-3373a0480b5b",
          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6",
        ],
        certificationStatus: "under_review",
        certificationSource: null,
        certifiedAt: null,
        certificationSubmittedAt: daysFromNow(-1, 14),
        certificationReviewedAt: null,
        certificationReviewNote: null,
        managerPhone: "090-1111-2222",
        managerLegalName: "Mika Aoyama",
        identityDocumentNote: "Driver license checked in mock data.",
        managerAddress: "Sakyo-ku, Kyoto",
        isLocationPublic: true,
        contactPersonName: "Rina Mori",
        contactPersonRole: "Volunteer coordinator",
        contactPersonPhone: "090-3333-4444",
        contactPersonEmail: "rina@garden-lab.example",
        antiSocialForcesConfirmed: true,
        termsAccepted: true,
        legalEntityType: "npo",
        corporateNumber: "1234567890123",
        legalName: "Specified Nonprofit Corporation Kyoto Neighborhood Garden Lab",
        legalAddress: "Yoshida Honmachi, Sakyo-ku, Kyoto",
        registrationDocumentUrl: "https://example.com/mock-registration.pdf",
        bylawsUrl: "https://example.com/mock-bylaws.pdf",
      },
      {
        id: "mock-org-kyoto-green",
        userId: demoUserIds.get("mock-user-employer-kyoto"),
        name: "Kyoto Green Commons",
        nameKana: "キョウトグリーンコモンズ",
        nameEn: "Kyoto Green Commons",
        contactName: "Kyoto Green Commons",
        type: "GENERAL_ASSOCIATION",
        representativeName: "Daichi Kuroda",
        purpose: "Bring residents into hands-on environmental action.",
        description: "Certified organizer for park care, composting workshops, and neighborhood greening.",
        activityAreas: ["Environment", "Disaster readiness"],
        activityRegions: ["Shimogyo Ward", "Kyoto City"],
        environmentStyle: "outdoor",
        prefecture: "Kyoto",
        city: "Shimogyo Ward",
        address: "Kawaramachi-dori, Shimogyo-ku, Kyoto",
        publicEmail: "contact@green-commons.example",
        publicPhone: "075-000-2200",
        contactFormUrl: "https://green-commons.example/contact",
        website: "https://green-commons.example",
        snsLinks: ["https://facebook.com/green-commons-example"],
        founded: "2018-09",
        recruitmentStatus: "recruiting",
        hasWaterDispenser: true,
        hasRestRoom: true,
        hasAirConditioning: false,
        activitySpaceSize: "Park activity base and supply tent",
        profileImageUrl: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae"],
        certificationStatus: "certified",
        certificationSource: "Mock admin review",
        certifiedAt: daysFromNow(-14, 10),
        certificationSubmittedAt: daysFromNow(-20, 10),
        certificationReviewedAt: daysFromNow(-14, 10),
        certificationReviewNote: "Mock verified organization.",
        managerPhone: "090-5555-6600",
        managerLegalName: "Daichi Kuroda",
        identityDocumentNote: "Corporate documents verified.",
        managerAddress: "Shimogyo-ku, Kyoto",
        isLocationPublic: true,
        contactPersonName: "Yui Nishida",
        contactPersonRole: "Operations",
        contactPersonPhone: "090-7777-8800",
        contactPersonEmail: "ops@green-commons.example",
        antiSocialForcesConfirmed: true,
        termsAccepted: true,
        legalEntityType: "general_association",
        corporateNumber: "9876543210123",
        legalName: "General Incorporated Association Kyoto Green Commons",
        legalAddress: "Kawaramachi-dori, Shimogyo-ku, Kyoto",
        registrationDocumentUrl: "https://example.com/mock-green-registration.pdf",
        bylawsUrl: "https://example.com/mock-green-bylaws.pdf",
      },
      {
        id: "mock-org-campus",
        userId: demoUserIds.get("mock-user-employer-campus"),
        name: "Kamo Campus Circle",
        nameKana: "カモキャンパスサークル",
        nameEn: "Kamo Campus Circle",
        contactName: "Kamo Campus Circle",
        type: "VOLUNTARY_GROUP",
        representativeName: "Sora Yamamoto",
        purpose: "Support student-led social action around the Kamo River.",
        description: "A voluntary student group coordinating light-touch local events.",
        activityAreas: ["Education", "International exchange", "Community"],
        activityRegions: ["Kamigyo Ward", "Online"],
        environmentStyle: "mixed",
        prefecture: "Kyoto",
        city: "Kamigyo Ward",
        address: "Demachiyanagi area, Kyoto",
        publicEmail: "hello@kamo-campus.example",
        publicPhone: null,
        contactFormUrl: "https://kamo-campus.example/contact",
        website: "https://kamo-campus.example",
        snsLinks: ["https://x.com/kamo-campus-example"],
        founded: "2024-05",
        recruitmentStatus: "recruiting",
        hasWaterDispenser: false,
        hasRestRoom: true,
        hasAirConditioning: true,
        activitySpaceSize: "University classroom for 30 people",
        profileImageUrl: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1519389950473-47ba0277781c"],
        certificationStatus: "changes_requested",
        certificationSource: null,
        certifiedAt: null,
        certificationSubmittedAt: daysFromNow(-5, 12),
        certificationReviewedAt: daysFromNow(-2, 16),
        certificationReviewNote: "Please add a responsible adult contact for events involving children.",
        managerPhone: "090-9999-0000",
        managerLegalName: "Sora Yamamoto",
        identityDocumentNote: "Student ID note provided.",
        managerAddress: "Kamigyo-ku, Kyoto",
        isLocationPublic: false,
        contactPersonName: "Emma Ito",
        contactPersonRole: "Event lead",
        contactPersonPhone: "090-2222-3333",
        contactPersonEmail: "events@kamo-campus.example",
        antiSocialForcesConfirmed: true,
        termsAccepted: true,
        legalEntityType: null,
        corporateNumber: null,
        legalName: null,
        legalAddress: null,
        registrationDocumentUrl: null,
        bylawsUrl: "https://example.com/mock-campus-rules.pdf",
      },
    ];

    const organizationIds = new Map();
    for (const organization of organizations) {
      organizationIds.set(
        organization.id,
        await upsertOrganization(client, organization),
      );
    }

    await client.query(
      `
        UPDATE "Organization"
        SET "displayName" = COALESCE("displayName", "name"),
            "email" = COALESCE("email", "publicEmail"),
            "phone" = COALESCE("phone", "publicPhone"),
            "googleMapsUrl" = COALESCE(
              "googleMapsUrl",
              CASE
                WHEN "address" IS NULL THEN NULL
                ELSE 'https://maps.google.com/?q=' || replace("address", ' ', '+')
              END
            )
        WHERE "id" = ANY($1)
      `,
      [[...organizationIds.values()]],
    );

    const volunteers = [
      {
        id: "mock-profile-anna",
        userId: demoUserIds.get("mock-user-volunteer-anna"),
        bio: "Graduate student who likes community gardens and bilingual event support.",
        displayName: "Anna Tanaka",
        phone: "090-1000-0001",
        skills: ["English", "Japanese", "Guiding", "Gardening"],
        interests: ["Environment", "International exchange"],
        languages: ["English", "Japanese"],
        availability: "Weekends and Friday afternoons",
        availabilitySlots: ["Friday afternoon", "Saturday morning", "Sunday afternoon"],
        preferredTaskTypes: ["Outdoor care", "Reception"],
        preferredEnvironmentStyle: "either",
        prefecture: "Kyoto",
        city: "Sakyo Ward",
      },
      {
        id: "mock-profile-haruto",
        userId: demoUserIds.get("mock-user-volunteer-haruto"),
        bio: "Local resident comfortable with physical work and tool setup.",
        displayName: "Haruto Sato",
        phone: "090-1000-0002",
        skills: ["Lifting", "Setup", "Bike repair"],
        interests: ["Community", "Disaster readiness"],
        languages: ["Japanese"],
        availability: "Saturday mornings",
        availabilitySlots: ["Saturday morning"],
        preferredTaskTypes: ["Outdoor care", "Logistics"],
        preferredEnvironmentStyle: "structured",
        prefecture: "Kyoto",
        city: "Shimogyo Ward",
      },
      {
        id: "mock-profile-mei",
        userId: demoUserIds.get("mock-user-volunteer-mei"),
        bio: "Designer interested in child-friendly workshops and signage.",
        displayName: "Mei Chen",
        phone: "090-1000-0003",
        skills: ["Design", "Workshop support", "Chinese"],
        interests: ["Children", "Education", "Art"],
        languages: ["Chinese", "English", "Japanese"],
        availability: "Weekdays after 15:00",
        availabilitySlots: ["Weekday evening"],
        preferredTaskTypes: ["Creative", "Indoor"],
        preferredEnvironmentStyle: "relaxed",
        prefecture: "Kyoto",
        city: "Nakagyo Ward",
      },
      {
        id: "mock-profile-luca",
        userId: demoUserIds.get("mock-user-volunteer-luca"),
        bio: "Exchange student looking for low-pressure Japanese conversation opportunities.",
        displayName: "Luca Rossi",
        phone: "090-1000-0004",
        skills: ["Photography", "English", "Italian"],
        interests: ["International exchange", "Food", "Events"],
        languages: ["Italian", "English", "Japanese"],
        availability: "Sunday afternoons",
        availabilitySlots: ["Sunday afternoon"],
        preferredTaskTypes: ["Photography", "Reception"],
        preferredEnvironmentStyle: "relaxed",
        prefecture: "Kyoto",
        city: "Fushimi Ward",
      },
    ];

    for (const profile of volunteers) {
      await upsertVolunteerProfile(client, profile);
      await client.query(
        `
          UPDATE "VolunteerProfile" profile
          SET "displayName" = $2,
              "email" = "User"."email",
              "phone" = $3,
              "availabilitySlots" = $4
          FROM "User"
          WHERE profile."userId" = "User"."id"
            AND profile."userId" = $1
        `,
        [profile.userId, profile.displayName, profile.phone, profile.availabilitySlots],
      );
    }

    const primaryOrgId = organizationIds.get("mock-org-primary");
    const opportunities = [
      {
        id: "mock-opp-garden-open",
        requesterId: primaryOrganizer.id,
        organizationId: primaryOrgId,
        title: "Saturday community garden refresh",
        shortDescription: "Beginner-friendly garden care near Yoshida.",
        description:
          "Help refresh a small neighborhood garden before the summer planting season. Tasks include weeding, carrying light soil bags, watering, and greeting neighbors who stop by.",
        status: "OPEN",
        category: "Environment",
        tags: ["beginner friendly", "outdoor", "Kyoto"],
        taskTypeColor: "green",
        environmentShape: "relaxed",
        physicalEffort: "medium",
        mentalEffort: "low",
        skills: ["Gardening", "Guiding"],
        prefecture: "Kyoto",
        city: "Sakyo Ward",
        address: "Yoshida Honmachi community garden",
        googleMapsUrl: "https://maps.google.com/?q=Yoshida+Honmachi+Kyoto",
        startAt: daysFromNow(8, 9),
        endAt: daysFromNow(8, 12),
        arrivalTime: daysFromNow(8, 8, 45),
        durationMinutes: 180,
        volunteersNeeded: 6,
        maxApplicants: 10,
        allowWaitlist: true,
        taskFlow: [
          {
            id: "garden-care",
            name: "Garden care crew",
            startTime: "09:00",
            durationMinutes: 120,
            peopleNeeded: 4,
            spotsRemaining: 2,
            shortDescription: "Weeding, watering, and light soil carrying.",
            fullDescription: "Work alongside the organizer. Gloves and tools are provided.",
            typeColor: "green",
            environmentShape: "relaxed",
            physicalEffort: "medium",
            mentalEffort: "low",
            toolsProvided: ["Gloves", "Trowels", "Watering cans"],
            thingsToBring: ["Hat", "Water bottle", "Comfortable shoes"],
            steps: ["Meet at gate", "Tool briefing", "Garden work", "Cleanup"],
            customFields: [],
          },
        ],
        instructions: "Please wear clothes that can get a little dirty.",
        toolsProvided: ["Gloves", "Trowels", "Watering cans"],
        thingsToBring: ["Hat", "Water bottle", "Comfortable shoes"],
        arrivalGuidance: "Look for the green tent at the garden entrance. Rina will check you in.",
        firstLandmarkDescription: "Green tent beside the north gate",
        firstLandmarkImageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6",
        firstContactName: "Rina Mori",
        firstContactRole: "Volunteer coordinator",
        firstContactImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        coverImageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1501004318641-b39e6451bec6"],
        workspace3dEmbedUrl: null,
        preApplicationQuestions: [{ question: "Do you have any pollen or outdoor work concerns?" }],
        publishedAt: daysFromNow(-2, 9),
        completedAt: null,
      },
      {
        id: "mock-opp-river-paused",
        requesterId: primaryOrganizer.id,
        organizationId: primaryOrgId,
        title: "Kamo River litter mapping walk",
        shortDescription: "Map cleanup spots before a larger river event.",
        description:
          "A small scouting walk to document litter hotspots and safe gathering points. The task is paused while we confirm weather conditions.",
        status: "PAUSED",
        category: "Environment",
        tags: ["walking", "mapping", "river"],
        taskTypeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "medium",
        skills: ["Photography", "Mapping"],
        prefecture: "Kyoto",
        city: "Kamigyo Ward",
        address: "Demachiyanagi station north exit",
        googleMapsUrl: "https://maps.google.com/?q=Demachiyanagi+Kyoto",
        startAt: daysFromNow(11, 15),
        endAt: daysFromNow(11, 17),
        arrivalTime: daysFromNow(11, 14, 50),
        durationMinutes: 120,
        volunteersNeeded: 4,
        maxApplicants: 6,
        allowWaitlist: true,
        taskFlow: [
          {
            id: "mapping-walk",
            name: "Mapping walk",
            startTime: "15:00",
            durationMinutes: 90,
            peopleNeeded: 4,
            spotsRemaining: 3,
            shortDescription: "Walk in pairs and mark cleanup spots.",
            fullDescription: "Use a simple shared map and photo checklist.",
            typeColor: "blue",
            environmentShape: "structured",
            physicalEffort: "low",
            mentalEffort: "medium",
            toolsProvided: ["Printed map", "Checklist"],
            thingsToBring: ["Phone", "Comfortable shoes"],
            steps: ["Safety briefing", "Walk route", "Photo notes", "Debrief"],
            customFields: [],
          },
        ],
        instructions: "Paused until weather check is complete.",
        toolsProvided: ["Printed map", "Checklist"],
        thingsToBring: ["Phone", "Comfortable shoes"],
        arrivalGuidance: "Meet by the station map board.",
        firstLandmarkDescription: "Large station map board",
        firstLandmarkImageUrl: null,
        firstContactName: "Mika Aoyama",
        firstContactRole: "Organizer",
        firstContactImageUrl: null,
        coverImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"],
        workspace3dEmbedUrl: null,
        preApplicationQuestions: [{ question: "Can you walk for about 90 minutes?" }],
        publishedAt: daysFromNow(-1, 9),
        completedAt: null,
      },
      {
        id: "mock-opp-workshop-draft",
        requesterId: primaryOrganizer.id,
        organizationId: primaryOrgId,
        title: "Draft: bilingual seed workshop",
        shortDescription: "Prepare a small indoor workshop for families.",
        description:
          "Draft opportunity for a seed planting and bilingual explanation table. Use this to test editing and publish flows.",
        status: "DRAFT",
        category: "Education",
        tags: ["draft", "family", "indoor"],
        taskTypeColor: "orange",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "medium",
        skills: ["English", "Children support", "Workshop"],
        prefecture: "Kyoto",
        city: "Sakyo Ward",
        address: "Yoshida community room",
        googleMapsUrl: "",
        startAt: daysFromNow(18, 13),
        endAt: daysFromNow(18, 16),
        arrivalTime: daysFromNow(18, 12, 30),
        durationMinutes: 180,
        volunteersNeeded: 5,
        maxApplicants: 8,
        allowWaitlist: true,
        taskFlow: [
          {
            id: "workshop-support",
            name: "Workshop support",
            startTime: "13:00",
            durationMinutes: 150,
            peopleNeeded: 5,
            spotsRemaining: 5,
            shortDescription: "Set up tables, welcome families, and support planting.",
            fullDescription: "Good for bilingual volunteers and people comfortable around children.",
            typeColor: "orange",
            environmentShape: "relaxed",
            physicalEffort: "low",
            mentalEffort: "medium",
            toolsProvided: ["Seeds", "Soil cups", "Name tags"],
            thingsToBring: ["Apron if you have one"],
            steps: ["Room setup", "Reception", "Planting support", "Cleanup"],
            customFields: [],
          },
        ],
        instructions: "Draft copy still needs final room confirmation.",
        toolsProvided: ["Seeds", "Soil cups", "Name tags"],
        thingsToBring: ["Apron if you have one"],
        arrivalGuidance: "Enter from the side door and go to room 2F-A.",
        firstLandmarkDescription: "Side door with green poster",
        firstLandmarkImageUrl: null,
        firstContactName: "Rina Mori",
        firstContactRole: "Workshop lead",
        firstContactImageUrl: null,
        coverImageUrl: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4"],
        workspace3dEmbedUrl: null,
        preApplicationQuestions: [{ question: "Are you comfortable supporting children?" }],
        publishedAt: null,
        completedAt: null,
      },
      {
        id: "mock-opp-completed",
        requesterId: primaryOrganizer.id,
        organizationId: primaryOrgId,
        title: "Completed: compost sorting day",
        shortDescription: "Past event used to test completed status.",
        description: "A completed compost sorting event with accepted volunteers and messages.",
        status: "COMPLETED",
        category: "Environment",
        tags: ["completed", "compost"],
        taskTypeColor: "green",
        environmentShape: "structured",
        physicalEffort: "medium",
        mentalEffort: "low",
        skills: ["Sorting", "Setup"],
        prefecture: "Kyoto",
        city: "Sakyo Ward",
        address: "Yoshida community garden",
        googleMapsUrl: "",
        startAt: daysFromNow(-6, 10),
        endAt: daysFromNow(-6, 12),
        arrivalTime: daysFromNow(-6, 9, 45),
        durationMinutes: 120,
        volunteersNeeded: 3,
        maxApplicants: 4,
        allowWaitlist: false,
        taskFlow: [
          {
            id: "compost-sort",
            name: "Compost sorting",
            startTime: "10:00",
            durationMinutes: 90,
            peopleNeeded: 3,
            spotsRemaining: 0,
            shortDescription: "Sort leaves and prepare compost bags.",
            fullDescription: "Completed task for dashboard history.",
            typeColor: "green",
            environmentShape: "structured",
            physicalEffort: "medium",
            mentalEffort: "low",
            toolsProvided: ["Gloves", "Bags"],
            thingsToBring: ["Water"],
            steps: ["Briefing", "Sorting", "Bagging"],
            customFields: [],
          },
        ],
        instructions: "Completed event.",
        toolsProvided: ["Gloves", "Bags"],
        thingsToBring: ["Water"],
        arrivalGuidance: "Completed event.",
        firstLandmarkDescription: "Garden gate",
        firstLandmarkImageUrl: null,
        firstContactName: "Mika Aoyama",
        firstContactRole: "Organizer",
        firstContactImageUrl: null,
        coverImageUrl: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e",
        workspaceImageUrls: ["https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e"],
        workspace3dEmbedUrl: null,
        preApplicationQuestions: [],
        publishedAt: daysFromNow(-20, 9),
        completedAt: daysFromNow(-6, 13),
      },
    ];

    for (const opportunity of opportunities) {
      await upsertOpportunity(client, opportunity);
    }

    const opportunitySupplements = new Map([
      [
        "mock-opp-garden-open",
        {
          latitude: "35.0258700",
          longitude: "135.7816500",
          customFields: {
            organizerBadge: "trusted",
            weatherPlan: "Light rain moves the briefing indoors.",
          },
          withdrawalCutoffHours: 24,
        },
      ],
      [
        "mock-opp-river-paused",
        {
          latitude: "35.0304700",
          longitude: "135.7727500",
          customFields: {
            organizerBadge: "trusted",
            pauseReason: "Weather confirmation pending.",
          },
          withdrawalCutoffHours: 12,
        },
      ],
      [
        "mock-opp-workshop-draft",
        {
          latitude: "35.0262200",
          longitude: "135.7809400",
          customFields: {
            organizerBadge: "trusted",
            draftChecklist: ["Room confirmation", "Family safety note"],
          },
          withdrawalCutoffHours: 24,
        },
      ],
      [
        "mock-opp-completed",
        {
          latitude: "35.0258700",
          longitude: "135.7816500",
          customFields: {
            organizerBadge: "trusted",
            postEventSummary: "Compost bags prepared and stored.",
          },
          withdrawalCutoffHours: 24,
        },
      ],
    ]);

    for (const [opportunityId, supplement] of opportunitySupplements) {
      await client.query(
        `
          UPDATE "Opportunity"
          SET "latitude" = $2,
              "longitude" = $3,
              "customFields" = $4::jsonb,
              "withdrawalCutoffHours" = $5
          WHERE "id" = $1
        `,
        [
          opportunityId,
          supplement.latitude,
          supplement.longitude,
          JSON.stringify(supplement.customFields),
          supplement.withdrawalCutoffHours,
        ],
      );
    }

    const applications = [
      {
        id: "mock-app-garden-anna",
        opportunityId: "mock-opp-garden-open",
        volunteerId: demoUserIds.get("mock-user-volunteer-anna"),
        status: "ACCEPTED",
        selectedTaskItems: [opportunities[0].taskFlow[0]],
        confirmedTimeCommitment: true,
        skillTags: ["English", "Gardening"],
        experienceNote: "I helped with a school garden last year.",
        message: "Happy to help with greeting international volunteers too.",
        waitlistPosition: null,
        participantGroup: "Morning crew",
        participantRole: "LEADER",
        accessLevel: "STANDARD",
        attendanceStatus: "UNKNOWN",
        organizerNote: "Good bilingual lead for first-time volunteers.",
        matchScore: 0.94,
        aiRecommended: true,
        reviewedAt: daysFromNow(-1, 15),
      },
      {
        id: "mock-app-garden-haruto",
        opportunityId: "mock-opp-garden-open",
        volunteerId: demoUserIds.get("mock-user-volunteer-haruto"),
        status: "PENDING",
        selectedTaskItems: [opportunities[0].taskFlow[0]],
        confirmedTimeCommitment: true,
        skillTags: ["Setup", "Outdoor work"],
        experienceNote: "I can carry soil bags and help with setup.",
        message: "I live nearby and can arrive early.",
        waitlistPosition: null,
        participantGroup: null,
        participantRole: "MEMBER",
        accessLevel: "STANDARD",
        attendanceStatus: "UNKNOWN",
        organizerNote: null,
        matchScore: 0.82,
        aiRecommended: true,
        reviewedAt: null,
      },
      {
        id: "mock-app-garden-mei",
        opportunityId: "mock-opp-garden-open",
        volunteerId: demoUserIds.get("mock-user-volunteer-mei"),
        status: "WAITLISTED",
        selectedTaskItems: [opportunities[0].taskFlow[0]],
        confirmedTimeCommitment: true,
        skillTags: ["Design", "Children support"],
        experienceNote: "I can help make simple signs if needed.",
        message: "Please put me on waitlist if full.",
        waitlistPosition: 1,
        participantGroup: "Waitlist",
        participantRole: "MEMBER",
        accessLevel: "ONSITE_ONLY",
        attendanceStatus: "UNKNOWN",
        organizerNote: "Could be useful for workshop draft.",
        matchScore: 0.71,
        aiRecommended: false,
        reviewedAt: daysFromNow(-1, 16),
      },
      {
        id: "mock-app-river-luca",
        opportunityId: "mock-opp-river-paused",
        volunteerId: demoUserIds.get("mock-user-volunteer-luca"),
        status: "PENDING",
        selectedTaskItems: [opportunities[1].taskFlow[0]],
        confirmedTimeCommitment: true,
        skillTags: ["Photography", "English"],
        experienceNote: "I can take route photos for the map.",
        message: "Sunday also works if weather changes.",
        waitlistPosition: null,
        participantGroup: null,
        participantRole: "MEMBER",
        accessLevel: "STANDARD",
        attendanceStatus: "UNKNOWN",
        organizerNote: null,
        matchScore: 0.79,
        aiRecommended: true,
        reviewedAt: null,
      },
      {
        id: "mock-app-completed-haruto",
        opportunityId: "mock-opp-completed",
        volunteerId: demoUserIds.get("mock-user-volunteer-haruto"),
        status: "ACCEPTED",
        selectedTaskItems: [opportunities[3].taskFlow[0]],
        confirmedTimeCommitment: true,
        skillTags: ["Sorting", "Setup"],
        experienceNote: "Past accepted participant.",
        message: "Thanks for organizing.",
        waitlistPosition: null,
        participantGroup: "Compost crew",
        participantRole: "MEMBER",
        accessLevel: "STANDARD",
        attendanceStatus: "ATTENDED",
        organizerNote: "Attended and completed.",
        matchScore: 0.88,
        aiRecommended: true,
        reviewedAt: daysFromNow(-7, 12),
      },
    ];

    for (const application of applications) {
      await upsertApplication(client, application);
    }

    const applicationSupplements = new Map([
      [
        "mock-app-garden-anna",
        {
          questionAnswers: {
            "Do you have any pollen or outdoor work concerns?": "No major concerns.",
          },
          reviewedByEmployerId: primaryOrgId,
          rejectionReason: null,
          checkedInAt: null,
          checkinMethod: null,
          withdrawalReason: null,
          completedAt: null,
        },
      ],
      [
        "mock-app-garden-haruto",
        {
          questionAnswers: {
            "Do you have any pollen or outdoor work concerns?": "I have my own mask if needed.",
          },
          reviewedByEmployerId: null,
          rejectionReason: null,
          checkedInAt: null,
          checkinMethod: null,
          withdrawalReason: null,
          completedAt: null,
        },
      ],
      [
        "mock-app-garden-mei",
        {
          questionAnswers: {
            "Do you have any pollen or outdoor work concerns?": "Prefer lighter tasks if possible.",
          },
          reviewedByEmployerId: primaryOrgId,
          rejectionReason: null,
          checkedInAt: null,
          checkinMethod: null,
          withdrawalReason: null,
          completedAt: null,
        },
      ],
      [
        "mock-app-river-luca",
        {
          questionAnswers: {
            "Can you walk for about 90 minutes?": "Yes, no problem.",
          },
          reviewedByEmployerId: null,
          rejectionReason: null,
          checkedInAt: null,
          checkinMethod: null,
          withdrawalReason: null,
          completedAt: null,
        },
      ],
      [
        "mock-app-completed-haruto",
        {
          questionAnswers: {},
          reviewedByEmployerId: primaryOrgId,
          rejectionReason: null,
          checkedInAt: daysFromNow(-6, 9, 52),
          checkinMethod: "manual",
          withdrawalReason: null,
          completedAt: daysFromNow(-6, 12, 5),
        },
      ],
    ]);

    for (const [applicationId, supplement] of applicationSupplements) {
      await client.query(
        `
          UPDATE "Application"
          SET "questionAnswers" = $2::jsonb,
              "reviewedByEmployerId" = $3,
              "rejectionReason" = $4,
              "checkedInAt" = $5,
              "checkinMethod" = $6,
              "withdrawalReason" = $7,
              "completedAt" = $8
          WHERE "id" = $1
        `,
        [
          applicationId,
          JSON.stringify(supplement.questionAnswers),
          supplement.reviewedByEmployerId,
          supplement.rejectionReason,
          supplement.checkedInAt,
          supplement.checkinMethod,
          supplement.withdrawalReason,
          supplement.completedAt,
        ],
      );
    }

    for (const application of applications.filter((item) => item.status === "ACCEPTED")) {
      await client.query(
        `
          INSERT INTO "Booking" ("id", "applicationId", "confirmedAt", "notes")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("applicationId") DO UPDATE
          SET "confirmedAt" = EXCLUDED."confirmedAt",
              "notes" = EXCLUDED."notes"
        `,
        [`mock-booking-${application.id}`, application.id, application.reviewedAt ?? new Date(), "Mock confirmed booking"],
      );
    }

    await client.query(
      `
        INSERT INTO "EventUpdate" ("id", "opportunityId", "organizerId", "type", "message", "highlightedDetail", "createdAt")
        VALUES
          ('mock-update-garden-weather', 'mock-opp-garden-open', $1, 'WEATHER', 'Please bring a hat. We will provide extra water on site.', 'Warm weather expected', NOW()),
          ('mock-update-completed-thanks', 'mock-opp-completed', $1, 'GENERAL', 'Thanks again for helping with compost sorting.', 'Event completed', NOW())
        ON CONFLICT ("id") DO UPDATE
        SET "message" = EXCLUDED."message",
            "highlightedDetail" = EXCLUDED."highlightedDetail"
      `,
      [primaryOrganizer.id],
    );

    await client.query(
      `
        INSERT INTO "EventMessage" ("id", "opportunityId", "applicationId", "senderId", "recipientId", "body", "createdAt")
        VALUES
          ('mock-message-anna-1', 'mock-opp-garden-open', 'mock-app-garden-anna', $2, $1, 'I can arrive 10 minutes early if useful.', NOW()),
          ('mock-message-anna-2', 'mock-opp-garden-open', 'mock-app-garden-anna', $1, $2, 'That would be great. Please meet Rina at the green tent.', NOW())
        ON CONFLICT ("id") DO UPDATE
        SET "body" = EXCLUDED."body"
      `,
      [primaryOrganizer.id, demoUserIds.get("mock-user-volunteer-anna")],
    );

    await client.query("COMMIT");

    console.log("Mock data seeded.");
    console.log(`Primary organizer user: ${primaryOrganizer.email}`);
    console.log("Demo accounts:");
    console.log("  employer.kyoto@example.test / Password123!");
    console.log("  employer.campus@example.test / Password123!");
    console.log("  admin@example.test / Password123!");
    console.log("  anna.volunteer@example.test / Password123!");
    console.log("  haruto.volunteer@example.test / Password123!");
    console.log("  mei.volunteer@example.test / Password123!");
    console.log("  luca.volunteer@example.test / Password123!");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
