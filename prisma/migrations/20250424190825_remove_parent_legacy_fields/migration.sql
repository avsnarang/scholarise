/*
  Warnings:

  - You are about to drop the column `address` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `Parent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "occupation",
DROP COLUMN "password",
DROP COLUMN "phone",
DROP COLUMN "username";
