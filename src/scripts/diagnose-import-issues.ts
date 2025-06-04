import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

const prisma = new PrismaClient();

interface ImportDiagnostics {
  totalStudents: number;
  studentsWithClerkId: number;
  studentsWithoutClerkId: number;
  studentsWithCredentials: number;
  studentsWithoutCredentials: number;
  parentsWithClerkId: number;
  parentsWithoutClerkId: number;
  byBranch: {
    [branchCode: string]: {
      total: number;
      withClerk: number;
      withoutClerk: number;
    };
  };
  recentImports: Array<{
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    hasClerkId: boolean;
    hasCredentials: boolean;
    branchCode: string;
    createdAt: Date;
  }>;
}

async function diagnoseBulkImportIssues(): Promise<ImportDiagnostics> {
  console.log("🔍 Analyzing bulk import issues...\n");

  // Get all students
  const allStudents = await prisma.student.findMany({
    include: {
      parent: true,
      branch: {
        select: {
          code: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get students created in the last 24 hours (likely from recent import)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentStudents = allStudents.filter(s => s.createdAt > oneDayAgo);

  // Calculate statistics
  const totalStudents = allStudents.length;
  const studentsWithClerkId = allStudents.filter(s => s.clerkId && s.clerkId.trim() !== "").length;
  const studentsWithoutClerkId = totalStudents - studentsWithClerkId;
  
  const studentsWithCredentials = allStudents.filter(s => s.username && s.password).length;
  const studentsWithoutCredentials = totalStudents - studentsWithCredentials;

  // Parent statistics
  const allParents = await prisma.parent.findMany();
  const parentsWithClerkId = allParents.filter(p => p.clerkId && p.clerkId.trim() !== "").length;
  const parentsWithoutClerkId = allParents.length - parentsWithClerkId;

  // Statistics by branch
  const byBranch: { [key: string]: { total: number; withClerk: number; withoutClerk: number } } = {};
  
  allStudents.forEach(student => {
    const branchCode = student.branch?.code || 'Unknown';
    if (!byBranch[branchCode]) {
      byBranch[branchCode] = { total: 0, withClerk: 0, withoutClerk: 0 };
    }
    byBranch[branchCode]!.total++;
    if (student.clerkId && student.clerkId.trim() !== "") {
      byBranch[branchCode]!.withClerk++;
    } else {
      byBranch[branchCode]!.withoutClerk++;
    }
  });

  // Recent imports analysis
  const recentImports = recentStudents.map(student => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    admissionNumber: student.admissionNumber,
    hasClerkId: !!(student.clerkId && student.clerkId.trim() !== ""),
    hasCredentials: !!(student.username && student.password),
    branchCode: student.branch?.code || 'Unknown',
    createdAt: student.createdAt
  }));

  return {
    totalStudents,
    studentsWithClerkId,
    studentsWithoutClerkId,
    studentsWithCredentials,
    studentsWithoutCredentials,
    parentsWithClerkId,
    parentsWithoutClerkId,
    byBranch,
    recentImports
  };
}

async function generateReport(diagnostics: ImportDiagnostics) {
  console.log("📊 BULK IMPORT DIAGNOSTICS REPORT");
  console.log("=" .repeat(50));
  
  // Overall statistics
  console.log("\n📈 OVERALL STATISTICS:");
  console.log(`Total Students: ${diagnostics.totalStudents}`);
  console.log(`Students with Clerk accounts: ${diagnostics.studentsWithClerkId} (${Math.round((diagnostics.studentsWithClerkId / diagnostics.totalStudents) * 100)}%)`);
  console.log(`Students WITHOUT Clerk accounts: ${diagnostics.studentsWithoutClerkId} (${Math.round((diagnostics.studentsWithoutClerkId / diagnostics.totalStudents) * 100)}%)`);
  console.log(`Students with credentials: ${diagnostics.studentsWithCredentials}`);
  console.log(`Students without credentials: ${diagnostics.studentsWithoutCredentials}`);
  
  console.log("\n👥 PARENT STATISTICS:");
  console.log(`Parents with Clerk accounts: ${diagnostics.parentsWithClerkId}`);
  console.log(`Parents WITHOUT Clerk accounts: ${diagnostics.parentsWithoutClerkId}`);

  // Branch breakdown
  console.log("\n🏢 BREAKDOWN BY BRANCH:");
  Object.entries(diagnostics.byBranch).forEach(([branchCode, stats]) => {
    const successRate = Math.round((stats.withClerk / stats.total) * 100);
    console.log(`${branchCode}: ${stats.withClerk}/${stats.total} (${successRate}%) have Clerk accounts`);
    if (stats.withoutClerk > 0) {
      console.log(`  ⚠️  ${stats.withoutClerk} students missing Clerk accounts`);
    }
  });

  // Recent imports analysis
  if (diagnostics.recentImports.length > 0) {
    console.log("\n🕒 RECENT IMPORTS (Last 24 hours):");
    console.log(`Found ${diagnostics.recentImports.length} recently imported students`);
    
    const recentWithClerk = diagnostics.recentImports.filter(s => s.hasClerkId).length;
    const recentWithoutClerk = diagnostics.recentImports.length - recentWithClerk;
    
    console.log(`  ✅ With Clerk accounts: ${recentWithClerk}`);
    console.log(`  ❌ Without Clerk accounts: ${recentWithoutClerk}`);
    
    if (recentWithoutClerk > 0) {
      console.log("\n  📋 Students without Clerk accounts:");
      diagnostics.recentImports
        .filter(s => !s.hasClerkId)
        .forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.firstName} ${student.lastName} (${student.admissionNumber}) - ${student.branchCode}`);
        });
    }
  }

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:");
  
  if (diagnostics.studentsWithoutClerkId > 0) {
    console.log("1. Run the fix script to create missing Clerk accounts:");
    console.log("   npx tsx src/scripts/fix-missing-clerk-accounts.ts");
  }
  
  if (diagnostics.studentsWithoutClerkId > diagnostics.totalStudents * 0.5) {
    console.log("2. High failure rate detected. Possible causes:");
    console.log("   - Clerk API rate limiting during bulk import");
    console.log("   - Network connectivity issues");
    console.log("   - Invalid Clerk environment configuration");
    console.log("   - Insufficient Clerk quota/permissions");
  }
  
  if (diagnostics.studentsWithoutCredentials > 0) {
    console.log("3. Some students are missing username/password credentials");
    console.log("   - Check the import data validation");
    console.log("   - Ensure credential generation logic is working");
  }

  console.log("\n🔧 NEXT STEPS:");
  console.log("1. Review the import logs for specific error messages");
  console.log("2. Check Clerk dashboard for any account creation failures");
  console.log("3. Verify Clerk API rate limits and quota");
  console.log("4. Run the fix script to create missing accounts");
  console.log("5. Consider implementing retry logic for future imports");
}

async function analyzeFailurePatterns(diagnostics: ImportDiagnostics) {
  console.log("\n🔍 FAILURE PATTERN ANALYSIS:");
  
  // Check if failures are concentrated in specific branches
  const branchFailureRates = Object.entries(diagnostics.byBranch).map(([code, stats]) => ({
    branch: code,
    failureRate: stats.withoutClerk / stats.total,
    count: stats.withoutClerk
  })).sort((a, b) => b.failureRate - a.failureRate);

  if (branchFailureRates.some(b => b.failureRate > 0)) {
    console.log("Branch-specific failure rates:");
    branchFailureRates.forEach(branch => {
      if (branch.count > 0) {
        console.log(`  ${branch.branch}: ${Math.round(branch.failureRate * 100)}% failure rate (${branch.count} students)`);
      }
    });
  }

  // Timing analysis for recent imports
  if (diagnostics.recentImports.length > 0) {
    const timeSlots: { [hour: string]: { total: number; failed: number } } = {};
    
    diagnostics.recentImports.forEach(student => {
      const hour = student.createdAt.getHours();
      const key = `${hour}:00-${hour + 1}:00`;
      if (!timeSlots[key]) {
        timeSlots[key] = { total: 0, failed: 0 };
      }
      timeSlots[key]!.total++;
      if (!student.hasClerkId) {
        timeSlots[key]!.failed++;
      }
    });

    console.log("\nFailure distribution by time:");
    Object.entries(timeSlots)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([time, stats]) => {
        if (stats.failed > 0) {
          const failureRate = Math.round((stats.failed / stats.total) * 100);
          console.log(`  ${time}: ${stats.failed}/${stats.total} failures (${failureRate}%)`);
        }
      });
  }
}

async function main() {
  try {
    const diagnostics = await diagnoseBulkImportIssues();
    await generateReport(diagnostics);
    await analyzeFailurePatterns(diagnostics);
    
  } catch (error) {
    console.error("❌ Diagnostic script failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
main(); 