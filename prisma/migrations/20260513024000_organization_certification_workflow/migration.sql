ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "certificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "certificationReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "certificationReviewNote" TEXT;
