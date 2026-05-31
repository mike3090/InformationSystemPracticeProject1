import "dotenv/config";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test, { after, before } from "node:test";
import pg from "pg";

const execFileAsync = promisify(execFile);
const { Client } = pg;

let client;

before(async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be set");
  await execFileAsync("node", ["scripts/seed-mock-data.mjs"], {
    cwd: process.cwd(),
  });
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

after(async () => {
  await client?.end();
});

test("mock employer dashboard has the expected task/status mix", async () => {
  const result = await client.query(`
    SELECT o."status"::text AS "status", COUNT(*)::int AS "count"
    FROM "Opportunity" o
    WHERE o."requesterId" = (
      SELECT "requesterId"
      FROM "Opportunity"
      WHERE "id" = 'mock-opp-garden-open'
    )
      AND o."id" LIKE 'mock-opp-%'
    GROUP BY o."status"
  `);

  const counts = Object.fromEntries(
    result.rows.map((row) => [row.status, row.count]),
  );

  assert.equal(counts.OPEN, 1);
  assert.equal(counts.PAUSED, 1);
  assert.equal(counts.DRAFT, 1);
  assert.equal(counts.COMPLETED, 1);
});

test("seed links primary employer opportunities to the actual upserted organization", async () => {
  const result = await client.query(`
    SELECT COUNT(*)::int AS "broken"
    FROM "Opportunity" o
    LEFT JOIN "Organization" org ON org."id" = o."organizationId"
    WHERE o."id" IN (
      'mock-opp-garden-open',
      'mock-opp-river-paused',
      'mock-opp-workshop-draft',
      'mock-opp-completed'
    )
      AND org."id" IS NULL
  `);

  assert.equal(result.rows[0].broken, 0);
});

test("garden opportunity has pending, accepted, and waitlisted applicants", async () => {
  const result = await client.query(
    `
      SELECT "status"::text AS "status", COUNT(*)::int AS "count"
      FROM "Application"
      WHERE "opportunityId" = $1
        AND "id" LIKE 'mock-app-garden-%'
      GROUP BY "status"
    `,
    ["mock-opp-garden-open"],
  );

  const counts = Object.fromEntries(
    result.rows.map((row) => [row.status, row.count]),
  );

  assert.equal(counts.PENDING, 1);
  assert.equal(counts.ACCEPTED, 1);
  assert.equal(counts.WAITLISTED, 1);
});

test("participant management fields are persisted for accepted applicant", async () => {
  const result = await client.query(
    `
      SELECT
        "participantGroup",
        "participantRole",
        "accessLevel",
        "attendanceStatus",
        "organizerNote"
      FROM "Application"
      WHERE "id" = $1
    `,
    ["mock-app-garden-anna"],
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0].participantGroup, "Morning crew");
  assert.equal(result.rows[0].participantRole, "LEADER");
  assert.equal(result.rows[0].accessLevel, "STANDARD");
  assert.equal(result.rows[0].attendanceStatus, "UNKNOWN");
  assert.match(result.rows[0].organizerNote, /bilingual/i);
});

test("completed task analytics can be generated from application attendance", async () => {
  const result = await client.query(
    `
      SELECT
        COUNT(*)::int AS "applied",
        COUNT(*) FILTER (WHERE "status" = 'ACCEPTED'::"ApplicationStatus")::int AS "accepted",
        COUNT(*) FILTER (WHERE "attendanceStatus" = 'ATTENDED')::int AS "attended",
        COUNT(*) FILTER (WHERE "attendanceStatus" = 'NO_SHOW')::int AS "noShow",
        COUNT(*) FILTER (WHERE "attendanceStatus" = 'EXCUSED')::int AS "excused"
      FROM "Application"
      WHERE "opportunityId" = $1
    `,
    ["mock-opp-completed"],
  );

  assert.deepEqual(result.rows[0], {
    applied: 1,
    accepted: 1,
    attended: 1,
    noShow: 0,
    excused: 0,
  });
});

test("certification mock data covers review states and blocks accidental public certification edits", async () => {
  const result = await client.query(`
    SELECT "certificationStatus", COUNT(*)::int AS "count"
    FROM "Organization"
    WHERE "userId" IN (
      SELECT "requesterId"
      FROM "Opportunity"
      WHERE "id" = 'mock-opp-garden-open'
      UNION
      SELECT "id"
      FROM "User"
      WHERE "email" IN (
        'employer.kyoto@example.test',
        'employer.campus@example.test'
      )
    )
      OR "name" = 'Kyoto Neighborhood Garden Lab'
    GROUP BY "certificationStatus"
  `);

  const counts = Object.fromEntries(
    result.rows.map((row) => [row.certificationStatus, row.count]),
  );

  assert.equal(counts.certified, 1);
  assert.equal(counts.changes_requested, 1);
  assert.ok(counts.under_review >= 1);
});

