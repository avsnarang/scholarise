import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { AssessmentCalculator } from '@/lib/assessment-calculator';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentSchemaId = searchParams.get('assessmentSchemaId');
    const studentId = searchParams.get('studentId');

    if (!assessmentSchemaId) {
      return NextResponse.json({ error: 'Assessment schema ID is required' }, { status: 400 });
    }

    const scores = await prisma.studentAssessmentScore.findMany({
      where: {
        assessmentSchemaId,
        ...(studentId && { studentId }),
      },
      include: {
        student: true,
        componentScores: {
          include: {
            component: true,
            subCriteriaScores: {
              include: {
                subCriteria: true,
              },
            },
          },
        },
      },
      orderBy: [
        { student: { rollNumber: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching assessment scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment scores' },
      { status: 500 }
    );
  }
}

async function recalculateFinalScores(studentAssessmentKeys: string[], userId: string) {
  const assessmentCalculator = new AssessmentCalculator();
  
  for (const studentAssessmentKey of studentAssessmentKeys) {
    const [studentId, assessmentSchemaId] = studentAssessmentKey.split('-');
    
    try {
      await prisma.$transaction(async (tx) => {
        // Fetch complete assessment schema
        const schema = await tx.assessmentSchema.findUnique({
          where: { id: assessmentSchemaId },
          include: {
            components: {
              include: {
                subCriteria: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!schema) return;

        // Fetch all component scores for this student
        const studentAssessmentScore = await tx.studentAssessmentScore.findFirst({
          where: {
            studentId,
            assessmentSchemaId,
          },
          include: {
            componentScores: {
              include: {
                subCriteriaScores: true,
              },
            },
          },
        });

        if (!studentAssessmentScore) return;

        // Transform component scores to match calculator interface
        const componentScores = studentAssessmentScore.componentScores.map(cs => ({
          componentId: cs.componentId,
          rawScore: cs.rawScore || 0,
          reducedScore: cs.reducedScore || cs.rawScore || 0,
          calculatedScore: cs.calculatedScore || cs.rawScore || 0,
          subCriteriaScores: cs.subCriteriaScores.map(scs => ({
            subCriteriaId: scs.subCriteriaId,
            score: scs.score || 0,
          })),
        }));

        // Calculate final assessment scores
        const calculationResult = assessmentCalculator.calculateAssessment(schema as any, componentScores as any);
        const finalGrade = assessmentCalculator.calculateGrade(calculationResult.finalPercentage);

        // Update student assessment score with calculated values
        await tx.studentAssessmentScore.update({
          where: { id: studentAssessmentScore.id },
          data: {
            finalScore: calculationResult.finalScore,
            finalPercentage: calculationResult.finalPercentage,
            finalGrade: finalGrade,
            isComplete: calculationResult.finalScore > 0,
            enteredBy: userId,
            updatedAt: new Date(),
          },
        });
      }, {
        timeout: 10000, // 10 seconds for individual final score calculations
      });

    } catch (calculationError) {
      console.error(`Error calculating final scores for student ${studentId}:`, calculationError);
      // Continue with other students even if one fails
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Expected array of score data' }, { status: 400 });
    }

    // Process in batches to avoid long transactions
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }

    const allSavedScores = [];
    const studentsToRecalculate = new Set<string>();

    // Process each batch
    for (const batch of batches) {
      const results = await prisma.$transaction(async (tx) => {
        const savedScores = [];

        for (const scoreData of batch) {
          const {
            studentId,
            assessmentSchemaId,
            componentId,
            marksObtained,
            comments,
            branchId,
          } = scoreData;

          if (!branchId) {
            throw new Error('branchId is required');
          }

          // Track students that need final score recalculation
          studentsToRecalculate.add(`${studentId}-${assessmentSchemaId}`);

          // Find or create student assessment score record
          let studentScore = await tx.studentAssessmentScore.findFirst({
            where: {
              studentId,
              assessmentSchemaId,
            },
            include: {
              componentScores: true,
            },
          });

          if (!studentScore) {
            // Create new student assessment score
            studentScore = await tx.studentAssessmentScore.create({
              data: {
                studentId,
                assessmentSchemaId,
                enteredBy: userId,
                branchId,
              },
              include: {
                componentScores: true,
              },
            });
          }

          // Handle component score
          if (componentId) {
            const existingComponentScore = studentScore.componentScores.find(
              cs => cs.componentId === componentId
            );
            
            let componentScore;
            if (existingComponentScore) {
              componentScore = await tx.componentScore.update({
                where: { id: existingComponentScore.id },
                data: {
                  rawScore: Number(marksObtained),
                  calculatedScore: Number(marksObtained),
                  enteredBy: userId,
                  updatedAt: new Date(),
                },
              });
            } else {
              componentScore = await tx.componentScore.create({
                data: {
                  studentAssessmentScoreId: studentScore.id,
                  componentId,
                  rawScore: Number(marksObtained),
                  calculatedScore: Number(marksObtained),
                  enteredBy: userId,
                },
              });
            }

            // Handle sub-criteria scores if provided
            if (scoreData.subCriteriaScores && typeof scoreData.subCriteriaScores === 'object') {
              for (const [subCriteriaId, subScore] of Object.entries(scoreData.subCriteriaScores)) {
                const numericSubScore = Number(subScore);
                if (isNaN(numericSubScore)) continue;

                // Check if sub-criteria score already exists
                const existingSubScore = await tx.subCriteriaScore.findFirst({
                  where: {
                    subCriteriaId,
                    componentScoreId: componentScore.id,
                  },
                });

                if (existingSubScore) {
                  await tx.subCriteriaScore.update({
                    where: { id: existingSubScore.id },
                    data: {
                      score: numericSubScore,
                      enteredBy: userId,
                      updatedAt: new Date(),
                    },
                  });
                } else {
                  await tx.subCriteriaScore.create({
                    data: {
                      subCriteriaId,
                      componentScoreId: componentScore.id,
                      score: numericSubScore,
                      enteredBy: userId,
                    },
                  });
                }
              }
            }
          }

          savedScores.push(studentScore);
        }

        return savedScores;
      }, {
        timeout: 15000, // 15 seconds for batch processing
      });

      allSavedScores.push(...results);
    }

    // Recalculate final scores separately (outside the main transaction)
    // This prevents the main transaction from timing out
    if (studentsToRecalculate.size > 0) {
      // Run this in the background to avoid blocking the response
      setImmediate(() => {
        recalculateFinalScores(Array.from(studentsToRecalculate), userId)
          .catch(error => {
            console.error('Error in background final score calculation:', error);
          });
      });
    }

    return NextResponse.json(allSavedScores);
  } catch (error) {
    console.error('Error saving assessment scores:', error);
    return NextResponse.json(
      { error: 'Failed to save assessment scores' },
      { status: 500 }
    );
  }
} 