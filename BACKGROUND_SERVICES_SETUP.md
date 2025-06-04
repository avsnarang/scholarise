# Background Services Setup

This document explains the background services implementation for handling bulk operations and email notifications in the Scholarise system.

## Overview

The background services system provides:
- **Automated task processing** for bulk operations (user imports, etc.)
- **Email notifications** when tasks complete or fail
- **Real-time monitoring** of task progress
- **Automatic service health checks** and recovery

## Components

### 1. Core Services

#### Background Task Service (`/src/services/background-task-service.ts`)
- Manages the task queue and processing
- Handles bulk user creation (students, teachers, employees)
- Processes tasks in batches to avoid overwhelming external APIs
- Provides progress tracking and error handling

#### Email Service (`/src/utils/email.ts`)
- Sends task completion/failure notifications
- Configurable SMTP settings per branch or globally
- HTML and text email templates
- Retry logic for failed emails

#### Startup Script (`/src/lib/startup.ts`)
- **Auto-initializes** background services when the server starts
- Sets up periodic health checks (every 5 minutes)
- Provides manual restart capabilities
- Handles graceful shutdown

### 2. API Routes

#### Initialization API (`/src/app/api/init/route.ts`)
- **GET `/api/init`** - Initialize services
- **GET `/api/init?action=status`** - Get service status
- **GET `/api/init?action=restart`** - Force restart services
- **POST `/api/init`** - Initialize with options (force restart)

#### tRPC Routes (`/src/server/api/routers/background-tasks.ts`)
- `getAllTasks` - Get all background tasks
- `getServiceStatus` - Get service initialization status
- `restartServices` - Force restart background services
- `createBulkTask` - Create new bulk operation tasks
- Email configuration management endpoints

### 3. UI Components

#### Task Progress Dropdown (`/src/components/ui/task-progress-dropdown.tsx`)
- Shows active tasks in the header
- Real-time progress updates
- Download results and delete completed tasks

#### Background Services Dashboard (`/src/app/settings/background-services/page.tsx`)
- Monitor service status and health
- Manually restart services
- View recent task activity
- Service control panel

#### Email Configuration (`/src/app/settings/email-config/page.tsx`)
- Configure SMTP settings
- Test email connections
- Set notification preferences
- Manage admin email recipients

#### Bulk Import Components
- `TeacherBulkImport` - CSV import for teachers
- `EmployeeBulkImport` - CSV import for employees
- Both use background tasks for processing

## How It Works

### Automatic Initialization

1. **Server Startup**: When the server starts, the startup script automatically initializes background services after a 1-second delay
2. **Health Monitoring**: Every 5 minutes, the system checks if the task processor is running and restarts it if needed
3. **Import Integration**: The startup script is imported by the background task service, ensuring initialization happens when needed

### Task Processing Flow

1. **Task Creation**: Bulk operations create background tasks via `createBulkTask`
2. **Queue Processing**: Tasks are processed in priority order (1=highest, 10=lowest)
3. **Batch Processing**: Large imports are split into batches (e.g., 10 users at a time)
4. **Progress Updates**: Real-time progress is stored in the database
5. **Email Notifications**: Success/failure emails are sent based on configuration

### Email Notifications

1. **Configuration**: Set up SMTP settings in Settings > Email Configuration
2. **Recipients**: Add admin emails to receive notifications
3. **Templates**: HTML and text templates for task completion/failure
4. **Content Options**: Include task details and error logs (configurable)

## Usage

### For Administrators

1. **Monitor Services**: Visit `/settings/background-services` to check status
2. **Configure Email**: Visit `/settings/email-config` to set up notifications
3. **View Tasks**: Click the task progress icon in the header to see active tasks

### For Users

1. **Bulk Import**: Use the "Import" buttons in teacher/employee pages
2. **Track Progress**: Monitor import progress in the task dropdown
3. **Download Results**: Export task results when complete

### For Developers

```typescript
// Create a new bulk task
await backgroundTaskService.createTask(
  'BULK_CLERK_CREATION',
  'Import 100 Users',
  'Importing users from CSV',
  {
    type: 'student',
    items: userData,
    branchId: 'branch-id'
  }
);

// Check service status
const status = getBackgroundServiceStatus();

// Force restart services
await forceRestartBackgroundServices();
```

## Configuration

### Environment Variables

Ensure these are set in your `.env` file:
- `DATABASE_URL` - For task storage
- `DIRECT_URL` - For database connections
- Clerk API keys - For user creation

### Email Settings

Configure in the UI at `/settings/email-config`:
- SMTP host, port, username, password
- From email and display name
- Admin email recipients
- Notification preferences

## Troubleshooting

### Services Not Starting

1. Check server logs for initialization errors
2. Visit `/settings/background-services` and click "Restart Services"
3. Verify database connectivity
4. Check Clerk API configuration

### Tasks Not Processing

1. Check if services are initialized in the dashboard
2. Look for errors in task execution logs
3. Verify Clerk API rate limits aren't exceeded
4. Restart services if needed

### Email Notifications Not Working

1. Test SMTP connection in Email Configuration
2. Check admin email addresses are valid
3. Verify notification settings are enabled
4. Check server logs for email errors

## Database Schema

The system uses these Prisma models:
- `BackgroundTask` - Stores task information and progress
- `TaskExecutionLog` - Detailed execution logs
- `EmailConfiguration` - SMTP and notification settings

## Security Considerations

- SMTP passwords should be encrypted in production
- Use app passwords for Gmail, not regular passwords
- Limit access to background service controls to admins
- Monitor task logs for sensitive information

## Performance Notes

- Tasks are processed with delays to respect API rate limits
- Large imports are batched to avoid memory issues
- Health checks run every 5 minutes to minimize overhead
- Progress updates are throttled to avoid database spam

This implementation provides a robust, monitored background processing system that can handle bulk operations reliably while keeping users informed of progress through real-time updates and email notifications. 