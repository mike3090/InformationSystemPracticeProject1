import "dotenv/config";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
    GROUP BY "certificationStatus"
  `);

  const counts = Object.fromEntries(
    result.rows.map((row) => [row.certificationStatus, row.count]),
  );

  assert.equal(counts.certified, 1);
  assert.equal(counts.changes_requested, 1);
  assert.equal(counts.under_review, 1);
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
  `);

  assert.deepEqual(organizationResult.rows[0], {
    withDisplayName: 3,
    withEmail: 3,
    withMap: 3,
  });

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
