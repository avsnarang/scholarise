import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const BRANCH_ID = "cmbdk8dd9000w7ip2rpxsd5rr";
const SESSION_ID = "cmbdk90xz000x7ip2ido648y3";

interface CSVRow {
  "Invoice Id": string;
  "Transaction": string;
  "Payment": string;
  "Admission No": string;
  "Student Name": string;
  "Father Name": string;
  "Class": string;
  "Roll Number": string;
  "Fee Category": string;
  "Father Mobile": string;
  "Gender": string;
  "Head": string;
  "Term": string;
  "Amount": string;
  "Payment Mode": string;
  "Collected By": string;
  "Reference No.": string;
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
    'Payment Gateway': 'Online',
    'Wallet/UPI/QR': 'Online',
    'NEFT Payment': 'Bank Transfer',
    'Cheque': 'Cheque',
    'DD': 'DD',
  };
  
  return paymentModeMap[normalized] || 'Cash';
}

// Utility function to map collector names to user IDs
function getCollectorUserId(collectorName: string): string | null {
  const normalized = collectorName.trim().toLowerCase();
  
  // Map collector names to actual user IDs in the database
  const collectorMap: Record<string, string> = {
    'amit': 'cmd3fp3ok00027ifwvb3nbrat',
    'inderjeet': 'cmd3fq0hm00037ifw68pdxd2t',
    'inderjeet kaur': 'cmd3fq0hm00037ifw68pdxd2t',
  };
  
  return collectorMap[normalized] || null;
}

