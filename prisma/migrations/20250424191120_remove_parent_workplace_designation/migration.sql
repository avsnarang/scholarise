/*
  Warnings:

  - You are about to drop the column `fatherDesignation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `fatherWorkplace` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `guardianDesignation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `guardianWorkplace` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `motherDesignation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `motherWorkplace` on the `Parent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "fatherDesignation",
DROP COLUMN "fatherWorkplace",
DROP COLUMN "guardianDesignation",
DROP COLUMN "guardianWorkplace",
DROP COLUMN "motherDesignation",
DROP COLUMN "motherWorkplace";
