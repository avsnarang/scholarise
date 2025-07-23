-- Bus Inspection System Migration
-- Adds comprehensive bus inspection tracking with predefined checklist items

-- Create inspection status enum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "InspectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "InspectionItemType" AS ENUM ('SAFETY', 'MECHANICAL', 'ELECTRICAL', 'INTERIOR', 'EXTERIOR', 'DOCUMENTATION');

-- Create TransportBusInspection table
CREATE TABLE "TransportBusInspection" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectionType" TEXT NOT NULL DEFAULT 'Regular', -- Regular, Pre-Trip, Post-Trip, Quarterly, Annual
    "inspectorName" TEXT NOT NULL,
    "inspectorEmployeeId" TEXT,
    "odometerReading" INTEGER,
    "fuelLevel" DOUBLE PRECISION,
    "status" "InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "overallRating" TEXT, -- Excellent, Good, Fair, Poor, Failed
    "totalIssues" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "recommendations" TEXT,
    "nextInspectionDue" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportBusInspection_pkey" PRIMARY KEY ("id")
);

-- Create TransportInspectionTemplate table (predefined checklist items)
CREATE TABLE "TransportInspectionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "InspectionItemType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "checklistItems" JSONB NOT NULL, -- Array of inspection items
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "TransportInspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- Create TransportInspectionItem table (individual checklist items for each inspection)
CREATE TABLE "TransportInspectionItem" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "templateItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "category" "InspectionItemType" NOT NULL,
    "description" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "hasProblem" BOOLEAN NOT NULL DEFAULT false,
    "severity" "InspectionSeverity",
    "problemDescription" TEXT,
    "recommendations" TEXT,
    "photoUrls" TEXT[], -- Array of photo URLs for documentation
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportInspectionItem_pkey" PRIMARY KEY ("id")
);

-- Create TransportInspectionPhoto table
CREATE TABLE "TransportInspectionPhoto" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "inspectionItemId" TEXT,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT, -- Before, After, Problem, General
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "TransportBusInspection" 
    ADD CONSTRAINT "TransportBusInspection_busId_fkey" 
    FOREIGN KEY ("busId") REFERENCES "TransportBus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportBusInspection" 
    ADD CONSTRAINT "TransportBusInspection_branchId_fkey" 
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportInspectionTemplate" 
    ADD CONSTRAINT "TransportInspectionTemplate_branchId_fkey" 
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportInspectionItem" 
    ADD CONSTRAINT "TransportInspectionItem_inspectionId_fkey" 
    FOREIGN KEY ("inspectionId") REFERENCES "TransportBusInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportInspectionPhoto" 
    ADD CONSTRAINT "TransportInspectionPhoto_inspectionId_fkey" 
    FOREIGN KEY ("inspectionId") REFERENCES "TransportBusInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportInspectionPhoto" 
    ADD CONSTRAINT "TransportInspectionPhoto_inspectionItemId_fkey" 
    FOREIGN KEY ("inspectionItemId") REFERENCES "TransportInspectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "TransportBusInspection_busId_idx" ON "TransportBusInspection"("busId");
CREATE INDEX "TransportBusInspection_inspectionDate_idx" ON "TransportBusInspection"("inspectionDate");
CREATE INDEX "TransportBusInspection_status_idx" ON "TransportBusInspection"("status");
CREATE INDEX "TransportBusInspection_branchId_idx" ON "TransportBusInspection"("branchId");
CREATE INDEX "TransportInspectionItem_inspectionId_idx" ON "TransportInspectionItem"("inspectionId");
CREATE INDEX "TransportInspectionItem_category_idx" ON "TransportInspectionItem"("category");
CREATE INDEX "TransportInspectionTemplate_branchId_idx" ON "TransportInspectionTemplate"("branchId");