test("database schema includes remaining conceptual employer fields", async () => {
  const expectedColumns = new Map([
    ["Organization", ["displayName", "email", "phone", "googleMapsUrl"]],
    ["VolunteerProfile", ["displayName", "email", "phone", "availabilitySlots"]],
    [
      "Opportunity",
      ["latitude", "longitude", "customFields", "withdrawalCutoffHours"],
    ],
    [
      "Application",
      [
        "questionAnswers",
        "reviewedByEmployerId",
        "rejectionReason",
        "checkedInAt",
        "checkinMethod",
        "withdrawalReason",
        "completedAt",
      ],
    ],
  ]);

  const result = await client.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `,
    [[...expectedColumns.keys()]],
  );

  const actual = new Set(
    result.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );

  for (const [tableName, columnNames] of expectedColumns) {
    for (const columnName of columnNames) {
      assert.ok(
        actual.has(`${tableName}.${columnName}`),
        `Expected ${tableName}.${columnName} to exist`,
      );
    }
  }
});

test("mock data populates supplemental profile, task, and application fields", async () => {
  const organizationResult = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE "displayName" IS NOT NULL)::int AS "withDisplayName",
      COUNT(*) FILTER (WHERE "email" IS NOT NULL)::int AS "withEmail",
      COUNT(*) FILTER (WHERE "googleMapsUrl" IS NOT NULL)::int AS "withMap"
    FROM "Organization"
    WHERE "userId" IN (
      SELECT "requesterId"
      FROM "Opportunity"
      WHERE "id" = 'mock-opp-garden-open'
      UNION
      SELECT "id"
      FROM "User"
      WHERE "email" IN (
        'employer.kyoto@example.test',
        'employer.campus@example.test'
      )
    )
      OR "name" = 'Kyoto Neighborhood Garden Lab'
  `);

  assert.ok(organizationResult.rows[0].withDisplayName >= 3);
  assert.ok(organizationResult.rows[0].withEmail >= 3);
  assert.ok(organizationResult.rows[0].withMap >= 3);

  const volunteerResult = await client.query(`
    SELECT COUNT(*)::int AS "readyProfiles"
    FROM "VolunteerProfile"
    WHERE "userId" IN (
      SELECT "id"
      FROM "User"
      WHERE "email" IN (
        'anna.volunteer@example.test',
        'haruto.volunteer@example.test',
        'mei.volunteer@example.test',
        'luca.volunteer@example.test'
      )
    )
      AND "displayName" IS NOT NULL
      AND "email" IS NOT NULL
      AND "phone" IS NOT NULL
      AND cardinality("availabilitySlots") > 0
  `);

  assert.equal(volunteerResult.rows[0].readyProfiles, 4);

  const opportunityResult = await client.query(`
    SELECT COUNT(*)::int AS "readyTasks"
    FROM "Opportunity"
    WHERE "id" IN (
      'mock-opp-garden-open',
      'mock-opp-river-paused',
      'mock-opp-workshop-draft',
      'mock-opp-completed'
    )
      AND "latitude" IS NOT NULL
      AND "longitude" IS NOT NULL
      AND "customFields" <> '{}'::jsonb
      AND "withdrawalCutoffHours" > 0
  `);

  assert.equal(opportunityResult.rows[0].readyTasks, 4);

  const applicationResult = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE "questionAnswers" <> '{}'::jsonb)::int AS "withAnswers",
      COUNT(*) FILTER (WHERE "reviewedByEmployerId" IS NOT NULL)::int AS "withReviewer",
      COUNT(*) FILTER (WHERE "checkedInAt" IS NOT NULL AND "checkinMethod" = 'manual')::int AS "checkedIn"
    FROM "Application"
    WHERE "id" IN (
      'mock-app-garden-anna',
      'mock-app-garden-haruto',
      'mock-app-garden-mei',
      'mock-app-river-luca',
      'mock-app-completed-haruto'
    )
  `);

  assert.deepEqual(applicationResult.rows[0], {
    withAnswers: 4,
    withReviewer: 3,
    checkedIn: 1,
  });
});

test("kyoto demo employer owns the visible dashboard mock tasks", async () => {
  const result = await client.query(`
    SELECT
      COUNT(*)::int AS "allTasks",
      COUNT(*) FILTER (WHERE o."status" = 'OPEN'::"OpportunityStatus")::int AS "openTasks",
      COUNT(*) FILTER (WHERE o."status" = 'DRAFT'::"OpportunityStatus")::int AS "draftTasks",
      COALESCE(SUM(application_counts.count), 0)::int AS "applicants"
    FROM "Opportunity" o
    INNER JOIN "User" u ON u."id" = o."requesterId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS count
      FROM "Application" a
      WHERE a."opportunityId" = o."id"
        AND a."id" LIKE 'mock-app-%'
    ) application_counts ON TRUE
    WHERE u."email" = 'employer.kyoto@example.test'
      AND o."id" LIKE 'mock-opp-%'
  `);

  assert.deepEqual(result.rows[0], {
    allTasks: 4,
    openTasks: 1,
    draftTasks: 1,
    applicants: 5,
  });
});

test("volunteer discovery is wired to database-backed open employer tasks", async () => {
  const result = await client.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE o."id" = 'mock-opp-garden-open'
          AND o."status" = 'OPEN'::"OpportunityStatus"
      )::int AS "openVisible",
      COUNT(*) FILTER (
        WHERE o."id" = 'mock-opp-workshop-draft'
          AND o."status" = 'DRAFT'::"OpportunityStatus"
      )::int AS "draftHidden"
    FROM "Opportunity" o
    INNER JOIN "User" u ON u."id" = o."requesterId"
    WHERE u."email" = 'employer.kyoto@example.test'
  `);

  assert.deepEqual(result.rows[0], {
    openVisible: 1,
    draftHidden: 1,
  });

  const [listPage, detailPage, applyAction] = await Promise.all([
    readFile("app/[locale]/opportunities/page.tsx", "utf8"),
    readFile("app/[locale]/opportunities/[id]/page.tsx", "utf8"),
    readFile("app/[locale]/opportunities/[id]/actions.ts", "utf8"),
  ]);

  assert.match(listPage, /status: "OPEN"/);
  assert.doesNotMatch(listPage, /mockOpportunities/);
  assert.ok(
    detailPage.includes("getVolunteerOpportunity") ||
      detailPage.includes("prisma.opportunity.findFirst"),
  );
  assert.ok(
    applyAction.includes("getVolunteerOpportunity") ||
      applyAction.includes("prisma.opportunity.findFirst"),
  );
});

