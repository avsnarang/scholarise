-- Add sessionId column to MoneyCollection table
ALTER TABLE "MoneyCollection" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

-- Add foreign key constraint
ALTER TABLE "MoneyCollection" ADD CONSTRAINT "MoneyCollection_sessionId_fkey" 
FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE; 