-- Insert default inspection template data
INSERT INTO "TransportInspectionTemplate" ("id", "name", "description", "category", "checklistItems", "branchId") VALUES
('template_safety_001', 'Safety Inspection', 'Basic safety checklist for school buses', 'SAFETY', 
 '[
   {"name": "Emergency exits clear and functional", "required": true, "description": "Check all emergency exits"},
   {"name": "First aid kit present and stocked", "required": true, "description": "Verify first aid supplies"},
   {"name": "Fire extinguisher charged and accessible", "required": true, "description": "Check pressure gauge"},
   {"name": "Seat belts functional", "required": true, "description": "Test all seat belt mechanisms"},
   {"name": "Warning lights and signals working", "required": true, "description": "Test all exterior lights"},
   {"name": "Stop sign arm functioning", "required": true, "description": "Test deployment mechanism"},
   {"name": "Mirrors clean and properly adjusted", "required": true, "description": "Check all mirrors"}
 ]', 
 'default');

INSERT INTO "TransportInspectionTemplate" ("id", "name", "description", "category", "checklistItems", "branchId") VALUES
('template_mechanical_001', 'Mechanical Inspection', 'Engine and mechanical systems check', 'MECHANICAL', 
 '[
   {"name": "Engine oil level and condition", "required": true, "description": "Check dipstick and oil quality"},
   {"name": "Coolant level", "required": true, "description": "Check radiator coolant level"},
   {"name": "Brake system check", "required": true, "description": "Test brake pedal and fluid level"},
   {"name": "Tire condition and pressure", "required": true, "description": "Check all tires including spare"},
   {"name": "Exhaust system inspection", "required": true, "description": "Check for leaks or damage"},
   {"name": "Steering system", "required": true, "description": "Test steering responsiveness"},
   {"name": "Suspension system", "required": true, "description": "Check for unusual wear or damage"}
 ]', 
 'default');

INSERT INTO "TransportInspectionTemplate" ("id", "name", "description", "category", "checklistItems", "branchId") VALUES
('template_interior_001', 'Interior Inspection', 'Interior condition and cleanliness check', 'INTERIOR', 
 '[
   {"name": "Seats secure and clean", "required": true, "description": "Check all passenger seats"},
   {"name": "Aisle clear of obstructions", "required": true, "description": "Ensure clear walkway"},
   {"name": "Interior lights functional", "required": true, "description": "Test all interior lighting"},
   {"name": "Windows clean and unobstructed", "required": true, "description": "Check all windows"},
   {"name": "Floor clean and non-slip", "required": true, "description": "Check floor condition"},
   {"name": "Driver area clean and organized", "required": true, "description": "Check driver compartment"},
   {"name": "No sharp edges or hazards", "required": true, "description": "Safety hazard check"}
 ]', 
 'default');

INSERT INTO "TransportInspectionTemplate" ("id", "name", "description", "category", "checklistItems", "branchId") VALUES
('template_exterior_001', 'Exterior Inspection', 'External condition and appearance check', 'EXTERIOR', 
 '[
   {"name": "Body damage assessment", "required": true, "description": "Check for dents, scratches, rust"},
   {"name": "Paint condition", "required": false, "description": "Overall paint and decal condition"},
   {"name": "Bumpers and guards", "required": true, "description": "Check front and rear bumpers"},
   {"name": "License plates secure", "required": true, "description": "Verify registration plates"},
   {"name": "School bus identification clear", "required": true, "description": "Check school name and number"},
   {"name": "Wheel wells and undercarriage", "required": true, "description": "Visual inspection underneath"},
   {"name": "Door operation", "required": true, "description": "Test all doors including emergency"}
 ]', 
 'default');

INSERT INTO "TransportInspectionTemplate" ("id", "name", "description", "category", "checklistItems", "branchId") VALUES
('template_documentation_001', 'Documentation Check', 'Required documents and certifications', 'DOCUMENTATION', 
 '[
   {"name": "Registration certificate current", "required": true, "description": "Check expiry date"},
   {"name": "Insurance certificate valid", "required": true, "description": "Verify coverage"},
   {"name": "Fitness certificate current", "required": true, "description": "Check validity"},
   {"name": "Pollution certificate valid", "required": true, "description": "Environmental compliance"},
   {"name": "Permit documentation", "required": true, "description": "School transport permit"},
   {"name": "Driver license verification", "required": true, "description": "Valid driving license"},
   {"name": "Conductor certificate (if applicable)", "required": false, "description": "Conductor authorization"}
 ]', 
 'default');

-- Update the default branchId to use a placeholder that can be updated per branch
UPDATE "TransportInspectionTemplate" SET "branchId" = 'default' WHERE "branchId" = 'default'; 