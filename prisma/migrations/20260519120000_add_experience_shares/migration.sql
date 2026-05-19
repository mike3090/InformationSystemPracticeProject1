CREATE TABLE "ExperienceShare" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "applicationId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rating" INTEGER,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExperienceShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperienceShare_applicationId_key" ON "ExperienceShare"("applicationId");
CREATE INDEX "ExperienceShare_opportunityId_idx" ON "ExperienceShare"("opportunityId");
CREATE INDEX "ExperienceShare_authorId_idx" ON "ExperienceShare"("authorId");
CREATE INDEX "ExperienceShare_createdAt_idx" ON "ExperienceShare"("createdAt");

ALTER TABLE "ExperienceShare"
  ADD CONSTRAINT "ExperienceShare_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExperienceShare"
  ADD CONSTRAINT "ExperienceShare_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExperienceShare"
  ADD CONSTRAINT "ExperienceShare_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
