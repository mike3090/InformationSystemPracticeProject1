CREATE TABLE "AiAssistantFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "flowType" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "userAnswer" TEXT,
  "botMessage" TEXT,
  "context" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiAssistantFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiAssistantFeedback_userId_idx" ON "AiAssistantFeedback"("userId");
CREATE INDEX "AiAssistantFeedback_flowType_idx" ON "AiAssistantFeedback"("flowType");

ALTER TABLE "AiAssistantFeedback"
  ADD CONSTRAINT "AiAssistantFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
