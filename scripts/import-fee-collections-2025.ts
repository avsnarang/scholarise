import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface CSVRow {
  "Invoice Id": string;
  "Transaction": string;
  "Payment": string;
  "Admission No": string;
  "Student Name": string;
  "Head": string;
  "Term": string;
  "Amount": string;
  "Payment Mode": string;
}

interface ProcessedCollection {
  invoiceId: string;
  studentId: string;
  transactionDate: Date;
  paymentDate: Date;
  paymentMode: string;
  studentName: string;
  items: Array<{
    feeHeadId: string;
    feeHeadName: string;
    feeTermId: string;
    feeTermName: string;
    amount: number;
  }>;
  totalAmount: number;
}

// Utility function to parse DD-MM-YYYY date format
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    return new Date();
  }
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return new Date();
  }
  
  const day = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  const year = parseInt(parts[2]!, 10);
  
  return new Date(year, month - 1, day); // month is 0-indexed in JS Date
}

// Utility function to normalize payment mode
function normalizePaymentMode(paymentMode: string): string {
  const normalized = paymentMode.trim();
  
  // Map various payment modes to standardized ones
  const paymentModeMap: Record<string, string> = {
    'Cash': 'Cash',
    'Credit/Debit Card': 'Card', 
    'ONLINE': 'Online',
    'Wallet/UPI/QR': 'Online',
    'NEFT Payment': 'Bank Transfer',
    'Cheque': 'Cheque',
    'DD': 'DD',
  };
  
  return paymentModeMap[normalized] || normalized;
}

// Get current active academic session
async function getCurrentSession(): Promise<{ id: string; name: string }> {
  const session = await prisma.academicSession.findFirst({
    where: {
      isActive: true,
    },
  });
  
  if (!session) {
    throw new Error("No active academic session found. Please set an active session first.");
  }
  
  return session;
}

// Get default branch (first branch or you can modify this logic)
async function getDefaultBranch(): Promise<{ id: string; name: string }> {
  const branch = await prisma.branch.findFirst({
    orderBy: { order: 'asc' },
  });
  
  if (!branch) {
    throw new Error("No branch found in the system.");
  }
  
  return branch;
}

// Read and parse CSV file
function readCSV(): CSVRow[] {
  const csvPath = path.join(__dirname, '..', 'AI', 'feeCollection_02-08-2025.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = csvContent.split('\n');
  const headers = lines[0]!.split(',');
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    
    const values = line.split(',');
    if (values.length !== headers.length) continue;
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}





// Process CSV rows into collections grouped by invoice ID using batch processing
async function processCSVRows(rows: CSVRow[], branchId: string, sessionId: string): Promise<ProcessedCollection[]> {
  const collections: Map<string, ProcessedCollection> = new Map();
  const BATCH_SIZE = 100;
  
  console.log(`Processing ${rows.length} CSV rows in batches of ${BATCH_SIZE}...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  const skippedStudents = new Set<string>();
  const missingFeeHeads = new Set<string>();
  const missingFeeTerms = new Set<string>();
  
  // Cache fee heads and fee terms to avoid repeated database queries
  const feeHeadCache = new Map<string, string>();
  const feeTermCache = new Map<string, string>();
  
  // Pre-load all fee heads and terms for this session/branch
  console.log('Pre-loading fee heads and terms...');
  const feeHeads = await prisma.feeHead.findMany({
    where: { branchId, sessionId, isActive: true },
    select: { id: true, name: true }
  });
  
  const feeTerms = await prisma.feeTerm.findMany({
    where: { branchId, sessionId, isActive: true },
    select: { id: true, name: true }
  });
  
  feeHeads.forEach(head => feeHeadCache.set(head.name, head.id));
  feeTerms.forEach(term => feeTermCache.set(term.name, term.id));
  
  console.log(`Cached ${feeHeads.length} fee heads and ${feeTerms.length} fee terms`);
  
  // Process rows in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} rows)...`);
    
    // Get unique admission numbers in this batch
    const admissionNumbers = [...new Set(batch.map(row => row["Admission No"]).filter(Boolean))];
    
    // Batch query for students
    const students = await prisma.student.findMany({
      where: {
        admissionNumber: { in: admissionNumbers }
      },
      select: { id: true, admissionNumber: true }
    });
    
    const studentMap = new Map(students.map(s => [s.admissionNumber, s.id]));
    
    // Process each row in the batch
    for (const row of batch) {
      processedCount++;
      
      if (!row["Invoice Id"] || !row["Admission No"]) {
        skippedCount++;
        continue;
      }
      
      const studentId = studentMap.get(row["Admission No"]);
      if (!studentId) {
        skippedStudents.add(row["Admission No"]);
        skippedCount++;
        continue;
      }
      
      const amount = parseFloat(row["Amount"]);
      if (isNaN(amount)) {
        skippedCount++;
        continue;
      }
      
      const feeHeadId = feeHeadCache.get(row["Head"]);
      const feeTermId = feeTermCache.get(row["Term"]);
      
      // Skip if fee head or fee term not found
      if (!feeHeadId || !feeTermId) {
        if (!feeHeadId) missingFeeHeads.add(row["Head"]);
        if (!feeTermId) missingFeeTerms.add(row["Term"]);
        skippedCount++;
        continue;
      }
      
      const invoiceId = row["Invoice Id"];
      
      if (!collections.has(invoiceId)) {
        collections.set(invoiceId, {
          invoiceId,
          studentId,
          transactionDate: parseDate(row["Transaction"]),
          paymentDate: parseDate(row["Payment"]),
          paymentMode: normalizePaymentMode(row["Payment Mode"]),
          studentName: row["Student Name"],
          items: [],
          totalAmount: 0,
        });
      }
      
      const collection = collections.get(invoiceId)!;
      collection.items.push({
        feeHeadId,
        feeHeadName: row["Head"],
        feeTermId,
        feeTermName: row["Term"],
        amount,
      });
      collection.totalAmount += amount;
    }
    
    console.log(`  Batch ${batchNumber} complete - Collections so far: ${collections.size}`);
  }
  
  console.log(`\nProcessing complete:`);
  console.log(`- Total rows processed: ${processedCount}`);
  console.log(`- Rows skipped (various reasons): ${skippedCount}`);
  console.log(`- Students not found: ${skippedStudents.size}`);
  console.log(`- Missing fee heads: ${missingFeeHeads.size}`);
  console.log(`- Missing fee terms: ${missingFeeTerms.size}`);
  console.log(`- Valid collections created: ${collections.size}`);
  
  if (skippedStudents.size > 0) {
    console.log(`\nSkipped admission numbers (first 10):`, Array.from(skippedStudents).slice(0, 10));
  }
  
  if (missingFeeHeads.size > 0) {
    console.log(`\nMissing fee heads:`, Array.from(missingFeeHeads).sort());
  }
  
  if (missingFeeTerms.size > 0) {
    console.log(`\nMissing fee terms:`, Array.from(missingFeeTerms).sort());
  }
  
  return Array.from(collections.values());
}

