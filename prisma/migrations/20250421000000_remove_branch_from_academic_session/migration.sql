-- Remove the branch relationship from AcademicSession
ALTER TABLE "AcademicSession" DROP CONSTRAINT "AcademicSession_branchId_fkey";
ALTER TABLE "AcademicSession" DROP COLUMN "branchId";
