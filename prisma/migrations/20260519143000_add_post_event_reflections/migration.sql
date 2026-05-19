CREATE TABLE "PostEventReflection" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "accomplishmentSummary" TEXT NOT NULL,
  "shareCardText" TEXT NOT NULL,
  "badges" JSONB NOT NULL DEFAULT '[]',
  "taskClarityRating" INTEGER,
  "preparationRating" INTEGER,
  "timeWellSpentRating" INTEGER,
  "feedbackComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostEventReflection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerSkillBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "badgeKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "earnedCount" INTEGER NOT NULL DEFAULT 1,
  "firstEarnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastEarnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerSkillBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostEventReflection_applicationId_key" ON "PostEventReflection"("applicationId");
CREATE INDEX "PostEventReflection_userId_idx" ON "PostEventReflection"("userId");
CREATE INDEX "PostEventReflection_opportunityId_idx" ON "PostEventReflection"("opportunityId");
CREATE UNIQUE INDEX "VolunteerSkillBadge_userId_badgeKey_key" ON "VolunteerSkillBadge"("userId", "badgeKey");
CREATE INDEX "VolunteerSkillBadge_badgeKey_idx" ON "VolunteerSkillBadge"("badgeKey");

ALTER TABLE "PostEventReflection"
  ADD CONSTRAINT "PostEventReflection_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostEventReflection"
  ADD CONSTRAINT "PostEventReflection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostEventReflection"
  ADD CONSTRAINT "PostEventReflection_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VolunteerSkillBadge"
  ADD CONSTRAINT "VolunteerSkillBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
