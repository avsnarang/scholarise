import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

// Define the global type
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Maximum number of connection retry attempts
const MAX_RETRIES = 3;
// Initial delay before retrying (ms)
const INITIAL_RETRY_DELAY = 1000;

/**
 * Initialize a PrismaClient instance with connection validation and retry logic
 */
function createPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });

  // Start validation and retry logic
  initializeClientWithRetry(prisma).catch(err => {
    console.error("Fatal database connection error after retries:", err);
    // In production, you might want to report this to a monitoring service
  });

  return prisma;
}

/**
 * Initialize database connection with retry logic
 */
async function initializeClientWithRetry(
  prisma: PrismaClient, 
  retryCount = 0
): Promise<void> {
  try {
    // Test the connection
    await prisma.$connect();
    console.log("✅ Database connection established successfully");
    
    // Log available models for debugging
    const models = Object.keys(prisma).filter(key => !key.startsWith('_'));
    console.log("Available database models:", models);
    
    // Verify critical models
    if (!models.includes('designation') || !models.includes('department')) {
      console.warn("⚠️ Critical models missing from PrismaClient");
    }

    // Set up error event handlers for monitoring connection issues
    // @ts-ignore - PrismaClient event types not fully compatible
    prisma.$on('query', (e: any) => {
      if (env.NODE_ENV === "development") {
        console.log('Query: ' + e.query);
      }
    });

    // @ts-ignore - PrismaClient event types not fully compatible
    prisma.$on('error', (e: any) => {
      console.error('Prisma Error:', e);
    });

    // Heartbeat check every 30 seconds (optional, but helps detect zombie connections)
    if (env.NODE_ENV === "production") {
      setInterval(async () => {
        try {
          // Simple query to verify connection is still alive
          await prisma.$queryRaw`SELECT 1`;
        } catch (err) {
          console.error("Database heartbeat check failed:", err);
          // Could implement reconnection logic here if needed
        }
      }, 30000);
    }
  } catch (err) {
    console.error(`❌ Database connection attempt ${retryCount + 1}/${MAX_RETRIES} failed:`, err);
    
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying connection in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return initializeClientWithRetry(prisma, retryCount + 1);
    } else {
      // After max retries, rethrow to be caught by the calling function
      throw new Error(`Failed to establish database connection after ${MAX_RETRIES} attempts`);
    }
  }
}

// Use the global singleton in development to prevent multiple instances during hot reloading
export const db = global.prisma || createPrismaClient();

// Save the client to the global object in non-production environments
if (env.NODE_ENV !== "production") {
  global.prisma = db;
}

// Enhance connection security by catching unexpected shutdown
if (env.NODE_ENV === "production") {
  process.on('SIGINT', () => {
    db.$disconnect().then(() => {
      console.log('Database connection closed due to app termination');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    db.$disconnect().then(() => {
      console.log('Database connection closed due to app termination');
      process.exit(0);
    });
  });
}

// Export individual models with proper typing for safer access
export const designation = db.designation;
export const department = db.department;
