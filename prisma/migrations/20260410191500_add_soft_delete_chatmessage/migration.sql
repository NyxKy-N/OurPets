ALTER TABLE "ChatMessage"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

CREATE INDEX "ChatMessage_deletedAt_idx" ON "ChatMessage"("deletedAt");

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

