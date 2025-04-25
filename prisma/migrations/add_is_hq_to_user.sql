-- Add isHQ field to User model
ALTER TABLE "User" ADD COLUMN "isHQ" BOOLEAN NOT NULL DEFAULT false;
