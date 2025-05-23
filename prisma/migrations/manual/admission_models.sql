-- Create Lead Source Table
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- Create AdmissionLead Table
CREATE TABLE "AdmissionLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "parentName" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "gradeApplyingFor" TEXT,
    "academicSession" TEXT,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,
    "leadType" TEXT,
    "appliedClass" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "lastContactDate" TIMESTAMP(3),
    "registrationNumber" TEXT,
    "provisionalInvoiceNumber" TEXT,
    
    CONSTRAINT "AdmissionLead_pkey" PRIMARY KEY ("id")
);

-- Create Lead Interaction Table
CREATE TABLE "LeadInteraction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "conductedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LeadInteraction_pkey" PRIMARY KEY ("id")
);

-- Create Lead Document Table
CREATE TABLE "LeadDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LeadDocument_pkey" PRIMARY KEY ("id")
);

-- Create Follow Up Table
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- Create Admission Staff Table
CREATE TABLE "AdmissionStaff" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clerkId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "AdmissionStaff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdmissionStaff_userId_key" UNIQUE ("userId")
);

-- Create Admission Application Table
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "currentStage" TEXT,
    "assignedToId" TEXT,
    "reviewedById" TEXT,
    "reviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "decisionById" TEXT,
    "decisionNotes" TEXT,
    "offerAcceptedDate" TIMESTAMP(3),
    "feePaid" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" DOUBLE PRECISION,
    "feeDate" TIMESTAMP(3),
    "enrollmentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdmissionApplication_leadId_key" UNIQUE ("leadId"),
    CONSTRAINT "AdmissionApplication_applicationNumber_key" UNIQUE ("applicationNumber")
);

-- Create Application Stage Table
CREATE TABLE "ApplicationStage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedById" TEXT,
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "ApplicationStage_pkey" PRIMARY KEY ("id")
);

-- Create Application Requirement Table
CREATE TABLE "ApplicationRequirement" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "ApplicationRequirement_pkey" PRIMARY KEY ("id")
);

-- Create Payment Transaction Table
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "transactionId" TEXT,
    "invoiceNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- Create Assessment Table
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "assessorId" TEXT,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "result" TEXT,
    "notes" TEXT,
    "location" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- Create Admission Offer Table
CREATE TABLE "AdmissionOffer" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "offerLetterUrl" TEXT,
    "terms" TEXT,
    "confirmedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "AdmissionOffer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdmissionOffer_leadId_key" UNIQUE ("leadId")
);

-- Add Foreign Key Constraints
ALTER TABLE "AdmissionLead" ADD CONSTRAINT "AdmissionLead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionLead" ADD CONSTRAINT "AdmissionLead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdmissionLead" ADD CONSTRAINT "AdmissionLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApplicationStage" ADD CONSTRAINT "ApplicationStage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApplicationRequirement" ADD CONSTRAINT "ApplicationRequirement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "AdmissionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionOffer" ADD CONSTRAINT "AdmissionOffer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
