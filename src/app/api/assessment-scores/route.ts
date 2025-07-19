import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getServerUser } from '@/lib/supabase/auth';
import { AssessmentCalculator } from '@/lib/assessment-calculator';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentSchemaId = searchParams.get('assessmentSchemaId');
    const studentId = searchParams.get('studentId');

    if (!assessmentSchemaId) {
      return NextResponse.json({ error: 'Assessment schema ID is required' }, { status: 400 });
    }

    const scores = await db.studentAssessmentScore.findMany({
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
      await db.$transaction(async (tx) => {
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
  console.log('=== ASSESSMENT SCORES API CALLED ===');
  try {
    // Enhanced authentication with better error handling
    let user;
    try {
      user = await getServerUser();
      console.log('AUTH: User authenticated:', user ? 'Yes' : 'No');
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ 
        error: 'Authentication service unavailable',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enhanced data parsing with validation
    let data;
    try {
      data = await request.json();
      console.log('DATA: Received', Array.isArray(data) ? data.length : 0, 'items');
      console.log('DATA: First item:', Array.isArray(data) && data.length > 0 ? data[0] : 'none');
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON data',
        details: parseError instanceof Error ? parseError.message : 'JSON parse failed'
      }, { status: 400 });
    }
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Expected array of score data' }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'No scores to save' }, { status: 400 });
    }

    // Validate data structure
    const firstScore = data[0];
    const requiredFields = ['studentId', 'assessmentSchemaId', 'branchId'];
    const missingFields = requiredFields.filter(field => !firstScore[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: Object.keys(firstScore || {}),
        sampleData: firstScore
      }, { status: 400 });
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
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (!batch) {
        console.error(`Batch ${batchIndex} is undefined`);
        continue;
      }
      
      try {
        const results = await db.$transaction(async (tx) => {
          const savedScores = [];

          for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
            const scoreData = batch[itemIndex];
            if (!scoreData) {
              console.error(`Score data at index ${itemIndex} is undefined`);
              continue;
            }

            const {
              studentId,
              assessmentSchemaId,
              componentId,
              marksObtained,
              comments,
              branchId,
              // Handle attendance fields (from ComponentScoreEntry)
              attendanceStatus,
              attendanceReason,
              attendanceNotes,
              // Handle sub-criteria scores (from ComponentScoreEntry)
              subCriteriaScores,
            } = scoreData;

          if (!branchId) {
            throw new Error('branchId is required');
          }

          // Validate that the student exists
          const studentExists = await tx.student.findUnique({
            where: { id: studentId },
            select: { 
              id: true, 
              isActive: true, 
              branchId: true,
              firstName: true,
              lastName: true,
              rollNumber: true 
            }
          });

          if (!studentExists) {
            throw new Error(`Student with ID ${studentId} not found in database`);
          }

          if (!studentExists.isActive) {
            throw new Error(`Student with ID ${studentId} is not active`);
          }

          if (studentExists.branchId !== branchId) {
            throw new Error(`Student ${studentId} belongs to branch ${studentExists.branchId}, but trying to save to branch ${branchId}`);
          }

          // Track students that need final score recalculation
          studentsToRecalculate.add(`${studentId}-${assessmentSchemaId}`);

          // Get the assessment schema with components to validate max scores
          const assessmentSchema = await tx.assessmentSchema.findUnique({
            where: { id: assessmentSchemaId },
            include: {
              components: {
                include: {
                  subCriteria: true,
                },
              },
            },
          });

          if (!assessmentSchema) {
            throw new Error(`Assessment schema not found: ${assessmentSchemaId}`);
          }

          if (!assessmentSchema.isActive) {
            throw new Error(`Assessment schema ${assessmentSchemaId} is not active`);
          }

          if (assessmentSchema.branchId !== branchId) {
            throw new Error(`Assessment schema ${assessmentSchemaId} belongs to branch ${assessmentSchema.branchId}, but trying to save to branch ${branchId}`);
          }



          // Find the specific component to validate against
          let targetComponent = null;
          if (componentId) {
            targetComponent = assessmentSchema.components.find(c => c.id === componentId);
            if (!targetComponent) {
              throw new Error(`Component not found: ${componentId}`);
            }
          }

          // Validate main component score doesn't exceed maximum
          if (componentId && targetComponent && marksObtained != null) {
            if (marksObtained > targetComponent.rawMaxScore) {
              throw new Error(
                `Score ${marksObtained} for component "${targetComponent.name}" exceeds maximum allowed ${targetComponent.rawMaxScore} marks`
              );
            }
            if (marksObtained < 0) {
              throw new Error(
                `Score ${marksObtained} for component "${targetComponent.name}" cannot be negative`
              );
            }
          }

          // Validate sub-criteria scores if provided
          if (subCriteriaScores && typeof subCriteriaScores === 'object') {
            for (const [subCriteriaId, subScore] of Object.entries(subCriteriaScores)) {
              const numericSubScore = Number(subScore);
              if (isNaN(numericSubScore)) continue;

              // Find the sub-criteria to validate against
              const subCriteria = targetComponent?.subCriteria.find(sc => sc.id === subCriteriaId);
              if (!subCriteria) {
                throw new Error(`Sub-criteria not found: ${subCriteriaId}`);
              }

              // Validate sub-criteria score doesn't exceed maximum
              if (numericSubScore > subCriteria.maxScore) {
                throw new Error(
                  `Score ${numericSubScore} for sub-criteria "${subCriteria.name}" exceeds maximum allowed ${subCriteria.maxScore} marks`
                );
              }
              if (numericSubScore < 0) {
                throw new Error(
                  `Score ${numericSubScore} for sub-criteria "${subCriteria.name}" cannot be negative`
                );
              }
            }
          }

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
            const createData: any = {
              studentId,
              assessmentSchemaId,
              enteredBy: user.id,
              branchId,
            };
            
            studentScore = await tx.studentAssessmentScore.create({
              data: createData,
              include: {
                componentScores: true,
              },
            });
          }

          // Handle component score
          if (componentId && studentScore) {
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
                  enteredBy: user.id,
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
                  enteredBy: user.id,
                },
              });
            }

            // Handle sub-criteria scores if provided
            if (subCriteriaScores && typeof subCriteriaScores === 'object') {
              for (const [subCriteriaId, subScore] of Object.entries(subCriteriaScores)) {
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
                      enteredBy: user.id,
                      updatedAt: new Date(),
                    },
                  });
                } else {
                  await tx.subCriteriaScore.create({
                    data: {
                      subCriteriaId,
                      componentScoreId: componentScore.id,
                      score: numericSubScore,
                      enteredBy: user.id,
                    },
                  });
                }
              }
            }
          }

                    if (studentScore) {
            console.log('SAVE: Created/updated score for student', studentId);
            savedScores.push(studentScore as any);
          }
        }

        console.log('BATCH: Saved', savedScores.length, 'scores in this batch');
        return savedScores;
        }, {
          timeout: 15000, // 15 seconds for batch processing
        });

        allSavedScores.push(...results);
      } catch (batchError) {
        console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
        throw new Error(`Failed to process batch ${batchIndex + 1}: ${batchError instanceof Error ? batchError.message : 'Unknown batch error'}`);
      }
    }

    // Recalculate final scores separately (outside the main transaction)
    // This prevents the main transaction from timing out
    if (studentsToRecalculate.size > 0) {
      // Run this in the background to avoid blocking the response
      setImmediate(() => {
        recalculateFinalScores(Array.from(studentsToRecalculate), user.id)
          .catch(error => {
            console.error('Error in background final score calculation:', error);
          });
      });
    }

    console.log('SUCCESS: Total scores processed:', allSavedScores.length);
    return NextResponse.json(allSavedScores);
  } catch (error) {
    console.error('Error saving assessment scores:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to save assessment scores';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Check for common database errors
      if (error.message.includes('timeout')) {
        errorMessage = 'Database operation timed out. Please try saving fewer scores at once.';
      } else if (error.message.includes('constraint')) {
        errorMessage = 'Data validation failed. Please check your input data.';
      } else if (error.message.includes('auth')) {
        errorMessage = 'Authentication failed. Please refresh the page and try again.';
      }
    }
    

    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const assessmentSchemaId = searchParams.get('assessmentSchemaId');
    const componentId = searchParams.get('componentId');

    if (!studentId || !assessmentSchemaId) {
      return NextResponse.json(
        { error: 'studentId and assessmentSchemaId are required' },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      // Find the student assessment score
      const studentScore = await tx.studentAssessmentScore.findFirst({
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

      if (!studentScore) {
        throw new Error('Student assessment score not found');
      }

      if (componentId) {
        // Remove specific component score
        const componentScore = studentScore.componentScores.find(cs => cs.componentId === componentId);
        if (componentScore) {
          // Delete sub-criteria scores first
          await tx.subCriteriaScore.deleteMany({
            where: {
              componentScoreId: componentScore.id,
            },
          });

          // Delete component score
          await tx.componentScore.delete({
            where: { id: componentScore.id },
          });
        }
      } else {
        // Remove all scores for this student and assessment
        // Delete all sub-criteria scores
        const componentScoreIds = studentScore.componentScores.map(cs => cs.id);
        if (componentScoreIds.length > 0) {
          await tx.subCriteriaScore.deleteMany({
            where: {
              componentScoreId: { in: componentScoreIds },
            },
          });

          // Delete all component scores
          await tx.componentScore.deleteMany({
            where: {
              studentAssessmentScoreId: studentScore.id,
            },
          });
        }

        // Delete the main student assessment score
        await tx.studentAssessmentScore.delete({
          where: { id: studentScore.id },
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Score removed successfully' });
  } catch (error) {
    console.error('Error removing assessment score:', error);
    return NextResponse.json(
      { error: 'Failed to remove assessment score' },
      { status: 500 }
    );
  }
} 