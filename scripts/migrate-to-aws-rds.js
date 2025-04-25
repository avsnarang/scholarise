// scripts/migrate-to-aws-rds.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

// Create directories
const dirs = ['exports', 'backups'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

async function runCommand(command, description) {
  console.log(`\n🚀 ${description}...`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) console.error(`stderr: ${stderr}`);
    console.log(`✅ ${description} completed successfully`);
    return stdout;
  } catch (error) {
    console.error(`❌ Error during ${description.toLowerCase()}: ${error.message}`);
    throw error;
  }
}

async function migrateToDatabaseToAwsRds() {
  try {
    console.log('🔄 Starting migration to AWS RDS...');

    // Step 1: Export data from Supabase
    await runCommand('node scripts/export-supabase-data.js', 'Exporting data from Supabase');

    // Step 2: Create a backup of the current database
    await runCommand('node scripts/backup-database.js', 'Creating backup of current database');

    // Step 3: Run Prisma migrations on the new database
    await runCommand('npx prisma migrate deploy', 'Running Prisma migrations on AWS RDS');

    // Step 4: Import data to AWS RDS
    await runCommand('node scripts/import-to-aws-rds.js', 'Importing data to AWS RDS');

    // Step 5: Verify the migration
    await runCommand('npx prisma db pull', 'Verifying database schema');

    console.log('\n✅ Migration to AWS RDS completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify your data in the new database');
    console.log('2. Update your application to use the new database');
    console.log('3. Remove Supabase dependencies if no longer needed');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n🔄 You may need to restore from backup or fix the issues manually.');
  }
}

// Run the migration
migrateToDatabaseToAwsRds().catch(console.error);

export default migrateToDatabaseToAwsRds;
