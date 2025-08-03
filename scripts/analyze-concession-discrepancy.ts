#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
// @ts-ignore
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface ConcessionCSVRow {
  'Admission Number': string;
  'Student Name': string;
  'Father Name': string;
  'Class': string;
  'Fee Head': string;
  'Term': string;
  'Concession Category': string;
  'Total Fee Assigned': string;
  'Concession': string;
  'Net Fee Assigned': string;
}

interface AnalysisResult {
  totalRowsInCSV: number;
  totalExpectedConcessionAmount: number;
  studentsNotFound: string[];
  duplicatePrevention: { admissionNumber: string; concessionCategory: string }[];
  successfulImports: number;
  totalImportedAmount: number;
}

async function analyzeConcessionDiscrepancy(): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    totalRowsInCSV: 0,
    totalExpectedConcessionAmount: 0,
    studentsNotFound: [],
    duplicatePrevention: [],
    successfulImports: 0,
    totalImportedAmount: 0
  };

  // Parse CSV to get expected totals
  const csvRows: ConcessionCSVRow[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('AI/Concession_02-08-2025.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
      }))
      .on('data', (row: ConcessionCSVRow) => {
        const admissionNumber = row['Admission Number']?.toString().trim();
        const concessionAmount = parseFloat(row['Concession']?.toString().replace(/[^0-9.-]/g, '') || '0');
        
        if (admissionNumber && !isNaN(concessionAmount)) {
          csvRows.push(row);
          result.totalExpectedConcessionAmount += concessionAmount;
        }
      })
      .on('end', async () => {
        result.totalRowsInCSV = csvRows.length;
        
        console.log(`📊 CSV Analysis:`);
        console.log(`Total rows: ${result.totalRowsInCSV}`);
        console.log(`Expected total concession amount: ₹${result.totalExpectedConcessionAmount.toLocaleString('en-IN')}`);
        
        // Check what actually got imported
        const importedConcessions = await prisma.studentConcession.findMany({
          include: {
            concessionType: true,
            student: true
          }
        });
        
        result.totalImportedAmount = importedConcessions.reduce((sum, concession) => {
          return sum + (concession.customValue || concession.concessionType.value || 0);
        }, 0);
        
        result.successfulImports = importedConcessions.length;
        
        console.log(`\n💾 Database Analysis:`);
        console.log(`Total imported concessions: ${result.successfulImports}`);
        console.log(`Total imported amount: ₹${result.totalImportedAmount.toLocaleString('en-IN')}`);
        
        // Analyze discrepancies
        console.log(`\n🔍 Discrepancy Analysis:`);
        console.log(`Missing amount: ₹${(result.totalExpectedConcessionAmount - result.totalImportedAmount).toLocaleString('en-IN')}`);
        console.log(`Import success rate: ${((result.successfulImports / result.totalRowsInCSV) * 100).toFixed(2)}%`);
        
        // Check for students not found
        const uniqueAdmissionNumbers = [...new Set(csvRows.map(row => row['Admission Number']?.toString().trim()))];
        console.log(`\n👥 Student Analysis:`);
        console.log(`Unique students in CSV: ${uniqueAdmissionNumbers.length}`);
        
        for (const admissionNumber of uniqueAdmissionNumbers) {
          const student = await prisma.student.findFirst({
            where: { admissionNumber }
          });
          
          if (!student) {
            result.studentsNotFound.push(admissionNumber);
          }
        }
        
        console.log(`Students not found in DB: ${result.studentsNotFound.length}`);
        if (result.studentsNotFound.length > 0) {
          console.log(`Missing students: ${result.studentsNotFound.slice(0, 10).join(', ')}${result.studentsNotFound.length > 10 ? '...' : ''}`);
        }
        
        // Check for potential duplicate prevention issues
        const studentConcessionMap = new Map<string, Set<string>>();
        
        for (const concession of importedConcessions) {
          const key = concession.student.admissionNumber;
          if (!studentConcessionMap.has(key)) {
            studentConcessionMap.set(key, new Set());
          }
          studentConcessionMap.get(key)!.add(concession.concessionType.name);
        }
        
        // Group CSV rows by student and concession type to find potential duplicates
        const csvGrouped = new Map<string, Map<string, ConcessionCSVRow[]>>();
        
        for (const row of csvRows) {
          const admissionNumber = row['Admission Number']?.toString().trim();
          const concessionCategory = row['Concession Category']?.toString().trim();
          
          if (!csvGrouped.has(admissionNumber)) {
            csvGrouped.set(admissionNumber, new Map());
          }
          
          if (!csvGrouped.get(admissionNumber)!.has(concessionCategory)) {
            csvGrouped.get(admissionNumber)!.set(concessionCategory, []);
          }
          
          csvGrouped.get(admissionNumber)!.get(concessionCategory)!.push(row);
        }
        
        console.log(`\n🔄 Potential Issues:`);
        
        // Calculate expected vs actual by concession type
        const concessionTypeAmounts = new Map<string, number>();
        for (const row of csvRows) {
          const category = row['Concession Category']?.toString().trim();
          const amount = parseFloat(row['Concession']?.toString().replace(/[^0-9.-]/g, '') || '0');
          
          concessionTypeAmounts.set(category, (concessionTypeAmounts.get(category) || 0) + amount);
        }
        
        console.log(`\nTop 10 Concession Categories by Expected Amount:`);
        const sortedCategories = Array.from(concessionTypeAmounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
          
        for (const [category, amount] of sortedCategories) {
          console.log(`${category}: ₹${amount.toLocaleString('en-IN')}`);
        }
        
        await prisma.$disconnect();
        resolve(result);
      })
      .on('error', reject);
  });
}

// Run the analysis
analyzeConcessionDiscrepancy()
  .then((result) => {
    console.log(`\n✅ Analysis completed successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`- Expected: ₹${result.totalExpectedConcessionAmount.toLocaleString('en-IN')}`);
    console.log(`- Imported: ₹${result.totalImportedAmount.toLocaleString('en-IN')}`);
    console.log(`- Missing: ₹${(result.totalExpectedConcessionAmount - result.totalImportedAmount).toLocaleString('en-IN')}`);
    console.log(`- Success Rate: ${((result.successfulImports / result.totalRowsInCSV) * 100).toFixed(2)}%`);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });