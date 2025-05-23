-- Add isMultiBranchAccess column to Employee table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Employee'
        AND column_name = 'isMultiBranchAccess'
    ) THEN
        ALTER TABLE "Employee" ADD COLUMN "isMultiBranchAccess" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END
$$;

-- Create EmployeeBranchAccess table if it doesn't exist
CREATE TABLE IF NOT EXISTS "EmployeeBranchAccess" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBranchAccess_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'EmployeeBranchAccess_employeeId_branchId_key'
    ) THEN
        ALTER TABLE "EmployeeBranchAccess" ADD CONSTRAINT "EmployeeBranchAccess_employeeId_branchId_key" UNIQUE ("employeeId", "branchId");
    END IF;
END
$$;

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'EmployeeBranchAccess_employeeId_fkey'
    ) THEN
        ALTER TABLE "EmployeeBranchAccess" ADD CONSTRAINT "EmployeeBranchAccess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'EmployeeBranchAccess_branchId_fkey'
    ) THEN
        ALTER TABLE "EmployeeBranchAccess" ADD CONSTRAINT "EmployeeBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$; 