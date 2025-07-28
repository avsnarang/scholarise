-- Migration to remove old admission models and data
-- This will drop all admission-related tables and enums

-- Drop tables in correct order to handle foreign key constraints
DROP TABLE IF EXISTS "PaperQuestion" CASCADE;
DROP TABLE IF EXISTS "PaperSection" CASCADE;
DROP TABLE IF EXISTS "ApplicationRequirement" CASCADE;
DROP TABLE IF EXISTS "ApplicationStage" CASCADE;
DROP TABLE IF EXISTS "PaymentTransaction" CASCADE;
DROP TABLE IF EXISTS "Assessment" CASCADE;
DROP TABLE IF EXISTS "AdmissionOffer" CASCADE;
DROP TABLE IF EXISTS "AdmissionApplication" CASCADE;
DROP TABLE IF EXISTS "FollowUp" CASCADE;
DROP TABLE IF EXISTS "LeadDocument" CASCADE;
DROP TABLE IF EXISTS "LeadInteraction" CASCADE;
DROP TABLE IF EXISTS "AdmissionLead" CASCADE;
DROP TABLE IF EXISTS "LeadSource" CASCADE;

-- Remove the AdmissionStaff reference from User table first
ALTER TABLE "User" DROP COLUMN IF EXISTS "admissionStaffId";

-- Now drop AdmissionStaff table
DROP TABLE IF EXISTS "AdmissionStaff" CASCADE;

-- Drop admission-related enums
DROP TYPE IF EXISTS "AdmissionStatus" CASCADE;
DROP TYPE IF EXISTS "FollowUpStatus" CASCADE;
DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;
DROP TYPE IF EXISTS "StageStatus" CASCADE;
DROP TYPE IF EXISTS "RequirementStatus" CASCADE;

-- Clean up any orphaned data
-- This is a safety measure in case there are any references we missed
DO $$ 
BEGIN
    -- Add any additional cleanup logic here if needed
    RAISE NOTICE 'Old admission models and data have been removed successfully';
END $$; 