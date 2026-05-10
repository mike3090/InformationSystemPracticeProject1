ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';

ALTER TABLE "Opportunity"
ADD COLUMN "allowMultipleTaskSelection" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Application"
ADD COLUMN "selectedTaskItems" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "confirmedTimeCommitment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "skillTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "experienceNote" TEXT,
ADD COLUMN "waitlistPosition" INTEGER,
ADD COLUMN "withdrawnAt" TIMESTAMP(3);
