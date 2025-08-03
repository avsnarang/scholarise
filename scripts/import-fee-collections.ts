#!/usr/bin/env tsx

/**
 * Script to import fee collection data from CSV file
 * Only imports fees for existing fee heads in the database
 * Usage: npx tsx scripts/import-fee-collections.ts path/to/csv-file.csv
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CSVRow {
  'Invoice Id': string;
  'Transaction': string;
  'Payment': string;
  'Admission No': string;
  'Student Name': string;
  'Father Name': string;
  'Class': string;
  'Roll Number': string;
  'Fee Category': string;
  'Father Mobile': string;
  'Gender': string;
  'Head': string;
  'Term': string;
  'Amount': string;
  'Payment Mode': string;
  'Collected By': string;
  'Reference No.': string;
}

interface FeeCollectionInput {
  studentId: string;
  feeTermId: string;
  paymentMode: 'Cash' | 'Card' | 'Online' | 'Cheque' | 'DD' | 'Bank Transfer';
  transactionReference?: string;
  paymentDate: Date;
  notes?: string;
  items: Array<{
    feeHeadId: string;
    amount: number;
  }>;
}

// Payment mode mapping
const PAYMENT_MODE_MAP: Record<string, 'Cash' | 'Card' | 'Online' | 'Cheque' | 'DD' | 'Bank Transfer'> = {
  'Cash': 'Cash',
  'ONLINE': 'Online',
  'Wallet/UPI/QR': 'Online',
  'Credit/Debit Card': 'Card',
  'NEFT Payment': 'Bank Transfer',
  'Bank Transfer': 'Bank Transfer',
  'Cheque': 'Cheque',
  'DD': 'DD',
};

async function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: npx tsx scripts/import-fee-collections.ts path/to/csv-file.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Starting fee collection import...');
  console.log(`📄 Reading CSV file: ${csvFilePath}`);
  console.log('ℹ️  Note: Only importing fees for existing fee heads in database');

  // Read and parse CSV
  let csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Remove BOM if present (UTF-8 BOM: EF BB BF)
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }
  
  const allRecords: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Filter out completely empty records
  const records = allRecords.filter(record => {
    return record && Object.values(record).some(value => value && value.toString().trim().length > 0);
  });

  console.log(`📊 Found ${allRecords.length} raw records, ${records.length} valid records in CSV`);
  
  // Debug: show first few records
  console.log('Sample record structure:', Object.keys(records[0] || {}));
  if (records.length > 0 && records[0]) {
    console.log('First record:', {
      'Invoice Id': records[0]['Invoice Id'],
      'Admission No': records[0]['Admission No'],
      'Student Name': records[0]['Student Name'],
      'Head': records[0]['Head'],
    });
  }

  // Get branch and session info - you'll need to set these based on your system
  const defaultBranchId = await getDefaultBranch();
  const defaultSessionId = await getDefaultSession();

  if (!defaultBranchId || !defaultSessionId) {
    console.error('❌ Could not find default branch or session');
    process.exit(1);
  }

  console.log(`🏢 Using branch: ${defaultBranchId}`);
  console.log(`📅 Using session: ${defaultSessionId}`);

  try {
    // Step 1: Get existing fee heads
    console.log('\n📝 Loading existing fee heads...');
    const feeHeadMap = await getExistingFeeHeads(records, defaultBranchId, defaultSessionId);
    console.log(`✅ Found ${Object.keys(feeHeadMap).length} existing fee heads`);

    // Step 2: Create missing fee terms
    console.log('\n📅 Creating missing fee terms...');
    const feeTermMap = await createOrGetFeeTerms(records, defaultBranchId, defaultSessionId);
    console.log(`✅ Fee terms ready: ${Object.keys(feeTermMap).length} periods`);

    // Step 3: Map students by admission number
    console.log('\n👥 Mapping students by admission number...');
    const studentMap = await getStudentMap(records, defaultBranchId);
    console.log(`✅ Students mapped: ${Object.keys(studentMap).length} students`);

    // Step 4: Group records by invoice and transform data
    console.log('\n🔄 Transforming and grouping fee collection data...');
    const feeCollections = await transformCSVToFeeCollections(
      records,
      studentMap,
      feeHeadMap,
      feeTermMap
    );
    console.log(`✅ Fee collections prepared: ${feeCollections.length} collections`);

    // Step 5: Import fee collections in batches
    console.log('\n💾 Importing fee collections...');
    await importFeeCollections(feeCollections, defaultBranchId, defaultSessionId);

    console.log('\n🎉 Fee collection import completed successfully!');

  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function getDefaultBranch(): Promise<string | null> {
  const branch = await prisma.branch.findFirst({
    orderBy: { createdAt: 'asc' }
  });
  return branch?.id || null;
}

async function getDefaultSession(): Promise<string | null> {
  const session = await prisma.academicSession.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  return session?.id || null;
}

async function getExistingFeeHeads(
  records: CSVRow[],
  branchId: string,
  sessionId: string
): Promise<Record<string, string>> {
  const uniqueHeads = [...new Set(records.map(r => r.Head?.trim()).filter(Boolean))];
  console.log(`Fee heads in CSV: ${uniqueHeads.join(', ')}`);

  // Get all existing fee heads for this branch and session
  const existingFeeHeads = await prisma.feeHead.findMany({
    where: {
      branchId,
      sessionId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`Existing fee heads in database: ${existingFeeHeads.map(fh => fh.name).join(', ')}`);

  const feeHeadMap: Record<string, string> = {};

  // Map only existing fee heads
  for (const feeHead of existingFeeHeads) {
    if (uniqueHeads.includes(feeHead.name)) {
      feeHeadMap[feeHead.name] = feeHead.id;
    }
  }

  // Report missing fee heads
  const missingFeeHeads = uniqueHeads.filter(headName => !feeHeadMap[headName]);
  if (missingFeeHeads.length > 0) {
    console.warn(`⚠️  The following fee heads from CSV don't exist in database: ${missingFeeHeads.join(', ')}`);
    console.warn(`⚠️  Records with these fee heads will be skipped during import`);
  }

  return feeHeadMap;
}

async function createOrGetFeeTerms(
  records: CSVRow[],
  branchId: string,
  sessionId: string
): Promise<Record<string, string>> {
  const uniqueTerms = [...new Set(records.map(r => r.Term?.trim()).filter(Boolean))];
  console.log(`Found fee terms: ${uniqueTerms.join(', ')}`);

  const feeTermMap: Record<string, string> = {};

  for (const termName of uniqueTerms) {
    let feeTerm = await prisma.feeTerm.findFirst({
      where: {
        name: termName,
        branchId,
        sessionId,
      },
    });

    if (!feeTerm) {
      console.log(`Creating new fee term: ${termName}`);
      
      // Try to parse start and end dates from term name
      const { startDate, endDate } = parseTermDates(termName);
      
      feeTerm = await prisma.feeTerm.create({
        data: {
          name: termName,
          description: `Auto-created from CSV import`,
          startDate,
          endDate,
          dueDate: endDate,
          branchId,
          sessionId,
          isActive: true,
        },
      });
    }

    feeTermMap[termName] = feeTerm.id;
  }

  return feeTermMap;
}

function parseTermDates(termName: string): { startDate: Date; endDate: Date } {
  const currentYear = new Date().getFullYear();
  const monthMap: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  // Handle patterns like "July+August", "September+October", etc.
  const plusMatch = termName.match(/(\w+)\+(\w+)/);
  if (plusMatch && plusMatch.length >= 3) {
    const startMonth = plusMatch[1];
    const endMonth = plusMatch[2];
    const startMonthNum = startMonth ? monthMap[startMonth] : undefined;
    const endMonthNum = endMonth ? monthMap[endMonth] : undefined;
    
    if (startMonthNum !== undefined && endMonthNum !== undefined) {
      return {
        startDate: new Date(currentYear, startMonthNum, 1),
        endDate: new Date(currentYear, endMonthNum + 1, 0), // Last day of end month
      };
    }
  }

  // Handle single month
  const singleMonth = monthMap[termName];
  if (singleMonth !== undefined) {
    return {
      startDate: new Date(currentYear, singleMonth, 1),
      endDate: new Date(currentYear, singleMonth + 1, 0),
    };
  }

  // Default fallback
  return {
    startDate: new Date(currentYear, 0, 1),
    endDate: new Date(currentYear, 11, 31),
  };
}

async function getStudentMap(
  records: CSVRow[],
  branchId: string
): Promise<Record<string, string>> {
  const admissionNumbers = [...new Set(records.map(r => r['Admission No']?.trim()).filter(Boolean))];
  console.log(`Looking up ${admissionNumbers.length} unique admission numbers...`);

  const students = await prisma.student.findMany({
    where: {
      admissionNumber: { in: admissionNumbers },
      branchId,
      isActive: true,
    },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${students.length} students in database`);

  const studentMap: Record<string, string> = {};
  for (const student of students) {
    studentMap[student.admissionNumber] = student.id;
  }

  // Report missing students
  const missingAdmissions = admissionNumbers.filter(num => !studentMap[num]);
  if (missingAdmissions.length > 0) {
    console.warn(`⚠️  Missing students for admission numbers: ${missingAdmissions.join(', ')}`);
  }

  return studentMap;
}

async function transformCSVToFeeCollections(
  records: CSVRow[],
  studentMap: Record<string, string>,
  feeHeadMap: Record<string, string>,
  feeTermMap: Record<string, string>
): Promise<FeeCollectionInput[]> {
  // Group records by Invoice ID to combine multiple fee items into single collections
  const invoiceGroups: Record<string, CSVRow[]> = {};
  
  let skippedInvoiceIdCount = 0;
  
  for (const record of records) {
    const invoiceId = record['Invoice Id']?.trim();
    if (!invoiceId) {
      skippedInvoiceIdCount++;
      continue;
    }
    
    if (!invoiceGroups[invoiceId]) {
      invoiceGroups[invoiceId] = [];
    }
    invoiceGroups[invoiceId].push(record);
  }

  if (skippedInvoiceIdCount > 0) {
    console.warn(`⚠️  Skipped ${skippedInvoiceIdCount} records with missing Invoice Id`);
  }

  const feeCollections: FeeCollectionInput[] = [];

  for (const [invoiceId, invoiceRecords] of Object.entries(invoiceGroups)) {
    // Use the first record for shared data
    const firstRecord = invoiceRecords[0];
    if (!firstRecord) {
      console.warn(`⚠️  Skipping invoice ${invoiceId}: No records found`);
      continue;
    }
    
    const admissionNo = firstRecord['Admission No']?.trim();
    if (!admissionNo) {
      console.warn(`⚠️  Skipping invoice ${invoiceId}: Missing Admission No`);
      continue;
    }
    const studentId = studentMap[admissionNo];

    if (!studentId) {
      console.warn(`⚠️  Skipping invoice ${invoiceId}: Student not found for admission ${admissionNo}`);
      continue;
    }

    // Group by term within the invoice
    const termGroups: Record<string, CSVRow[]> = {};
    for (const record of invoiceRecords) {
      const term = record.Term?.trim();
      if (!term) {
        console.warn(`⚠️  Skipping record in invoice ${invoiceId}: Missing Term`);
        continue;
      }
      if (!termGroups[term]) {
        termGroups[term] = [];
      }
      termGroups[term].push(record);
    }

    // Create a fee collection for each term
    for (const [term, termRecords] of Object.entries(termGroups)) {
      const feeTermId = feeTermMap[term];
      if (!feeTermId) {
        console.warn(`⚠️  Skipping term ${term}: Fee term not found`);
        continue;
      }

      const paymentModeStr = firstRecord['Payment Mode']?.trim();
      const paymentMode = paymentModeStr ? (PAYMENT_MODE_MAP[paymentModeStr] || 'Cash') : 'Cash';
      const paymentDateStr = firstRecord.Payment;
      const paymentDate = paymentDateStr ? parseDate(paymentDateStr) : new Date();
      const transactionRef = firstRecord['Reference No.']?.trim() || undefined;

      const items = [];
      for (const record of termRecords) {
        const feeHeadName = record.Head?.trim();
        if (!feeHeadName) {
          console.warn(`⚠️  Skipping record in term ${term}: Missing Head`);
          continue;
        }
        
        const feeHeadId = feeHeadMap[feeHeadName];
        const amountStr = record.Amount;
        const amount = amountStr ? parseFloat(amountStr) : 0;

        if (feeHeadId && amount > 0) {
          items.push({
            feeHeadId,
            amount,
          });
        } else if (!feeHeadId && amount > 0) {
          console.warn(`⚠️  Skipping fee item for '${feeHeadName}' (₹${amount}) - fee head not found in database`);
        } else if (amount <= 0) {
          console.warn(`⚠️  Skipping fee item for '${feeHeadName}': Invalid amount (${amountStr})`);
        }
      }

      if (items.length > 0) {
        feeCollections.push({
          studentId,
          feeTermId,
          paymentMode,
          transactionReference: transactionRef,
          paymentDate,
          notes: `Imported from CSV - Invoice: ${invoiceId}`,
          items,
        });
      }
    }
  }

  return feeCollections;
}

function parseDate(dateStr: string): Date {
  // Handle DD-MM-YYYY format
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  // Fallback to current date
  return new Date();
}

async function importFeeCollections(
  collections: FeeCollectionInput[],
  branchId: string,
  sessionId: string
): Promise<void> {
  const batchSize = 10; // Process in smaller batches to avoid overwhelming the database
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < collections.length; i += batchSize) {
    const batch = collections.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(collections.length / batchSize)} (${batch.length} collections)...`);

    try {
      await prisma.$transaction(async (tx) => {
        for (const collection of batch) {
          const totalAmount = collection.items.reduce((sum, item) => sum + item.amount, 0);
          
          // Generate new format receipt number: TSH{Branch Code}/FIN/{Session Name}/000001
          const [branch, session] = await Promise.all([
            tx.branch.findUnique({
              where: { id: branchId },
              select: { code: true }
            }),
            tx.academicSession.findUnique({
              where: { id: sessionId },
              select: { name: true }
            })
          ]);

          if (!branch || !session) {
            throw new Error(`Branch or session not found for branchId: ${branchId}, sessionId: ${sessionId}`);
          }

          const branchCode = branch.code;
          const sessionName = session.name;
          const prefix = `TSH${branchCode}/FIN/${sessionName}/`;

          // Find the highest existing receipt number for this branch/session
          const lastReceipt = await tx.feeCollection.findFirst({
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
            nextNumber = 1;
          } else {
            const lastReceiptNumber = lastReceipt.receiptNumber;
            const numberPart = lastReceiptNumber.split('/').pop();
            const lastNumber = parseInt(numberPart || '0', 10);
            nextNumber = lastNumber + 1;
          }

          const paddedNumber = nextNumber.toString().padStart(6, '0');
          const receiptNumber = `${prefix}${paddedNumber}`;

          // Create fee collection
          const feeCollection = await tx.feeCollection.create({
            data: {
              studentId: collection.studentId,
              paymentMode: collection.paymentMode,
              transactionReference: collection.transactionReference,
              paymentDate: collection.paymentDate,
              notes: collection.notes,
              receiptNumber,
              totalAmount,
              paidAmount: totalAmount,
              branchId,
              sessionId,
              status: 'COMPLETED',
            },
          });

          // Create fee collection items
          await tx.feeCollectionItem.createMany({
            data: collection.items.map((item) => ({
              feeCollectionId: feeCollection.id,
              feeHeadId: item.feeHeadId,
              feeTermId: collection.feeTermId,
              amount: item.amount,
            })),
          });

          imported++;
        }
      });

      console.log(`✅ Batch completed successfully`);
    } catch (error) {
      console.error(`❌ Error processing batch: ${error}`);
      errors += batch.length;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`  ✅ Successfully imported: ${imported} collections`);
  console.log(`  ❌ Failed to import: ${errors} collections`);
  console.log(`  📈 Success rate: ${((imported / (imported + errors)) * 100).toFixed(1)}%`);
}

// Run the script if called directly
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});