// Create fee collections in database using batch processing
async function createFeeCollections(collections: ProcessedCollection[], branchId: string, sessionId: string): Promise<void> {
  console.log(`Creating ${collections.length} fee collections in batches...`);
  
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  
  // Check for existing collections in batches to avoid duplicates
  console.log('Checking for existing collections...');
  const existingReceiptNumbers = new Set<string>();
  
  for (let i = 0; i < collections.length; i += BATCH_SIZE) {
    const batch = collections.slice(i, i + BATCH_SIZE);
    const receiptNumbers = batch.map(c => c.invoiceId);
    
    const existing = await prisma.feeCollection.findMany({
      where: {
        receiptNumber: { in: receiptNumbers }
      },
      select: { receiptNumber: true }
    });
    
    existing.forEach(rec => existingReceiptNumbers.add(rec.receiptNumber));
  }
  
  console.log(`Found ${existingReceiptNumbers.size} existing collections to skip`);
  
  // Filter out existing collections
  const newCollections = collections.filter(c => !existingReceiptNumbers.has(c.invoiceId));
  duplicateCount = collections.length - newCollections.length;
  
  console.log(`Processing ${newCollections.length} new collections...`);
  
  // Process collections in batches
  for (let i = 0; i < newCollections.length; i += BATCH_SIZE) {
    const batch = newCollections.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newCollections.length / BATCH_SIZE);
    
    console.log(`Creating batch ${batchNumber}/${totalBatches} (${batch.length} collections)...`);
    
    try {
      await prisma.$transaction(async (tx) => {
        // Create all fee collections in this batch
        const createdCollections = await Promise.all(
          batch.map(collection => 
            tx.feeCollection.create({
              data: {
                receiptNumber: collection.invoiceId,
                studentId: collection.studentId,
                totalAmount: collection.totalAmount,
                paidAmount: collection.totalAmount,
                paymentMode: collection.paymentMode,
                paymentDate: collection.paymentDate,
                notes: `Imported from CSV data. Student: ${collection.studentName}`,
                status: "COMPLETED",
                branchId: branchId,
                sessionId: sessionId,
              },
            })
          )
        );
        
        // Create all fee collection items for this batch
        const allItems = [];
        for (let j = 0; j < batch.length; j++) {
          const collection = batch[j]!;
          const feeCollection = createdCollections[j]!;
          
          for (const item of collection.items) {
            allItems.push({
              feeCollectionId: feeCollection.id,
              feeHeadId: item.feeHeadId,
              feeTermId: item.feeTermId,
              amount: item.amount,
            });
          }
        }
        
        if (allItems.length > 0) {
          await tx.feeCollectionItem.createMany({
            data: allItems,
          });
        }
      });
      
      successCount += batch.length;
      console.log(`  Batch ${batchNumber} completed successfully`);
      
    } catch (error) {
      console.error(`Error creating batch ${batchNumber}:`, error);
      errorCount += batch.length;
    }
  }
  
  console.log(`\nImport completed:`);
  console.log(`- Successful imports: ${successCount}`);
  console.log(`- Duplicates skipped: ${duplicateCount}`);
  console.log(`- Errors: ${errorCount}`);
}

// Main import function
async function importFeeCollections() {
  try {
    console.log('Starting fee collection import...');
    
    // Get current session and branch
    const session = await getCurrentSession();
    const branch = await getDefaultBranch();
    
    console.log(`Using Session: ${session.name} (${session.id})`);
    console.log(`Using Branch: ${branch.name} (${branch.id})`);
    
    // Read CSV file
    const csvRows = readCSV();
    console.log(`Read ${csvRows.length} rows from CSV`);
    
    // Process rows into collections
    const collections = await processCSVRows(csvRows, branch.id, session.id);
    console.log(`Processed into ${collections.length} unique collections`);
    
    // Create fee collections in database
    await createFeeCollections(collections, branch.id, session.id);
    
    console.log('Fee collection import completed successfully!');
    
  } catch (error) {
    console.error('Error during fee collection import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importFeeCollections()
  .then(() => {
    console.log('Import script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import script failed:', error);
    process.exit(1);
  });

export { importFeeCollections };