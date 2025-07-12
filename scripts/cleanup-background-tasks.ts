import { db } from '../src/server/db';

async function cleanupBackgroundTasks() {
  console.log('🧹 Starting background task cleanup...');
  
  try {
    // 1. Show current duplicate tasks
    const duplicateTasks = await db.backgroundTask.findMany({
      where: {
        taskType: 'BULK_CLERK_RETRY',
        status: { in: ['PENDING', 'RUNNING'] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        totalItems: true,
        processedItems: true,
        createdAt: true,
        createdBy: true
      }
    });
    
    console.log(`Found ${duplicateTasks.length} retry tasks:`, duplicateTasks);
    
    // 2. Delete duplicate tasks (keep only the most recent one per user/type)
    const groupedTasks = new Map<string, typeof duplicateTasks>();
    
    for (const task of duplicateTasks) {
      const key = `${task.title}-${task.createdBy}`;
      const existing = groupedTasks.get(key);
      
      if (!existing) {
        groupedTasks.set(key, [task]);
      } else {
        existing.push(task);
      }
    }
    
    let deletedCount = 0;
    for (const [key, tasks] of groupedTasks) {
      if (tasks.length > 1) {
        // Keep the most recent, delete the rest
        const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const toDelete = sortedTasks.slice(1);
        
        console.log(`Deleting ${toDelete.length} duplicate tasks for ${key}`);
        
        for (const task of toDelete) {
          await db.backgroundTask.delete({
            where: { id: task.id }
          });
          deletedCount++;
          console.log(`  ✅ Deleted task ${task.id} (${task.status})`);
        }
      }
    }
    
    // 3. Reset any stuck RUNNING tasks
    const stuckTasks = await db.backgroundTask.findMany({
      where: {
        status: 'RUNNING',
        startedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
      }
    });
    
    if (stuckTasks.length > 0) {
      console.log(`Found ${stuckTasks.length} stuck tasks, resetting them...`);
      
      await db.backgroundTask.updateMany({
        where: {
          status: 'RUNNING',
          startedAt: {
            lt: new Date(Date.now() - 10 * 60 * 1000)
          }
        },
        data: {
          status: 'PENDING',
          startedAt: null,
          processedItems: 0,
          failedItems: 0,
          percentage: 0
        }
      });
      
      console.log(`  ✅ Reset ${stuckTasks.length} stuck tasks`);
    }
    
    console.log(`🎉 Cleanup completed! Deleted ${deletedCount} duplicate tasks, reset ${stuckTasks.length} stuck tasks`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the cleanup
cleanupBackgroundTasks().catch(console.error); 