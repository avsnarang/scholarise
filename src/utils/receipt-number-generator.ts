import { PrismaClient } from '@prisma/client';

/**
 * Generate a new receipt number in the format: TSH{Branch Code}/FIN/{Session Name}/000001
 * @param prisma - Prisma client instance
 * @param branchId - Branch ID
 * @param sessionId - Session ID
 * @returns Promise<string> - The generated receipt number
 */
export async function generateReceiptNumber(
  prisma: PrismaClient,
  branchId: string,
  sessionId: string
): Promise<string> {
  // Get branch and session information
  const [branch, session] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      select: { code: true }
    }),
    prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { name: true }
    })
  ]);

  if (!branch) {
    throw new Error(`Branch not found for ID: ${branchId}`);
  }

  if (!session) {
    throw new Error(`Session not found for ID: ${sessionId}`);
  }

  const branchCode = branch.code;
  const sessionName = session.name;
  const prefix = `TSH${branchCode}/FIN/${sessionName}/`;

  // Find the highest existing receipt number for this branch/session with the new format
  const lastReceipt = await prisma.feeCollection.findFirst({
    where: {
      branchId,
      sessionId,
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: 'desc'
    },
    select: {
      receiptNumber: true
    }
  });

  let nextNumber: number;
  if (!lastReceipt) {
    // This is the first receipt for this branch/session with new format
    nextNumber = 1;
  } else {
    // Extract the number from the last receipt number
    const lastReceiptNumber = lastReceipt.receiptNumber;
    const numberPart = lastReceiptNumber.split('/').pop(); // Get the last part after final '/'
    const lastNumber = parseInt(numberPart || '0', 10);
    nextNumber = lastNumber + 1;
  }

  // Format as 6-digit number with leading zeros
  const paddedNumber = nextNumber.toString().padStart(6, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Convert old receipt number format to new format
 * @param oldReceiptNumber - Old format receipt number (e.g., RCP-202412-MAJ-0001)
 * @param branchCode - Branch code
 * @param sessionName - Session name
 * @returns string - New format receipt number
 */
export function convertOldReceiptNumber(
  oldReceiptNumber: string,
  branchCode: string,
  sessionName: string
): string {
  // Extract the sequence number from old format
  // Old format: RCP-202412-MAJ-0001
  const parts = oldReceiptNumber.split('-');
  const sequenceNumber = parts[parts.length - 1] || '000001';
  
  // Ensure it's 6 digits
  const paddedNumber = sequenceNumber.padStart(6, '0');
  
  return `TSH${branchCode}/FIN/${sessionName}/${paddedNumber}`;
}