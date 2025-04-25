-- CreateTable
CREATE TABLE "StudentSibling" (
    "id" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "siblingId" TEXT NOT NULL,

    CONSTRAINT "StudentSibling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentSibling_studentId_siblingId_key" ON "StudentSibling"("studentId", "siblingId");

-- AddForeignKey
ALTER TABLE "StudentSibling" ADD CONSTRAINT "StudentSibling_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSibling" ADD CONSTRAINT "StudentSibling_siblingId_fkey" FOREIGN KEY ("siblingId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
