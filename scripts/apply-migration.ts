import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Reading migration file...");
    const migrationPath = path.join(process.cwd(), "prisma/migrations/manual/20250425000001_add_role_id_to_employee_teacher.sql");
    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    
    // Split the SQL into separate statements
    const statements = sqlContent
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      await prisma.$executeRawUnsafe(`${statement};`);
    }
    
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 