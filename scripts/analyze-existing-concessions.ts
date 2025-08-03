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

async function analyzeExistingConcessions() {
  const csvRows: ConcessionCSVRow[] = [];
  
  // Load CSV data
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream('AI/Concession_02-08-2025.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
      }))
      .on('data', (row: ConcessionCSVRow) => {
        csvRows.push(row);
      })
      .on('end', async () => {
        console.log(`📊 Loaded ${csvRows.length} rows from CSV`);
        
        // Get all existing concessions
        const existingConcessions = await prisma.studentConcession.findMany({
          include: {
            student: true,
            concessionType: true
          }
        });
        
        console.log(`💾 Found ${existingConcessions.length} existing concessions in database`);
        
        // Create mapping of existing concessions
        const existingMap = new Map<string, Set<string>>();
        for (const concession of existingConcessions) {
          const admissionNumber = concession.student.admissionNumber;
          if (!existingMap.has(admissionNumber)) {
            existingMap.set(admissionNumber, new Set());
          }
          existingMap.get(admissionNumber)!.add(concession.concessionType.name);
        }
        
        // Analyze CSV rows against existing concessions
        let blockedByDuplicates = 0;
        let couldBeUpdated = 0;
        let newConcessions = 0;
        let studentsNotFound = 0;
        
        const duplicateDetails: Array<{
          admissionNumber: string;
          studentName: string;
          concessionCategory: string;
          expectedAmount: number;
          existingConcessionType: string;
        }> = [];
        
        // Group CSV by admission number and concession category
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
        
        // Check each unique student-concession combination
        for (const [admissionNumber, concessionMap] of csvGrouped) {
          // Check if student exists
          const student = await prisma.student.findFirst({
            where: { admissionNumber }
          });
          
          if (!student) {
            studentsNotFound++;
            continue;
          }
          
          const existingConcessionTypes = existingMap.get(admissionNumber) || new Set();
          
          for (const [concessionCategory, rows] of concessionMap) {
            const totalExpectedAmount = rows.reduce((sum, row) => {
              return sum + parseFloat(row['Concession']?.toString().replace(/[^0-9.-]/g, '') || '0');
            }, 0);
            
            // Check if this would be blocked by existing concession
            const hasExistingConcession = Array.from(existingConcessionTypes).some(existing => 
              existing.toLowerCase().includes(concessionCategory.toLowerCase()) ||
              concessionCategory.toLowerCase().includes(existing.toLowerCase())
            );
            
            if (hasExistingConcession) {
              blockedByDuplicates++;
              couldBeUpdated++;
              
              duplicateDetails.push({
                admissionNumber,
                studentName: rows[0] ? rows[0]['Student Name'] : 'Unknown',
                concessionCategory,
                expectedAmount: totalExpectedAmount,
                existingConcessionType: Array.from(existingConcessionTypes).join(', ')
              });
            } else {
              newConcessions++;
            }
          }
        }
        
        console.log(`\n🔍 Detailed Analysis:`);
        console.log(`Students not found: ${studentsNotFound}`);
        console.log(`New concessions (would succeed): ${newConcessions}`);
        console.log(`Blocked by duplicates: ${blockedByDuplicates}`);
        console.log(`Could be updated instead: ${couldBeUpdated}`);
        
        console.log(`\n📋 Top 20 Students with Blocked Concessions:`);
        const sortedDuplicates = duplicateDetails
          .sort((a, b) => b.expectedAmount - a.expectedAmount)
          .slice(0, 20);
          
        for (const detail of sortedDuplicates) {
          console.log(`${detail.admissionNumber} (${detail.studentName}): ${detail.concessionCategory} - ₹${detail.expectedAmount.toLocaleString('en-IN')}`);
          console.log(`  Existing: ${detail.existingConcessionType}`);
        }
        
        // Calculate total blocked amount
        const totalBlockedAmount = duplicateDetails.reduce((sum, detail) => sum + detail.expectedAmount, 0);
        console.log(`\n💰 Total amount blocked by duplicates: ₹${totalBlockedAmount.toLocaleString('en-IN')}`);
        
        // Generate recommendations
        console.log(`\n🛠️  Recommendations:`);
        console.log(`1. Update existing concessions instead of creating new ones`);
        console.log(`2. Consider merging concession amounts for same students`);
        console.log(`3. Review business logic for duplicate prevention`);
        console.log(`4. Create update script to handle existing concessions`);
        
        await prisma.$disconnect();
        resolve();
      })
      .on('error', reject);
  });
}

// Run the analysis
analyzeExistingConcessions()
  .then(() => {
    console.log(`\n✅ Analysis completed!`);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });