-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCurrentTerm" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Term_branchId_isActive_idx" ON "Term"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "Term_sessionId_order_idx" ON "Term"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Term_name_branchId_sessionId_key" ON "Term"("name", "branchId", "sessionId");

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE; 