// Read and parse CSV file
function readCSV(): CSVRow[] {
  const csvPath = path.join(__dirname, '..', 'AI', 'collection-reports-fee-heads.csv');
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

// Create or get fee head
async function createOrGetFeeHead(feeHeadName: string): Promise<string> {
  const existing = await prisma.feeHead.findFirst({
    where: {
      name: feeHeadName,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    },
  });
  
  if (existing) {
    return existing.id;
  }
  
  const newFeeHead = await prisma.feeHead.create({
    data: {
      name: feeHeadName,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
      isSystemDefined: false,
      studentType: "BOTH",
    },
  });
  
  console.log(`Created fee head: ${feeHeadName}`);
  return newFeeHead.id;
}

// Create or get fee term
async function createOrGetFeeTerm(feeTermName: string): Promise<string> {
  const existing = await prisma.feeTerm.findFirst({
    where: {
      name: feeTermName,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    },
  });
  
  if (existing) {
    return existing.id;
  }
  
  // For terms like "May+June", "July+August", we'll set appropriate date ranges
  let startDate = new Date(2025, 3, 1); // April 1, 2025 (default)
  let endDate = new Date(2025, 5, 30); // June 30, 2025 (default)
  let dueDate = new Date(2025, 5, 30); // June 30, 2025 (default)
  
  if (feeTermName.includes('April')) {
    startDate = new Date(2025, 3, 1); // April 1
    endDate = new Date(2025, 3, 30); // April 30
    dueDate = new Date(2025, 3, 30);
  } else if (feeTermName.includes('May') && feeTermName.includes('June')) {
    startDate = new Date(2025, 4, 1); // May 1
    endDate = new Date(2025, 5, 30); // June 30
    dueDate = new Date(2025, 5, 30);
  } else if (feeTermName.includes('July') && feeTermName.includes('August')) {
    startDate = new Date(2025, 6, 1); // July 1
    endDate = new Date(2025, 7, 31); // August 31
    dueDate = new Date(2025, 7, 31);
  } else if (feeTermName.includes('September') && feeTermName.includes('October')) {
    startDate = new Date(2025, 8, 1); // September 1
    endDate = new Date(2025, 9, 31); // October 31
    dueDate = new Date(2025, 9, 31);
  } else if (feeTermName.includes('November')) {
    startDate = new Date(2025, 10, 1); // November 1
    endDate = new Date(2025, 10, 30); // November 30
    dueDate = new Date(2025, 10, 30);
  } else if (feeTermName.includes('December') && feeTermName.includes('January')) {
    startDate = new Date(2025, 11, 1); // December 1
    endDate = new Date(2026, 0, 31); // January 31
    dueDate = new Date(2026, 0, 31);
  } else if (feeTermName.includes('February') && feeTermName.includes('March')) {
    startDate = new Date(2026, 1, 1); // February 1
    endDate = new Date(2026, 2, 31); // March 31
    dueDate = new Date(2026, 2, 31);
  }
  
  const newFeeTerm = await prisma.feeTerm.create({
    data: {
      name: feeTermName,
      startDate,
      endDate,
      dueDate,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    },
  });
  
  console.log(`Created fee term: ${feeTermName}`);
  return newFeeTerm.id;
}

// Get student by admission number
async function getStudentByAdmissionNumber(admissionNumber: string): Promise<string | null> {
  const student = await prisma.student.findUnique({
    where: {
      admissionNumber: admissionNumber,
    },
  });
  
  return student?.id || null;
}

// Process CSV rows into collections grouped by invoice ID
async function processCSVRows(rows: CSVRow[]): Promise<ProcessedCollection[]> {
  const collections: Map<string, ProcessedCollection> = new Map();
  
  console.log(`Processing ${rows.length} CSV rows...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const row of rows) {
    processedCount++;
    if (processedCount % 1000 === 0) {
      console.log(`Processed ${processedCount}/${rows.length} rows...`);
    }
    if (!row["Invoice Id"] || !row["Admission No"]) {
      console.warn(`Skipping row with missing Invoice ID or Admission No: ${JSON.stringify(row)}`);
      continue;
    }
    
    const studentId = await getStudentByAdmissionNumber(row["Admission No"]);
    if (!studentId) {
      skippedCount++;
      continue;
    }
    
    const amount = parseFloat(row["Amount"]);
    if (isNaN(amount)) {
      console.warn(`Invalid amount for invoice ${row["Invoice Id"]}: ${row["Amount"]}`);
      continue;
    }
    
    const feeHeadId = await createOrGetFeeHead(row["Head"]);
    const feeTermId = await createOrGetFeeTerm(row["Term"]);
    
    const invoiceId = row["Invoice Id"];
    
    if (!collections.has(invoiceId)) {
      collections.set(invoiceId, {
        invoiceId,
        studentId,
        transactionDate: parseDate(row["Transaction"]),
        paymentDate: parseDate(row["Payment"]),
        paymentMode: normalizePaymentMode(row["Payment Mode"]),
        transactionReference: row["Reference No."] || '',
        collectedBy: getCollectorUserId(row["Collected By"]) || 'system',
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
  
  console.log(`\nProcessing complete:`);
  console.log(`- Total rows processed: ${processedCount}`);
  console.log(`- Students not found (skipped): ${skippedCount}`);
  console.log(`- Valid collections created: ${collections.size}`);
  
  return Array.from(collections.values());
}

// Create fee collections in database
async function createFeeCollections(collections: ProcessedCollection[]): Promise<void> {
  console.log(`Creating ${collections.length} fee collections...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const collection of collections) {
    try {
      // Check if this collection already exists (by invoice ID or unique characteristics)
      const existingCollection = await prisma.feeCollection.findFirst({
        where: {
          studentId: collection.studentId,
          paymentDate: collection.paymentDate,
          totalAmount: collection.totalAmount,
          branchId: BRANCH_ID,
          sessionId: SESSION_ID,
        },
      });
      
      if (existingCollection) {
        console.log(`Skipping duplicate collection for invoice ${collection.invoiceId}`);
        continue;
      }
      
      // Group items by fee term for proper fee collection structure
      const itemsByTerm = collection.items.reduce((acc, item) => {
        if (!acc[item.feeTermId]) {
          acc[item.feeTermId] = [];
        }
        acc[item.feeTermId]!.push(item);
        return acc;
      }, {} as Record<string, typeof collection.items>);
      
      // Create a fee collection for each term (if there are items from multiple terms)
      for (const [feeTermId, items] of Object.entries(itemsByTerm)) {
        const termTotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        
        const receiptNumber = `IMP-${collection.invoiceId}-${feeTermId.slice(-6)}`;
        
        await prisma.$transaction(async (tx) => {
          // Create fee collection
          const feeCollection = await tx.feeCollection.create({
            data: {
              receiptNumber,
              studentId: collection.studentId,
              feeTermId,
              totalAmount: termTotalAmount,
              paidAmount: termTotalAmount,
              paymentMode: collection.paymentMode,
              transactionReference: collection.transactionReference,
              paymentDate: collection.paymentDate,
              notes: `Imported from legacy system. Original Invoice ID: ${collection.invoiceId}`,
              status: "COMPLETED",
              branchId: BRANCH_ID,
              sessionId: SESSION_ID,
              createdBy: collection.collectedBy,
            },
          });
          
          // Create fee collection items
          await tx.feeCollectionItem.createMany({
            data: items.map((item) => ({
              feeCollectionId: feeCollection.id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            })),
          });
        });
        
        successCount++;
      }
      
    } catch (error) {
      console.error(`Error creating collection for invoice ${collection.invoiceId}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Import completed: ${successCount} successful, ${errorCount} errors`);
}

// Main import function
async function importFeeHistory() {
  try {
    console.log('Starting fee history import...');
    console.log(`Branch ID: ${BRANCH_ID}`);
    console.log(`Session ID: ${SESSION_ID}`);
    
    // Read CSV file
    const csvRows = readCSV();
    console.log(`Read ${csvRows.length} rows from CSV`);
    
    // Process rows into collections
    const collections = await processCSVRows(csvRows);
    console.log(`Processed into ${collections.length} unique collections`);
    
    // Create fee collections in database
    await createFeeCollections(collections);
    
    console.log('Fee history import completed successfully!');
    
  } catch (error) {
    console.error('Error during fee history import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importFeeHistory()
  .then(() => {
    console.log('Import script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import script failed:', error);
    process.exit(1);
  });

export { importFeeHistory }; 