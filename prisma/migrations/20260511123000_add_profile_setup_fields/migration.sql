-- AlterTable
ALTER TABLE "VolunteerProfile" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VolunteerProfile" ALTER COLUMN "languages" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VolunteerProfile" ADD COLUMN "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VolunteerProfile" ADD COLUMN "preferredTaskTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VolunteerProfile" ADD COLUMN "preferredEnvironmentStyle" TEXT NOT NULL DEFAULT 'either';
ALTER TABLE "VolunteerProfile" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "environmentStyle" TEXT NOT NULL DEFAULT 'mixed';
ALTER TABLE "Organization" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
