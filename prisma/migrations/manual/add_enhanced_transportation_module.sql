-- Enhanced Transportation Module Migration
-- This migration adds comprehensive transportation management features

-- Create TransportBus table
CREATE TABLE "TransportBus" (
    "id" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "registrationNo" TEXT,
    "capacity" INTEGER NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "driverLicense" TEXT,
    "conductorName" TEXT,
    "conductorPhone" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "pollutionCert" TEXT,
    "pollutionExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "model" TEXT,
    "fuelType" TEXT NOT NULL DEFAULT 'Diesel',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportBus_pkey" PRIMARY KEY ("id")
);

-- Create TransportBusRoute table
CREATE TABLE "TransportBusRoute" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBusRoute_pkey" PRIMARY KEY ("id")
);

-- Create TransportFuelLog table
CREATE TABLE "TransportFuelLog" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "fuelDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fuelQuantity" DOUBLE PRECISION NOT NULL,
    "pricePerLiter" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "odometerReading" INTEGER,
    "fuelStation" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelLog_pkey" PRIMARY KEY ("id")
);

-- Create TransportMaintenanceLog table
CREATE TABLE "TransportMaintenanceLog" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "serviceProvider" TEXT,
    "odometerReading" INTEGER,
    "nextServiceDue" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportMaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- Create TransportFeeStructure table
CREATE TABLE "TransportFeeStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "feeType" "TransportFeeType" NOT NULL DEFAULT 'ROUTE_WISE',
    "amount" DOUBLE PRECISION NOT NULL,
    "sessionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "routeId" TEXT,
    "stopId" TEXT,
    "applicableFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicableUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFeeStructure_pkey" PRIMARY KEY ("id")
);

-- Create TransportConfiguration table
CREATE TABLE "TransportConfiguration" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "feeCalculationMethod" "TransportFeeType" NOT NULL DEFAULT 'ROUTE_WISE',
    "allowStopWiseFees" BOOLEAN NOT NULL DEFAULT true,
    "allowRouteWiseFees" BOOLEAN NOT NULL DEFAULT true,
    "defaultFuelType" TEXT NOT NULL DEFAULT 'Diesel',
    "autoCalculateDistances" BOOLEAN NOT NULL DEFAULT true,
    "requireDriverDetails" BOOLEAN NOT NULL DEFAULT true,
    "requireConductorDetails" BOOLEAN NOT NULL DEFAULT false,
    "enableFuelTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableMaintenanceTracking" BOOLEAN NOT NULL DEFAULT true,
    "maxCapacityPerBus" INTEGER NOT NULL DEFAULT 50,
    "fuelAlertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maintenanceAlertDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportConfiguration_pkey" PRIMARY KEY ("id")
);

-- Create enum types
CREATE TYPE "TransportFeeType" AS ENUM ('ROUTE_WISE', 'STOP_WISE', 'DISTANCE_BASED', 'FLAT_RATE');
CREATE TYPE "TransportAssignmentType" AS ENUM ('ROUTE_ONLY', 'STOP_ONLY', 'ROUTE_STOP');

-- Update existing TransportRoute table
ALTER TABLE "TransportRoute" ADD COLUMN "startLocation" TEXT;
ALTER TABLE "TransportRoute" ADD COLUMN "endLocation" TEXT;
ALTER TABLE "TransportRoute" ADD COLUMN "totalDistance" DOUBLE PRECISION;
ALTER TABLE "TransportRoute" ADD COLUMN "estimatedTime" INTEGER;

-- Update existing TransportStop table
ALTER TABLE "TransportStop" DROP COLUMN "fee";
ALTER TABLE "TransportStop" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "TransportStop" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "TransportStop" ADD COLUMN "pickupTime" TEXT;
ALTER TABLE "TransportStop" ADD COLUMN "dropTime" TEXT;

-- Update existing TransportAssignment table
ALTER TABLE "TransportAssignment" ADD COLUMN "routeId" TEXT;
ALTER TABLE "TransportAssignment" ADD COLUMN "feeStructureId" TEXT;
ALTER TABLE "TransportAssignment" ADD COLUMN "assignmentType" "TransportAssignmentType" NOT NULL DEFAULT 'ROUTE_STOP';
ALTER TABLE "TransportAssignment" ADD COLUMN "assignedBy" TEXT;
ALTER TABLE "TransportAssignment" ADD COLUMN "notes" TEXT;
ALTER TABLE "TransportAssignment" ALTER COLUMN "stopId" DROP NOT NULL;

-- Create unique constraints
CREATE UNIQUE INDEX "TransportBus_busNumber_key" ON "TransportBus"("busNumber");
CREATE UNIQUE INDEX "TransportBusRoute_busId_routeId_startDate_key" ON "TransportBusRoute"("busId", "routeId", "startDate");
CREATE UNIQUE INDEX "TransportStop_routeId_sequence_key" ON "TransportStop"("routeId", "sequence");
CREATE UNIQUE INDEX "TransportConfiguration_branchId_key" ON "TransportConfiguration"("branchId");

-- Create indexes
CREATE INDEX "TransportBus_busNumber_idx" ON "TransportBus"("busNumber");
CREATE INDEX "TransportBus_branchId_idx" ON "TransportBus"("branchId");
CREATE INDEX "TransportFuelLog_busId_fuelDate_idx" ON "TransportFuelLog"("busId", "fuelDate");
CREATE INDEX "TransportMaintenanceLog_busId_maintenanceDate_idx" ON "TransportMaintenanceLog"("busId", "maintenanceDate");
CREATE INDEX "TransportFeeStructure_branchId_sessionId_idx" ON "TransportFeeStructure"("branchId", "sessionId");
CREATE INDEX "TransportFeeStructure_feeType_idx" ON "TransportFeeStructure"("feeType");
CREATE INDEX "TransportAssignment_studentId_idx" ON "TransportAssignment"("studentId");
CREATE INDEX "TransportAssignment_routeId_idx" ON "TransportAssignment"("routeId");
CREATE INDEX "TransportAssignment_stopId_idx" ON "TransportAssignment"("stopId");
CREATE INDEX "TransportConfiguration_branchId_idx" ON "TransportConfiguration"("branchId");

-- Add foreign key constraints
ALTER TABLE "TransportBus" ADD CONSTRAINT "TransportBus_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportBusRoute" ADD CONSTRAINT "TransportBusRoute_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportBusRoute" ADD CONSTRAINT "TransportBusRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportFuelLog" ADD CONSTRAINT "TransportFuelLog_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportMaintenanceLog" ADD CONSTRAINT "TransportMaintenanceLog_busId_fkey" FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransportStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportConfiguration" ADD CONSTRAINT "TransportConfiguration_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportConfiguration" ADD CONSTRAINT "TransportConfiguration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "TransportFeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 