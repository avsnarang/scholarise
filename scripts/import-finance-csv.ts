#!/usr/bin/env tsx

/**
 * Script to import finance data from Finance_5-8-25.csv
 * Usage: npx tsx scripts/import-finance-csv.ts AI/Finance_5-8-25.csv
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FinanceCSVRow {
  'Invoice Id': string;
  'Transaction': string;
  'Payment': string;
  'Time': string;
  'Admission No': string;
  'Student Name': string;
  'Head': string;
  'Term': string;
  'Amount': string;
  'Payment Mode': string;
  'Collected By': string;
  'Reference No.': string;
}

interface ProcessedCollection {
  invoiceId: string;
  studentId: string;
  transactionDate: Date;
  paymentDate: Date;
  paymentMode: string;
  transactionReference: string;
  collectedBy: string;
  items: Array<{
    feeHeadId: string;
    feeTermId: string;
    amount: number;
  }>;
  totalAmount: number;
}

// Payment mode mapping
const PAYMENT_MODE_MAP: Record<string, string> = {
  'Cash': 'Cash',
  'ONLINE': 'Online',
  'Wallet/UPI/QR': 'Online',
  'Credit/Debit Card': 'Card',
  'NEFT Payment': 'Bank Transfer',
  'Bank Transfer': 'Bank Transfer',
  'Cheque': 'Cheque',
  'DD': 'DD',
};

function normalizePaymentMode(mode: string): string {
  return PAYMENT_MODE_MAP[mode] || 'Cash';
}

function parseDate(dateStr: string): Date {
  // Input format appears to be "04-08-2025" (DD-MM-YYYY)
  const [day, month, year] = dateStr.split('-').map(Number);
  if (!day || !month || !year) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
}

async function getDefaultBranch(): Promise<string | null> {
  const branch = await prisma.branch.findFirst({
    orderBy: { order: 'asc' },
  });
  return branch?.id || null;
}

async function getDefaultSession(): Promise<string | null> {
  const session = await prisma.academicSession.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  });
  return session?.id || null;
}

async function getStudentMap(
  records: FinanceCSVRow[],
  branchId: string
): Promise<{ studentMap: Record<string, string>; detectedBranchId: string | null }> {
  const admissionNumbers = [...new Set(records.map(r => r['Admission No']?.trim()).filter(Boolean))];
  console.log(`Looking up ${admissionNumbers.length} unique admission numbers...`);

  const students = await prisma.student.findMany({
    where: {
      admissionNumber: { in: admissionNumbers },
      // Remove branch filter to find students across all branches
    },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      branchId: true,
    },
  });

  console.log(`Found ${students.length} students in database`);

  const studentMap: Record<string, string> = {};
  let detectedBranchId: string | null = null;
  
  for (const student of students) {
    studentMap[student.admissionNumber] = student.id;
    
    // Track the branch these students belong to
    if (!detectedBranchId) {
      detectedBranchId = student.branchId;
    }
  }

  // Report missing students
  const missingAdmissions = admissionNumbers.filter(num => !studentMap[num]);
  if (missingAdmissions.length > 0) {
    console.warn(`⚠️  Missing students for admission numbers: ${missingAdmissions.join(', ')}`);
  }

  if (detectedBranchId) {
    console.log(`🎯 Detected student branch: ${detectedBranchId}`);
  }

  return { studentMap, detectedBranchId };
}

async function createOrGetFeeHead(name: string, branchId: string, sessionId: string): Promise<string> {
  const existing = await prisma.feeHead.findFirst({
    where: {
      name,
      branchId,
      sessionId,
    },
  });

  if (existing) {
    return existing.id;
  }

  const newFeeHead = await prisma.feeHead.create({
    data: {
      name,
      branchId,
      sessionId,
      description: `Auto-created from import: ${name}`,
      isActive: true,
      studentType: 'BOTH',
    },
  });

  console.log(`Created fee head: ${name}`);
  return newFeeHead.id;
}

async function createOrGetFeeTerm(name: string, branchId: string, sessionId: string): Promise<string> {
  const existing = await prisma.feeTerm.findFirst({
    where: {
      name,
      branchId,
      sessionId,
    },
  });

  if (existing) {
    return existing.id;
  }

  // Parse term dates based on name
  const termDates = parseTermDates(name);
  
  const newFeeTerm = await prisma.feeTerm.create({
    data: {
      name,
      branchId,
      sessionId,
      description: `Auto-created from import: ${name}`,
      startDate: termDates.startDate,
      endDate: termDates.endDate,
      dueDate: termDates.endDate,
      isActive: true,
      order: getTermOrder(name),
    },
  });

  console.log(`Created fee term: ${name}`);
  return newFeeTerm.id;
}

function parseTermDates(termName: string): { startDate: Date; endDate: Date } {
  const currentYear = new Date().getFullYear();
  
  // Handle different term name formats
  if (termName.includes('April')) {
    return {
      startDate: new Date(currentYear, 3, 1), // April
      endDate: new Date(currentYear, 3, 30),
    };
  } else if (termName.includes('July') && termName.includes('August')) {
    return {
      startDate: new Date(currentYear, 6, 1), // July
      endDate: new Date(currentYear, 7, 31), // August
    };
  } else if (termName.includes('September') && termName.includes('October')) {
    return {
      startDate: new Date(currentYear, 8, 1), // September
      endDate: new Date(currentYear, 9, 31), // October
    };
  } else if (termName.includes('November')) {
    return {
      startDate: new Date(currentYear, 10, 1), // November
      endDate: new Date(currentYear, 10, 30),
    };
  }
  
  // Default dates
  return {
    startDate: new Date(currentYear, 0, 1),
    endDate: new Date(currentYear, 11, 31),
  };
}

function getTermOrder(termName: string): number {
  if (termName.includes('April')) return 1;
  if (termName.includes('July')) return 2;
  if (termName.includes('September')) return 3;
  if (termName.includes('November')) return 4;
  return 0;
}

async function processCSVRows(
  records: FinanceCSVRow[],
  studentMap: Record<string, string>,
  branchId: string,
  sessionId: string
): Promise<ProcessedCollection[]> {
  const collections: Map<string, ProcessedCollection> = new Map();
  
  console.log(`Processing ${records.length} CSV rows...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const row of records) {
    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`Processed ${processedCount}/${records.length} rows...`);
    }
    
    if (!row["Invoice Id"] || !row["Admission No"]) {
      console.warn(`Skipping row with missing Invoice ID or Admission No`);
      continue;
    }
    
    const studentId = studentMap[row["Admission No"]];
    if (!studentId) {
      skippedCount++;
      continue;
    }
    
    const amount = parseFloat(row["Amount"]);
    if (isNaN(amount)) {
      console.warn(`Invalid amount for invoice ${row["Invoice Id"]}: ${row["Amount"]}`);
      continue;
    }
    
    const feeHeadId = await createOrGetFeeHead(row["Head"], branchId, sessionId);
    const feeTermId = await createOrGetFeeTerm(row["Term"], branchId, sessionId);
    
    const invoiceId = row["Invoice Id"];
    
    if (!collections.has(invoiceId)) {
      collections.set(invoiceId, {
        invoiceId,
        studentId,
        transactionDate: parseDate(row["Transaction"]),
        paymentDate: parseDate(row["Payment"]),
        paymentMode: normalizePaymentMode(row["Payment Mode"]),
        transactionReference: row["Reference No."] || '',
        collectedBy: row["Collected By"] || 'system',
        items: [],
        totalAmount: 0,
      });
    }
    
    const collection = collections.get(invoiceId)!;
    collection.items.push({
      feeHeadId,
      feeTermId,
      amount,
    });
    collection.totalAmount += amount;
  }
  
  console.log(`\nProcessing complete:`);
  console.log(`- Total rows processed: ${processedCount}`);
  console.log(`- Students not found (skipped): ${skippedCount}`);
  console.log(`- Unique collections: ${collections.size}`);
  
  return Array.from(collections.values());
}

async function generateReceiptNumber(
  branchId: string, 
  sessionId: string, 
  invoiceId: string
): Promise<string> {
  // Get branch code
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  });
  
  // Get session name
  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
    select: { name: true },
  });
  
  if (!branch || !session) {
    throw new Error('Branch or session not found for receipt number generation');
  }
  
  // Format: TSH{Branch Code}/FIN/{Session Name}/{Invoice ID}
  return `TSH${branch.code}/FIN/${session.name}/${invoiceId}`;
}

async function importFeeCollections(
  collections: ProcessedCollection[],
  branchId: string,
  sessionId: string
): Promise<void> {
  console.log(`\nImporting ${collections.length} fee collections...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const collection of collections) {
    try {
      const receiptNumber = await generateReceiptNumber(branchId, sessionId, collection.invoiceId);
      
      await prisma.feeCollection.create({
        data: {
          receiptNumber,
          studentId: collection.studentId,
          totalAmount: collection.totalAmount,
          paidAmount: collection.totalAmount,
          paymentMode: collection.paymentMode,
          transactionReference: collection.transactionReference,
          paymentDate: collection.paymentDate,
          status: 'COMPLETED',
          branchId,
          sessionId,
          createdBy: collection.collectedBy,
          items: {
            create: collection.items.map(item => ({
              feeHeadId: item.feeHeadId,
              feeTermId: item.feeTermId,
              amount: item.amount,
            })),
          },
        },
      });
      
      successCount++;
      
      if (successCount % 10 === 0) {
        console.log(`Imported ${successCount}/${collections.length} collections...`);
      }
      
    } catch (error) {
      console.error(`Error importing collection ${collection.invoiceId}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`- Successfully imported: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);
}

async function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: npx tsx scripts/import-finance-csv.ts path/to/csv-file.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Starting finance data import...');
  console.log(`📄 Reading CSV file: ${csvFilePath}`);

  // Read and parse CSV
  let csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Remove BOM if present
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }
  
  const allRecords: FinanceCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Filter out completely empty records
  const records = allRecords.filter(record => {
    return record && Object.values(record).some(value => value && value.toString().trim().length > 0);
  });

  console.log(`📊 Found ${allRecords.length} raw records, ${records.length} valid records in CSV`);
  
  // Debug: show first record
  if (records.length > 0 && records[0]) {
    console.log('First record:', {
      'Invoice Id': records[0]['Invoice Id'],
      'Admission No': records[0]['Admission No'],
      'Student Name': records[0]['Student Name'],
      'Head': records[0]['Head'],
      'Term': records[0]['Term'],
      'Amount': records[0]['Amount'],
    });
  }

  // Get branch and session info
  const defaultBranchId = await getDefaultBranch();
  const defaultSessionId = await getDefaultSession();

  if (!defaultBranchId || !defaultSessionId) {
    console.error('❌ Could not find default branch or session');
    process.exit(1);
  }

  console.log(`🏢 Using branch: ${defaultBranchId}`);
  console.log(`📅 Using session: ${defaultSessionId}`);

  try {
    // Step 1: Map students by admission number
    console.log('\n👥 Mapping students by admission number...');
    const { studentMap, detectedBranchId } = await getStudentMap(records, defaultBranchId);
    console.log(`✅ Students mapped: ${Object.keys(studentMap).length} students`);

    // Use detected branch if available, otherwise fall back to default
    const targetBranchId = detectedBranchId || defaultBranchId;
    console.log(`🎯 Using branch: ${targetBranchId}`);

    // Step 2: Process CSV rows and create collections
    console.log('\n🔄 Processing CSV data...');
    const feeCollections = await processCSVRows(records, studentMap, targetBranchId, defaultSessionId);
    console.log(`✅ Fee collections prepared: ${feeCollections.length} collections`);

    // Step 3: Import fee collections
    console.log('\n💾 Importing fee collections to database...');
    await importFeeCollections(feeCollections, targetBranchId, defaultSessionId);

    console.log('\n🎉 Finance data import completed successfully!');

  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});