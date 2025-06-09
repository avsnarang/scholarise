import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

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

    // Save scores in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const savedScores = [];

      for (const scoreData of data) {
        const {
          studentId,
          assessmentSchemaId,
          componentScores,
          enteredBy,
        } = scoreData;

        // Find or create student assessment score
        let studentScore = await tx.studentAssessmentScore.findFirst({
          where: {
            studentId,
            assessmentSchemaId,
          },
        });

        if (studentScore) {
          studentScore = await tx.studentAssessmentScore.update({
            where: { id: studentScore.id },
            data: {
              enteredBy: enteredBy || userId,
              updatedAt: new Date(),
            },
          });
        } else {
          studentScore = await tx.studentAssessmentScore.create({
            data: {
              studentId,
              assessmentSchemaId,
              enteredBy: enteredBy || userId,
              branchId: 'temp', // This should be passed from the request
            },
          });
        }

        // Delete existing component scores to replace them
        await tx.componentScore.deleteMany({
          where: {
            studentAssessmentScoreId: studentScore.id,
          },
        });

        // Create new component scores
        if (componentScores && componentScores.length > 0) {
          for (const componentScore of componentScores) {
            const {
              componentId,
              rawScore,
              calculatedScore,
              subCriteriaScores,
            } = componentScore;

            const newComponentScore = await tx.componentScore.create({
              data: {
                studentAssessmentScoreId: studentScore.id,
                componentId,
                rawScore: rawScore ? Number(rawScore) : null,
                calculatedScore: calculatedScore ? Number(calculatedScore) : null,
                enteredBy: enteredBy || userId,
              },
            });

            // Create sub-criteria scores
            if (subCriteriaScores && subCriteriaScores.length > 0) {
              for (const subScore of subCriteriaScores) {
                const {
                  subCriteriaId,
                  score,
                  comments,
                } = subScore;

                await tx.subCriteriaScore.create({
                  data: {
                    componentScoreId: newComponentScore.id,
                    subCriteriaId,
                    score: score ? Number(score) : 0,
                    comments: comments || null,
                    enteredBy: enteredBy || userId,
                  },
                });
              }
            }
          }
        }

        savedScores.push(studentScore);
      }

      return savedScores;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error saving assessment scores:', error);
    return NextResponse.json(
      { error: 'Failed to save assessment scores' },
      { status: 500 }
    );
  }
} 