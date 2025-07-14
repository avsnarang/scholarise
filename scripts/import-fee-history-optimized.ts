import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const BRANCH_ID = "cmbdk8dd9000w7ip2rpxsd5rr";
const SESSION_ID = "cmbdk90xz000x7ip2ido648y3";
const BATCH_SIZE = 1000; // Process in batches

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

// In-memory caches to avoid repeated database queries
const studentCache = new Map<string, string>(); // admissionNumber -> studentId
const feeHeadCache = new Map<string, string>(); // feeHeadName -> feeHeadId
const feeTermCache = new Map<string, string>(); // feeTermName -> feeTermId

// Utility function to parse DD-MM-YYYY date format
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    return new Date();
  }
  
  const parts = dateStr.split('-').map(num => parseInt(num, 10));
  const [day = 1, month = 1, year = new Date().getFullYear()] = parts;
  return new Date(year, month - 1, day);
}

// Utility function to normalize payment mode
function normalizePaymentMode(paymentMode: string): string {
  const normalized = paymentMode.trim();
  
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

// Pre-load all students into cache - SINGLE QUERY
async function preloadStudents(): Promise<void> {
  console.log('Pre-loading all students...');
  
  const students = await prisma.student.findMany({
    select: {
      id: true,
      admissionNumber: true,
    },
  });
  
  students.forEach(student => {
    studentCache.set(student.admissionNumber, student.id);
  });
  
  console.log(`Loaded ${students.length} students into cache`);
}

// Pre-load existing fee heads into cache - SINGLE QUERY
async function preloadFeeHeads(): Promise<void> {
  console.log('Pre-loading existing fee heads...');
  
  const feeHeads = await prisma.feeHead.findMany({
    where: {
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  feeHeads.forEach(feeHead => {
    feeHeadCache.set(feeHead.name, feeHead.id);
  });
  
  console.log(`Loaded ${feeHeads.length} fee heads into cache`);
}

// Pre-load existing fee terms into cache - SINGLE QUERY
async function preloadFeeTerms(): Promise<void> {
  console.log('Pre-loading existing fee terms...');
  
  const feeTerms = await prisma.feeTerm.findMany({
    where: {
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  feeTerms.forEach(feeTerm => {
    feeTermCache.set(feeTerm.name, feeTerm.id);
  });
  
  console.log(`Loaded ${feeTerms.length} fee terms into cache`);
}

// Create missing fee heads in batch - SINGLE QUERY
async function createMissingFeeHeads(uniqueFeeHeadNames: Set<string>): Promise<void> {
  const missingFeeHeads = Array.from(uniqueFeeHeadNames).filter(name => !feeHeadCache.has(name));
  
  if (missingFeeHeads.length === 0) {
    console.log('No missing fee heads to create');
    return;
  }
  
  console.log(`Creating ${missingFeeHeads.length} missing fee heads...`);
  
  const newFeeHeads = await prisma.feeHead.createManyAndReturn({
    data: missingFeeHeads.map(name => ({
      name,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
      isSystemDefined: false,
      studentType: "BOTH" as const,
    })),
  });
  
  // Update cache
  newFeeHeads.forEach(feeHead => {
    feeHeadCache.set(feeHead.name, feeHead.id);
  });
  
  console.log(`Created ${newFeeHeads.length} new fee heads`);
}

// Create missing fee terms in batch - SINGLE QUERY
async function createMissingFeeTerms(uniqueFeeTermNames: Set<string>): Promise<void> {
  const missingFeeTerms = Array.from(uniqueFeeTermNames).filter(name => !feeTermCache.has(name));
  
  if (missingFeeTerms.length === 0) {
    console.log('No missing fee terms to create');
    return;
  }
  
  console.log(`Creating ${missingFeeTerms.length} missing fee terms...`);
  
  const feeTermsData = missingFeeTerms.map(feeTermName => {
    // For terms like "May+June", "July+August", we'll set appropriate date ranges
    let startDate = new Date(2025, 3, 1); // April 1, 2025 (default)
    let endDate = new Date(2025, 5, 30); // June 30, 2025 (default)
    let dueDate = new Date(2025, 5, 30); // June 30, 2025 (default)
    
    if (feeTermName.includes('April')) {
      startDate = new Date(2025, 3, 1);
      endDate = new Date(2025, 3, 30);
      dueDate = new Date(2025, 3, 30);
    } else if (feeTermName.includes('May') && feeTermName.includes('June')) {
      startDate = new Date(2025, 4, 1);
      endDate = new Date(2025, 5, 30);
      dueDate = new Date(2025, 5, 30);
    } else if (feeTermName.includes('July') && feeTermName.includes('August')) {
      startDate = new Date(2025, 6, 1);
      endDate = new Date(2025, 7, 31);
      dueDate = new Date(2025, 7, 31);
    } else if (feeTermName.includes('September') && feeTermName.includes('October')) {
      startDate = new Date(2025, 8, 1);
      endDate = new Date(2025, 9, 31);
      dueDate = new Date(2025, 9, 31);
    } else if (feeTermName.includes('November')) {
      startDate = new Date(2025, 10, 1);
      endDate = new Date(2025, 10, 30);
      dueDate = new Date(2025, 10, 30);
    } else if (feeTermName.includes('December') && feeTermName.includes('January')) {
      startDate = new Date(2025, 11, 1);
      endDate = new Date(2026, 0, 31);
      dueDate = new Date(2026, 0, 31);
    } else if (feeTermName.includes('February') && feeTermName.includes('March')) {
      startDate = new Date(2026, 1, 1);
      endDate = new Date(2026, 2, 31);
      dueDate = new Date(2026, 2, 31);
    }
    
    return {
      name: feeTermName,
      startDate,
      endDate,
      dueDate,
      branchId: BRANCH_ID,
      sessionId: SESSION_ID,
    };
  });
  
  const newFeeTerms = await prisma.feeTerm.createManyAndReturn({
    data: feeTermsData,
  });
  
  // Update cache
  newFeeTerms.forEach(feeTerm => {
    feeTermCache.set(feeTerm.name, feeTerm.id);
  });
  
  console.log(`Created ${newFeeTerms.length} new fee terms`);
}

// Process CSV rows into collections - NO DATABASE QUERIES HERE
function processCSVRows(rows: CSVRow[]): ProcessedCollection[] {
  const collections: Map<string, ProcessedCollection> = new Map();
  
  console.log(`Processing ${rows.length} CSV rows...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const row of rows) {
    processedCount++;
    if (processedCount % 10000 === 0) {
      console.log(`Processed ${processedCount}/${rows.length} rows...`);
    }
    
    if (!row["Invoice Id"] || !row["Admission No"]) {
      console.warn(`Skipping row with missing Invoice ID or Admission No`);
      continue;
    }
    
    // Use cache instead of database query
    const studentId = studentCache.get(row["Admission No"]);
    if (!studentId) {
      skippedCount++;
      continue;
    }
    
    const amount = parseFloat(row["Amount"]);
    if (isNaN(amount)) {
      console.warn(`Invalid amount for invoice ${row["Invoice Id"]}: ${row["Amount"]}`);
      continue;
    }
    
    // Use cache instead of database queries
    const feeHeadId = feeHeadCache.get(row["Head"]);
    const feeTermId = feeTermCache.get(row["Term"]);
    
    if (!feeHeadId || !feeTermId) {
      console.warn(`Missing fee head or term for: ${row["Head"]} / ${row["Term"]}`);
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

// Create fee collections in batch - DRAMATICALLY REDUCED QUERIES
async function createFeeCollections(collections: ProcessedCollection[]): Promise<void> {
  console.log(`Creating ${collections.length} fee collections in batches...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Smaller batch size to avoid transaction timeouts
  const TRANSACTION_BATCH_SIZE = 50;
  
  // Process in smaller batches to avoid transaction timeouts
  for (let i = 0; i < collections.length; i += TRANSACTION_BATCH_SIZE) {
    const batch = collections.slice(i, i + TRANSACTION_BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / TRANSACTION_BATCH_SIZE) + 1}/${Math.ceil(collections.length / TRANSACTION_BATCH_SIZE)}`);
    
    try {
      // Pre-check for existing collections OUTSIDE of transaction
      const existingCollections = await prisma.feeCollection.findMany({
        where: {
          OR: batch.map(collection => ({
            studentId: collection.studentId,
            paymentDate: collection.paymentDate,
            totalAmount: collection.totalAmount,
            branchId: BRANCH_ID,
            sessionId: SESSION_ID,
          }))
        },
        select: {
          studentId: true,
          paymentDate: true,
          totalAmount: true,
        }
      });
      
      // Create a set for quick lookup of existing collections
      const existingCollectionKeys = new Set(
        existingCollections.map(c => `${c.studentId}-${c.paymentDate.toISOString()}-${c.totalAmount}`)
      );
      
      // Filter out collections that already exist
      const newCollections = batch.filter(collection => {
        const key = `${collection.studentId}-${collection.paymentDate.toISOString()}-${collection.totalAmount}`;
        return !existingCollectionKeys.has(key);
      });
      
      if (newCollections.length === 0) {
        console.log(`All collections in batch already exist, skipping...`);
        continue;
      }
      
      console.log(`Creating ${newCollections.length} new collections (${batch.length - newCollections.length} duplicates skipped)`);
      
      // Now process the new collections in a transaction
      await prisma.$transaction(async (tx) => {
        const feeCollectionsToCreate: any[] = [];
        const feeCollectionItemsToCreate: any[] = [];
        
        for (const collection of newCollections) {
          // Group items by fee term
          const itemsByTerm = collection.items.reduce((acc, item) => {
            if (!acc[item.feeTermId]) {
              acc[item.feeTermId] = [];
            }
            acc[item.feeTermId]!.push(item);
            return acc;
          }, {} as Record<string, typeof collection.items>);
          
          // Create a fee collection for each term
          for (const [feeTermId, items] of Object.entries(itemsByTerm)) {
            const termTotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            const receiptNumber = `IMP-${collection.invoiceId}-${feeTermId.slice(-6)}`;
            
            const feeCollectionData = {
              receiptNumber,
              studentId: collection.studentId,
              feeTermId,
              totalAmount: termTotalAmount,
              paidAmount: termTotalAmount,
              paymentMode: collection.paymentMode,
              transactionReference: collection.transactionReference,
              paymentDate: collection.paymentDate,
              notes: `Imported from legacy system. Original Invoice ID: ${collection.invoiceId}`,
              status: "COMPLETED" as const,
              branchId: BRANCH_ID,
              sessionId: SESSION_ID,
              createdBy: collection.collectedBy,
            };
            
            feeCollectionsToCreate.push(feeCollectionData);
            
            // Store items for later creation
            items.forEach((item) => {
              feeCollectionItemsToCreate.push({
                collectionIndex: feeCollectionsToCreate.length - 1,
                feeHeadId: item.feeHeadId,
                amount: item.amount,
              });
            });
          }
        }
        
        // Bulk create fee collections
        if (feeCollectionsToCreate.length > 0) {
          const createdCollections = await tx.feeCollection.createManyAndReturn({
            data: feeCollectionsToCreate,
          });
          
          // Map items to their collection IDs
          const itemsWithCollectionIds = feeCollectionItemsToCreate.map(item => ({
            feeCollectionId: createdCollections[item.collectionIndex]!.id,
            feeHeadId: item.feeHeadId,
            amount: item.amount,
          }));
          
          // Bulk create fee collection items
          await tx.feeCollectionItem.createMany({
            data: itemsWithCollectionIds,
          });
          
          successCount += createdCollections.length;
        }
      }, {
        timeout: 30000, // 30 second timeout
      });
      
    } catch (error) {
      console.error(`Error creating batch ${Math.floor(i / TRANSACTION_BATCH_SIZE) + 1}:`, error);
      errorCount += batch.length;
    }
  }
  
  console.log(`Import completed: ${successCount} successful, ${errorCount} errors`);
}

// Extract unique values for pre-creation - NO DATABASE QUERIES
function extractUniqueValues(rows: CSVRow[]): { feeHeadNames: Set<string>, feeTermNames: Set<string> } {
  const feeHeadNames = new Set<string>();
  const feeTermNames = new Set<string>();
  
  rows.forEach(row => {
    if (row["Head"]) feeHeadNames.add(row["Head"]);
    if (row["Term"]) feeTermNames.add(row["Term"]);
  });
  
  return { feeHeadNames, feeTermNames };
}

// Main optimized import function
async function importFeeHistoryOptimized() {
  try {
    console.log('🚀 Starting OPTIMIZED fee history import...');
    console.log(`Branch ID: ${BRANCH_ID}`);
    console.log(`Session ID: ${SESSION_ID}`);
    console.log(`Batch Size: ${BATCH_SIZE}`);
    
    const startTime = Date.now();
    
    // Step 1: Read CSV file
    console.log('\n📖 Step 1: Reading CSV file...');
    const csvRows = readCSV();
    console.log(`Read ${csvRows.length} rows from CSV`);
    
    // Step 2: Extract unique values
    console.log('\n🔍 Step 2: Extracting unique values...');
    const { feeHeadNames, feeTermNames } = extractUniqueValues(csvRows);
    console.log(`Found ${feeHeadNames.size} unique fee heads and ${feeTermNames.size} unique fee terms`);
    
    // Step 3: Pre-load all existing data into cache (3 queries total)
    console.log('\n💾 Step 3: Pre-loading existing data...');
    await Promise.all([
      preloadStudents(),
      preloadFeeHeads(),
      preloadFeeTerms(),
    ]);
    
    // Step 4: Create missing fee heads and terms (2 queries max)
    console.log('\n➕ Step 4: Creating missing fee heads and terms...');
    await Promise.all([
      createMissingFeeHeads(feeHeadNames),
      createMissingFeeTerms(feeTermNames),
    ]);
    
    // Step 5: Process CSV rows using cache (NO database queries)
    console.log('\n⚡ Step 5: Processing CSV rows using cache...');
    const collections = processCSVRows(csvRows);
    console.log(`Processed into ${collections.length} unique collections`);
    
    // Step 6: Create fee collections in batches
    console.log('\n💽 Step 6: Creating fee collections in database...');
    await createFeeCollections(collections);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n✅ OPTIMIZED fee history import completed successfully in ${totalTime.toFixed(2)} seconds!`);
    console.log(`\n📊 Performance Summary:`);
    console.log(`- Total CSV rows: ${csvRows.length}`);
    console.log(`- Total collections: ${collections.length}`);
    console.log(`- Processing time: ${totalTime.toFixed(2)}s`);
    console.log(`- Average: ${(csvRows.length / totalTime).toFixed(0)} rows/second`);
    
  } catch (error) {
    console.error('❌ Error during optimized fee history import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the optimized import
importFeeHistoryOptimized()
  .then(() => {
    console.log('✅ Optimized import script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Optimized import script failed:', error);
    process.exit(1);
  });

export { importFeeHistoryOptimized };