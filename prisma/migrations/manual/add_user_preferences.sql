-- Add UserPreferences table for storing user-specific UI preferences
-- This table stores preferences like sort configurations, view settings, etc.

CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL, -- e.g., "STUDENT_LIST", "TEACHER_LIST"
    "preferences" JSONB NOT NULL, -- Store sort steps and other UI preferences
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for user and module combination
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_module_key" 
ON "UserPreferences"("userId", "module");

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE "UserPreferences" 
ADD CONSTRAINT "UserPreferences_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "UserPreferences_userId_idx" 
ON "UserPreferences"("userId");

-- Add index for module filtering
CREATE INDEX IF NOT EXISTS "UserPreferences_module_idx" 
ON "UserPreferences"("module");