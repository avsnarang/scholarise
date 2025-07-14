import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const BRANCH_ID = "cmbdk8dd9000w7ip2rpxsd5rr";
const SESSION_ID = "cmbdk90xz000x7ip2ido648y3";

// Read and parse CSV file to get expected totals
function readCSVForVerification() {
  const csvPath = path.join(__dirname, '..', 'AI', 'collection-reports-fee-heads.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = csvContent.split('\n');
  const headers = lines[0]!.split(',');
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    
    const values = line.split(',');
    if (values.length !== headers.length) continue;
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

async function verifyImportData() {
  console.log('🔍 Starting import data verification...\n');
  
  try {
    // Step 1: Read CSV and calculate expected totals
    console.log('📊 Analyzing CSV file...');
    const csvRows = readCSVForVerification();
    
    const csvTotals = {
      totalRows: csvRows.length,
      totalAmount: 0,
      uniqueInvoices: new Set<string>(),
      uniqueStudents: new Set<string>(),
      uniqueFeeHeads: new Set<string>(),
      uniqueFeeTerms: new Set<string>(),
    };
    
    const studentAmountMap = new Map<string, number>();
    
    csvRows.forEach(row => {
      const amount = parseFloat(row["Amount"] || '0');
      if (!isNaN(amount)) {
        csvTotals.totalAmount += amount;
        csvTotals.uniqueInvoices.add(row["Invoice Id"]);
        csvTotals.uniqueStudents.add(row["Admission No"]);
        csvTotals.uniqueFeeHeads.add(row["Head"]);
        csvTotals.uniqueFeeTerms.add(row["Term"]);
        
        // Track amount per student
        const admissionNo = row["Admission No"];
        studentAmountMap.set(admissionNo, (studentAmountMap.get(admissionNo) || 0) + amount);
      }
    });
    
    console.log('CSV Analysis:');
    console.log(`- Total rows: ${csvTotals.totalRows.toLocaleString()}`);
    console.log(`- Expected total amount: ₹${csvTotals.totalAmount.toLocaleString()}`);
    console.log(`- Unique invoices: ${csvTotals.uniqueInvoices.size.toLocaleString()}`);
    console.log(`- Unique students: ${csvTotals.uniqueStudents.size.toLocaleString()}`);
    console.log(`- Unique fee heads: ${csvTotals.uniqueFeeHeads.size.toLocaleString()}`);
    console.log(`- Unique fee terms: ${csvTotals.uniqueFeeTerms.size.toLocaleString()}\n`);
    
    // Step 2: Check what's in the database
    console.log('🗄️  Checking database records...');
    
    // Get imported fee collections
    const feeCollections = await prisma.feeCollection.findMany({
      where: {
        branchId: BRANCH_ID,
        sessionId: SESSION_ID,
        notes: {
          contains: "Imported from legacy system"
        }
      },
      include: {
        items: {
          include: {
            feeHead: true
          }
        },
        student: true,
        feeTerm: true
      }
    });
    
    const dbTotals = {
      totalCollections: feeCollections.length,
      totalAmount: feeCollections.reduce((sum, collection) => sum + collection.totalAmount, 0),
      totalItems: feeCollections.reduce((sum, collection) => sum + collection.items.length, 0),
      uniqueStudents: new Set(feeCollections.map(c => c.studentId)).size,
    };
    
    console.log('Database Analysis:');
    console.log(`- Imported fee collections: ${dbTotals.totalCollections.toLocaleString()}`);
    console.log(`- Total amount in DB: ₹${dbTotals.totalAmount.toLocaleString()}`);
    console.log(`- Total collection items: ${dbTotals.totalItems.toLocaleString()}`);
    console.log(`- Unique students in DB: ${dbTotals.uniqueStudents.toLocaleString()}\n`);
    
    // Step 3: Compare and identify discrepancies
    console.log('⚠️  Discrepancy Analysis:');
    const amountDifference = csvTotals.totalAmount - dbTotals.totalAmount;
    const percentImported = ((dbTotals.totalAmount / csvTotals.totalAmount) * 100);
    
    console.log(`- Amount difference: ₹${amountDifference.toLocaleString()}`);
    console.log(`- Percentage imported: ${percentImported.toFixed(2)}%`);
    console.log(`- Missing amount: ₹${(csvTotals.totalAmount - dbTotals.totalAmount).toLocaleString()}\n`);
    
    // Step 4: Check for missing students
    console.log('👥 Checking for missing students...');
    const allStudents = await prisma.student.findMany({
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true
      }
    });
    
    const studentAdmissionNumbers = new Set(allStudents.map(s => s.admissionNumber));
    const missingStudents = Array.from(csvTotals.uniqueStudents).filter(admissionNo => 
      !studentAdmissionNumbers.has(admissionNo)
    );
    
    console.log(`- Students in database: ${allStudents.length.toLocaleString()}`);
    console.log(`- Students missing from DB: ${missingStudents.length.toLocaleString()}`);
    
    if (missingStudents.length > 0) {
      console.log('- Sample missing students:', missingStudents.slice(0, 10));
      
      // Calculate amount for missing students
      let missingStudentAmount = 0;
      missingStudents.forEach(admissionNo => {
        missingStudentAmount += studentAmountMap.get(admissionNo) || 0;
      });
      console.log(`- Amount from missing students: ₹${missingStudentAmount.toLocaleString()}`);
    }
    
    // Step 5: Check fee heads and terms
    console.log('\n💰 Checking fee heads and terms...');
    const feeHeads = await prisma.feeHead.findMany({
      where: { branchId: BRANCH_ID, sessionId: SESSION_ID }
    });
    const feeTerms = await prisma.feeTerm.findMany({
      where: { branchId: BRANCH_ID, sessionId: SESSION_ID }
    });
    
    console.log(`- Fee heads in DB: ${feeHeads.length} (Expected: ${csvTotals.uniqueFeeHeads.size})`);
    console.log(`- Fee terms in DB: ${feeTerms.length} (Expected: ${csvTotals.uniqueFeeTerms.size})`);
    
    // Step 6: Sample data verification
    console.log('\n📋 Sample verification...');
    if (feeCollections.length > 0) {
      const sampleCollection = feeCollections[0];
      console.log('Sample imported collection:');
      console.log(`- Receipt: ${sampleCollection?.receiptNumber}`);
      console.log(`- Student: ${sampleCollection?.student.firstName} ${sampleCollection?.student.lastName}`);
      console.log(`- Amount: ₹${sampleCollection?.totalAmount.toLocaleString()}`);
      console.log(`- Items: ${sampleCollection?.items.length}`);
      console.log(`- Date: ${sampleCollection?.paymentDate.toDateString()}`);
    }
    
    // Step 7: Check for recent collections (non-imported)
    console.log('\n🔄 Checking all fee collections in system...');
    const allFeeCollections = await prisma.feeCollection.findMany({
      where: {
        branchId: BRANCH_ID,
        sessionId: SESSION_ID,
      }
    });
    
    const totalSystemAmount = allFeeCollections.reduce((sum, collection) => sum + collection.totalAmount, 0);
    const nonImportedCollections = allFeeCollections.filter(c => 
      !c.notes?.includes("Imported from legacy system")
    );
    
    console.log(`- Total collections in system: ${allFeeCollections.length.toLocaleString()}`);
    console.log(`- Total amount in system: ₹${totalSystemAmount.toLocaleString()}`);
    console.log(`- Non-imported collections: ${nonImportedCollections.length.toLocaleString()}`);
    
    // Step 8: Recommendations
    console.log('\n📝 Recommendations:');
    if (missingStudents.length > 0) {
      console.log('❌ Issue: Students missing from database');
      console.log(`   → ${missingStudents.length} students from CSV not found in student table`);
      console.log(`   → Missing amount: ₹${(studentAmountMap.get(missingStudents[0]!) || 0).toLocaleString()} (from first missing student)`);
    }
    
    if (percentImported < 90) {
      console.log('❌ Issue: Low import percentage');
      console.log(`   → Only ${percentImported.toFixed(1)}% of expected amount was imported`);
      console.log('   → Check script logs for skipped rows');
    }
    
    if (amountDifference > 100000) { // More than 1 lakh difference
      console.log('❌ Issue: Significant amount difference');
      console.log(`   → ₹${amountDifference.toLocaleString()} difference between expected and actual`);
    }
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyImportData()
  .then(() => {
    console.log('✅ Verification script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });

export { verifyImportData }; 