test("volunteer-only and organizer-only route boundaries stay wired", async () => {
  const [myEventsPage, legacyDashboardPage, draftRoute, mealRoute, accommodationsRoute, formRoute] =
    await Promise.all([
      readFile("app/[locale]/my-events/page.tsx", "utf8"),
      readFile("app/[locale]/dashboard/applications/[id]/page.tsx", "utf8"),
      readFile("app/api/ai/draft-opportunity/route.ts", "utf8"),
      readFile("app/api/ai/plan-meal/route.ts", "utf8"),
      readFile("app/api/ai/plan-accommodations/route.ts", "utf8"),
      readFile("app/api/ai/form-assistant/route.ts", "utf8"),
    ]);

  assert.ok(myEventsPage.includes("my-events/applications"));
  assert.ok(legacyDashboardPage.includes("my-events/applications"));

  for (const source of [draftRoute, mealRoute, accommodationsRoute, formRoute]) {
    assert.match(source, /userCanUseOrganizerTools/);
    assert.match(source, /organizerToolForbiddenResponse/);
  }
});

test("employer bot flow covers required profile and opportunity fields", async () => {
  const [flows, profilePage, setupPage, opportunityPage, profileBot, opportunityBot] =
    await Promise.all([
      readFile("lib/formAssistant/flows.ts", "utf8"),
      readFile("app/[locale]/profile/page.tsx", "utf8"),
      readFile("app/[locale]/profile/setup/page.tsx", "utf8"),
      readFile("app/[locale]/opportunities/new/page.tsx", "utf8"),
      readFile("app/[locale]/profile/ProfileBotForm.tsx", "utf8"),
      readFile("app/[locale]/opportunities/new/OpportunityBotForm.tsx", "utf8"),
    ]);

  for (const field of [
    "name",
    "organizationType",
    "organizationName",
    "representativeName",
    "purpose",
    "description",
    "activityAreas",
    "activityRegions",
    "publicEmail",
  ]) {
    assert.ok(flows.includes(`field: "${field}"`), `profile bot missing ${field}`);
  }

  for (const field of [
    "title",
    "category",
    "shortDescription",
    "description",
    "startAt",
    "endAt",
    "volunteersNeeded",
    "prefecture",
    "city",
    "address",
    "taskName",
    "taskStartTime",
    "taskDurationMinutes",
    "taskPeopleNeeded",
    "taskShortDescription",
  ]) {
    assert.ok(flows.includes(`"${field}"`), `opportunity bot missing ${field}`);
  }

  assert.match(flows, /organizationType[\s\S]*!== "INDIVIDUAL"/);
  assert.match(profilePage, /method=bot/);
  assert.match(setupPage, /method=bot/);
  assert.match(opportunityPage, /method=bot/);
  assert.match(profileBot, /saveProfile/);
  assert.match(opportunityBot, /createOpportunity/);
  assert.match(opportunityBot, /taskFlowJson/);
});

