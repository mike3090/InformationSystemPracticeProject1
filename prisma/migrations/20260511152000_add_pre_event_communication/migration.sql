ALTER TABLE "VolunteerProfile"
ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inAppNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reminder3DaysEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reminder1DayEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reminderSameDayEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Opportunity"
ADD COLUMN "thingsToBring" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "arrivalGuidance" TEXT,
ADD COLUMN "firstLandmarkDescription" TEXT,
ADD COLUMN "firstLandmarkImageUrl" TEXT,
ADD COLUMN "firstContactName" TEXT,
ADD COLUMN "firstContactRole" TEXT,
ADD COLUMN "firstContactImageUrl" TEXT;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "applicationId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'IN_APP',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventUpdate" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'GENERAL',
  "message" TEXT NOT NULL,
  "highlightedDetail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventMessage" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "EventUpdate_opportunityId_createdAt_idx" ON "EventUpdate"("opportunityId", "createdAt");
CREATE INDEX "EventMessage_applicationId_createdAt_idx" ON "EventMessage"("applicationId", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventUpdate" ADD CONSTRAINT "EventUpdate_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventUpdate" ADD CONSTRAINT "EventUpdate_organizerId_fkey"
FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMessage" ADD CONSTRAINT "EventMessage_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMessage" ADD CONSTRAINT "EventMessage_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMessage" ADD CONSTRAINT "EventMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMessage" ADD CONSTRAINT "EventMessage_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
