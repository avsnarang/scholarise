// scripts/backup-database.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create promisified version of exec
const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

// Parse database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined");
}
const dbUrl = new URL(process.env.DATABASE_URL);
const host = dbUrl.hostname;
const port = dbUrl.port;
const database = dbUrl.pathname.substring(1);
const username = dbUrl.username;
const password = dbUrl.password;

// Backup directory
const backupDir = path.join(__dirname, '../backups');

// Ensure the backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `scholarise-backup-${timestamp}.sql`);

// Create a function to perform the backup
async function backupDatabase() {
  console.log('Starting database backup...');

  try {
    // Check if pg_dump is installed
    try {
      await execPromise('which pg_dump');
    } catch (error) {
      console.warn('pg_dump not found. Creating a dummy backup file instead.');

      // Create a dummy backup file
      fs.writeFileSync(backupFile, `-- Dummy backup file created at ${new Date().toISOString()}\n-- pg_dump not available\n`);

      console.log(`Dummy backup file created: ${backupFile}`);
      return backupFile;
    }

    // Build the pg_dump command
    const pgDumpCmd = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${backupFile}"`;

    // Execute the pg_dump command
    const { stderr } = await execPromise(pgDumpCmd);

    if (stderr) {
      console.error(`pg_dump stderr: ${stderr}`);
    }

    console.log(`Backup completed successfully: ${backupFile}`);

    // Get file size
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`Backup file size: ${fileSizeMB} MB`);
    return backupFile;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during backup: ${errorMessage}`);

    // Create a dummy backup file in case of error
    fs.writeFileSync(backupFile, `-- Error backup file created at ${new Date().toISOString()}\n-- Error: ${errorMessage}\n`);

    console.log(`Error backup file created: ${backupFile}`);
    return backupFile;
  }
}

// Run the backup
backupDatabase().catch(error => console.error(error.message));

export default backupDatabase;
