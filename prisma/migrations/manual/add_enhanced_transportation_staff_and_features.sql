-- Enhanced Transportation Module Migration
-- Adds comprehensive staff management, trip tracking, and notification system

-- Add new enums
CREATE TYPE "TransportStaffType" AS ENUM ('DRIVER', 'CONDUCTOR');
CREATE TYPE "TransportStaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED');
CREATE TYPE "NotificationType" AS ENUM ('INSURANCE_EXPIRY', 'POLLUTION_EXPIRY', 'FITNESS_EXPIRY', 'LICENSE_EXPIRY', 'MEDICAL_EXPIRY', 'TAX_DUE', 'PERMIT_EXPIRY', 'MAINTENANCE_DUE', 'FUEL_ALERT', 'LOAN_DUE');
CREATE TYPE "NotificationMethod" AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- Update TransportBus table - remove old driver/conductor fields and add enhanced details
ALTER TABLE "TransportBus" 
  DROP COLUMN IF EXISTS "driverName",
  DROP COLUMN IF EXISTS "driverPhone", 
  DROP COLUMN IF EXISTS "driverLicense",
  DROP COLUMN IF EXISTS "conductorName",
  DROP COLUMN IF EXISTS "conductorPhone";

-- Add financial details to TransportBus
ALTER TABLE "TransportBus" 
  ADD COLUMN "loanAmount" DOUBLE PRECISION,
  ADD COLUMN "loanEmi" DOUBLE PRECISION,
  ADD COLUMN "loanStartDate" TIMESTAMP(3),
  ADD COLUMN "loanFulfillmentDate" TIMESTAMP(3),
  ADD COLUMN "loanProvider" TEXT;

-- Add tax details to TransportBus
ALTER TABLE "TransportBus"
  ADD COLUMN "lastTaxSubmissionDate" TIMESTAMP(3),
  ADD COLUMN "nextTaxDueDate" TIMESTAMP(3),
  ADD COLUMN "taxType" TEXT,
  ADD COLUMN "taxAmount" DOUBLE PRECISION,
  ADD COLUMN "taxSubmissionFrequency" TEXT;

-- Add permit details to TransportBus
ALTER TABLE "TransportBus"
  ADD COLUMN "permitType" TEXT,
  ADD COLUMN "permitNumber" TEXT,
  ADD COLUMN "permitIssueDate" TIMESTAMP(3),
  ADD COLUMN "permitExpiryDate" TIMESTAMP(3),
  ADD COLUMN "permitIssuedBy" TEXT;

-- Create TransportStaff table
CREATE TABLE "TransportStaff" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "staffType" "TransportStaffType" NOT NULL,
    "status" "TransportStaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateOfJoining" TIMESTAMP(3),
    "dateOfLeaving" TIMESTAMP(3),
    "licenseNumber" TEXT,
    "licenseType" TEXT,
    "licenseIssueDate" TIMESTAMP(3),
    "licenseExpiryDate" TIMESTAMP(3),
    "licenseIssuedBy" TEXT,
    "medicalCertNumber" TEXT,
    "medicalIssueDate" TIMESTAMP(3),
    "medicalExpiryDate" TIMESTAMP(3),
    "medicalIssuedBy" TEXT,
    "bloodGroup" TEXT,
    "medicalConditions" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "salary" DOUBLE PRECISION,
    "allowances" DOUBLE PRECISION,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "ifscCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportStaff_pkey" PRIMARY KEY ("id")
);

-- Create TransportStaffAssignment table
CREATE TABLE "TransportStaffAssignment" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffType" "TransportStaffType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStaffAssignment_pkey" PRIMARY KEY ("id")
);

-- Create TransportTrip table
CREATE TABLE "TransportTrip" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "routeId" TEXT,
    "driverId" TEXT,
    "conductorId" TEXT,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "startKilometerReading" INTEGER NOT NULL,
    "endKilometerReading" INTEGER,
    "totalDistance" DOUBLE PRECISION,
    "numberOfStudents" INTEGER,
    "fuelConsumed" DOUBLE PRECISION,
    "tripType" TEXT NOT NULL DEFAULT 'Regular',
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportTrip_pkey" PRIMARY KEY ("id")
);

-- Create TransportNotification table
CREATE TABLE "TransportNotification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "method" "NotificationMethod" NOT NULL DEFAULT 'EMAIL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "busId" TEXT,
    "staffId" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "sentDate" TIMESTAMP(3),
    "readDate" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportNotification_pkey" PRIMARY KEY ("id")
);

-- Create TransportNotificationConfig table
CREATE TABLE "TransportNotificationConfig" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "method" "NotificationMethod" NOT NULL DEFAULT 'EMAIL',
    "emailTemplate" TEXT,
    "emailSubject" TEXT,
    "whatsappTemplate" TEXT,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequencyDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportNotificationConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "TransportStaff_employeeCode_key" ON "TransportStaff"("employeeCode");
CREATE UNIQUE INDEX "TransportStaffAssignment_busId_staffId_staffType_isActive_key" ON "TransportStaffAssignment"("busId", "staffId", "staffType", "isActive");
CREATE UNIQUE INDEX "TransportNotificationConfig_branchId_type_key" ON "TransportNotificationConfig"("branchId", "type");

-- Create indexes for performance
CREATE INDEX "TransportStaff_employeeCode_idx" ON "TransportStaff"("employeeCode");
CREATE INDEX "TransportStaff_branchId_idx" ON "TransportStaff"("branchId");
CREATE INDEX "TransportStaff_staffType_idx" ON "TransportStaff"("staffType");

CREATE INDEX "TransportStaffAssignment_busId_idx" ON "TransportStaffAssignment"("busId");
CREATE INDEX "TransportStaffAssignment_staffId_idx" ON "TransportStaffAssignment"("staffId");

CREATE INDEX "TransportTrip_busId_idx" ON "TransportTrip"("busId");
CREATE INDEX "TransportTrip_routeId_idx" ON "TransportTrip"("routeId");
CREATE INDEX "TransportTrip_tripDate_idx" ON "TransportTrip"("tripDate");

CREATE INDEX "TransportNotification_branchId_idx" ON "TransportNotification"("branchId");
CREATE INDEX "TransportNotification_type_idx" ON "TransportNotification"("type");
CREATE INDEX "TransportNotification_status_idx" ON "TransportNotification"("status");
CREATE INDEX "TransportNotification_scheduledDate_idx" ON "TransportNotification"("scheduledDate");

CREATE INDEX "TransportNotificationConfig_branchId_idx" ON "TransportNotificationConfig"("branchId");
CREATE INDEX "TransportNotificationConfig_type_idx" ON "TransportNotificationConfig"("type");

-- Add foreign key constraints
ALTER TABLE "TransportStaff" ADD CONSTRAINT "TransportStaff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransportStaffAssignment" ADD CONSTRAINT "TransportStaffAssignment_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportStaffAssignment" ADD CONSTRAINT "TransportStaffAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportNotification" ADD CONSTRAINT "TransportNotification_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportNotification" ADD CONSTRAINT "TransportNotification_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportNotification" ADD CONSTRAINT "TransportNotification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportNotificationConfig" ADD CONSTRAINT "TransportNotificationConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 