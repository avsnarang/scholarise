/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "employeeCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_employeeCode_key" ON "Teacher"("employeeCode");
