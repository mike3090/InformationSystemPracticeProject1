-- Complete the remaining fields from the Notion conceptual schema while
-- preserving the richer employer implementation already in the app.

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT;

UPDATE "Organization"
SET
  "displayName" = COALESCE("displayName", "name"),
  "email" = COALESCE("email", "publicEmail"),
  "phone" = COALESCE("phone", "publicPhone");

ALTER TABLE "VolunteerProfile"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "availabilitySlots" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Opportunity"
  ADD COLUMN IF NOT EXISTS "latitude" NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS "longitude" NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS "customFields" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "withdrawalCutoffHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "questionAnswers" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "reviewedByEmployerId" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "checkinMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "withdrawalReason" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Application_reviewedByEmployerId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_reviewedByEmployerId_fkey"
      FOREIGN KEY ("reviewedByEmployerId")
      REFERENCES "Organization"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
