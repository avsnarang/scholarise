import { backgroundTaskService } from '@/services/background-task-service';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

export async function initializeBackgroundServices() {
  // If already initialized, return immediately
  if (isInitialized) {
    console.log('Background services already initialized');
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    console.log('Background services initialization in progress, waiting...');
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = performInitialization();
  
  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

async function performInitialization() {
  try {
    console.log('Initializing background services...');
    
    // Start the background task processor
    await backgroundTaskService.restartProcessing();
    
    isInitialized = true;
    console.log('Background services initialized successfully');
    
    // Set up periodic health check (every 5 minutes)
    if (typeof setInterval !== 'undefined') {
      setInterval(async () => {
        try {
          if (!backgroundTaskService.isCurrentlyProcessing()) {
            console.log('Background task processor not running, restarting...');
            await backgroundTaskService.restartProcessing();
          }
        } catch (error) {
          console.error('Error in background service health check:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
  } catch (error) {
    isInitialized = false;
    console.error('Failed to initialize background services:', error);
    throw error;
  }
}

// Force restart function for manual intervention
export async function forceRestartBackgroundServices() {
  console.log('Force restarting background services...');
  isInitialized = false;
  initializationPromise = null;
  await initializeBackgroundServices();
}

// Get current status
export function getBackgroundServiceStatus() {
  return {
    isInitialized,
    isProcessing: backgroundTaskService.isCurrentlyProcessing(),
    currentTaskId: backgroundTaskService.getCurrentTaskId(),
  };
}

// Auto-initialize in server environment
if (typeof window === 'undefined') {
  // We're on the server side
  setTimeout(() => {
    initializeBackgroundServices().catch(error => {
      console.error('Failed to auto-initialize background services:', error);
    });
  }, 1000); // Wait 1 second after module load
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    isInitialized = false;
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    isInitialized = false;
    process.exit(0);
  });
} 