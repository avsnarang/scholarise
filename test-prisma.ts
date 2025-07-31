import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test AutomationLog
async function test() {
  const logs = await prisma.automationLog.findMany();
  console.log(logs);
} 