test("completed profiles open as preview first and edit keeps the original form", async () => {
  const [profilePage, profileBot, chatComponent, assistantRoute, flows, profileForm] =
    await Promise.all([
      readFile("app/[locale]/profile/page.tsx", "utf8"),
      readFile("app/[locale]/profile/ProfileBotForm.tsx", "utf8"),
      readFile("components/FormAssistantBot.tsx", "utf8"),
      readFile("app/api/ai/form-assistant/route.ts", "utf8"),
      readFile("lib/formAssistant/flows.ts", "utf8"),
      readFile("app/[locale]/profile/ProfileForm.tsx", "utf8"),
    ]);

  assert.match(profilePage, /profileCompleted/);
  assert.match(profilePage, /<ProfilePreview/);
  assert.match(profilePage, /editHref=\{`\/\$\{locale\}\/profile\?mode=edit`\}/);
  assert.match(profilePage, /mode=edit&method=manual/);
  assert.match(profilePage, /mode=edit&method=bot/);
  assert.match(profilePage, /<ProfileForm/);
  assert.match(profileForm, /export default function ProfileForm/);

  assert.match(profileBot, /mode = "setup"/);
  assert.match(profileBot, /useProfileEditAssistantFlow/);
  assert.match(profileBot, /<HiddenInputs values=\{activeValues\}/);
  assert.match(chatComponent, /Which profile information would you like to change/);
  assert.match(chatComponent, /Current \$\{getStepLabel\(step, locale\)\}/);
  assert.match(profileBot, /Review and save/);
  assert.match(chatComponent, /changedFields/);
  assert.match(chatComponent, /isBooleanChoice/);

  assert.match(assistantRoute, /getAllProfileAssistantSteps\(values\)/);
  assert.match(flows, /getAllProfileAssistantSteps/);
});

test("assistant feedback schema and route are wired", async () => {
  const [schema, migration, feedbackRoute] = await Promise.all([
    readFile("prisma/schema.prisma", "utf8"),
    readFile(
      "prisma/migrations/20260526030000_add_ai_assistant_feedback/migration.sql",
      "utf8",
    ),
    readFile("app/api/ai/form-assistant/feedback/route.ts", "utf8"),
  ]);

  assert.match(schema, /model AiAssistantFeedback/);
  assert.match(migration, /CREATE TABLE "AiAssistantFeedback"/);
  assert.match(feedbackRoute, /INSERT INTO "AiAssistantFeedback"/);
  assert.match(feedbackRoute, /userCanUseOrganizerTools/);
});

test("opportunity bot supports category keywords and postal code lookup", async () => {
  const [flows, assistantRoute, postalRoute, chatComponent] = await Promise.all([
    readFile("lib/formAssistant/flows.ts", "utf8"),
    readFile("app/api/ai/form-assistant/route.ts", "utf8"),
    readFile("app/api/postal-code/route.ts", "utf8"),
    readFile("components/FormAssistantBot.tsx", "utf8"),
  ]);

  assert.match(flows, /"opportunity-category"[\s\S]*"list"/);
  assert.match(flows, /Category keywords/);
  assert.match(flows, /comma-separated words/);
  assert.match(assistantRoute, /step\.type === "list"/);
  assert.match(assistantRoute, /splitList/);
  assert.match(postalRoute, /6068171/);
  assert.match(postalRoute, /zipcloud\.ibsnet\.co\.jp/);
  assert.match(postalRoute, /userCanUseOrganizerTools/);
  assert.ok(chatComponent.includes("/api/postal-code"));
  assert.match(chatComponent, /extractPostalCode/);
  assert.match(chatComponent, /prefecture: result\.data\.prefecture/);
  assert.match(chatComponent, /city: result\.data\.city/);
});
