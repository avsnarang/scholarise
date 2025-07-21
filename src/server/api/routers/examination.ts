import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";

// Input schemas for validation
const gradeScaleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const gradeRangeSchema = z.object({
  gradeScaleId: z.string().min(1, "Grade scale is required"),
  grade: z.string().min(1, "Grade is required"),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().optional(),
  gradePoint: z.number().optional(),
  order: z.number().default(0),
});

const assessmentMarksSchema = z.object({
  assessmentConfigId: z.string().min(1, "Assessment config ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  marksObtained: z.number().min(0).optional(),
  comments: z.string().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

// Term schemas
const createTermSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  order: z.number().default(0),
  isCurrentTerm: z.boolean().default(false),
  branchId: z.string().min(1, "Branch ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
});

const updateTermSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  order: z.number().optional(),
  isCurrentTerm: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Assessment Schema schemas
const createAssessmentSchemaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  term: z.string().min(1, "Term is required"),
  classIds: z.array(z.string()).min(1, "At least one class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  branchId: z.string().min(1, "Branch is required"),
  totalMarks: z.number().positive().default(100),
  passingCriteria: z.number().optional(),
  description: z.string().optional(),
  components: z.array(z.object({
    name: z.string().min(1, "Component name is required"),
    rawMaxScore: z.number().positive(),
    reducedScore: z.number().min(0, "Reduced score must be non-negative (0 means no reduction)"),
    weightage: z.number().positive().default(1),
    formula: z.string().optional(),
    description: z.string().optional(),
    subCriteria: z.array(z.object({
      name: z.string().min(1, "Sub-criteria name is required"),
      maxScore: z.number().positive(),
      description: z.string().optional(),
    })).optional(),
})).min(1, "At least one component is required"),
});

const updateAssessmentSchemaSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  term: z.string().optional(),
  classIds: z.array(z.string()).optional(),
  subjectId: z.string().optional(),
  totalMarks: z.number().positive().optional(),
  passingCriteria: z.number().optional(),
  description: z.string().optional(),
  components: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Component name is required"),
    rawMaxScore: z.number().positive(),
    reducedScore: z.number().min(0, "Reduced score must be non-negative (0 means no reduction)"),
    weightage: z.number().positive().default(1),
    formula: z.string().optional(),
    description: z.string().optional(),
    subCriteria: z.array(z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Sub-criteria name is required"),
      maxScore: z.number().positive(),
      description: z.string().optional(),
    })).optional(),
  })).optional(),
});

export const examinationRouter = createTRPCRouter({
  // ============ TERMS MANAGEMENT ============
  getTerms: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {
        isActive: true,
      };

      if (input?.branchId) {
        where.branchId = input.branchId;
      }
      if (input?.sessionId) {
        where.sessionId = input.sessionId;
      }

      return ctx.db.term.findMany({
        where,
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          session: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { startDate: 'asc' },
        ],
      });
    }),

  createTerm: protectedProcedure
    .input(createTermSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate date range
      if (input.endDate <= input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Check for existing term with same name in branch and session
      const existingTerm = await ctx.db.term.findFirst({
        where: {
          name: input.name,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existingTerm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A term with this name already exists in the selected branch and session",
        });
      }

      // If this is marked as current term, unset other current terms in the same session
      if (input.isCurrentTerm) {
        await ctx.db.term.updateMany({
          where: {
            branchId: input.branchId,
            sessionId: input.sessionId,
            isCurrentTerm: true,
          },
          data: {
            isCurrentTerm: false,
          },
        });
      }

      return ctx.db.term.create({
        data: {
          name: input.name,
          description: input.description || null,
          startDate: input.startDate,
          endDate: input.endDate,
          order: input.order,
          isCurrentTerm: input.isCurrentTerm,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          session: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
    }),

  updateTerm: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Term ID is required"),
      data: updateTermSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      // Check if term exists
      const existingTerm = await ctx.db.term.findUnique({
        where: { id },
      });

      if (!existingTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Term not found",
        });
      }

      // Validate date range if dates are provided
      if (data.startDate && data.endDate && data.endDate <= data.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Check for name conflict if name is being changed
      if (data.name && data.name !== existingTerm.name) {
        const conflictingTerm = await ctx.db.term.findFirst({
          where: {
            name: data.name,
            branchId: existingTerm.branchId,
            sessionId: existingTerm.sessionId,
            id: { not: id },
          },
        });

        if (conflictingTerm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A term with this name already exists in the selected branch and session",
          });
        }
      }

      // If this is being marked as current term, unset other current terms in the same session
      if (data.isCurrentTerm && !existingTerm.isCurrentTerm) {
        await ctx.db.term.updateMany({
          where: {
            branchId: existingTerm.branchId,
            sessionId: existingTerm.sessionId,
            isCurrentTerm: true,
            id: { not: id },
          },
          data: {
            isCurrentTerm: false,
          },
        });
      }

      return ctx.db.term.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate && { endDate: data.endDate }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.isCurrentTerm !== undefined && { isCurrentTerm: data.isCurrentTerm }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          session: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
    }),

  deleteTerm: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Term ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if term exists
      const existingTerm = await ctx.db.term.findUnique({
        where: { id: input.id },
      });

      if (!existingTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Term not found",
        });
      }

      // TODO: Add checks for term usage in assessments, exams, etc.
      // For now, we'll do a soft delete by setting isActive to false
      return ctx.db.term.update({
        where: { id: input.id },
        data: {
          isActive: false,
          isCurrentTerm: false, // Remove current term status when deleting
        },
      });
    }),

  // ============ ASSESSMENT SCORES MANAGEMENT ============
  getAssessmentScores: protectedProcedure
    .input(z.object({
      assessmentSchemaId: z.string().min(1, "Assessment schema ID is required"),
      studentId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { assessmentSchemaId, studentId } = input;

      return ctx.db.studentAssessmentScore.findMany({
        where: {
          assessmentSchemaId,
          ...(studentId && { studentId }),
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              admissionNumber: true,
            },
          },
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
    }),

  saveAssessmentScores: protectedProcedure
    .input(z.array(z.object({
      studentId: z.string().min(1, "Student ID is required"),
      assessmentSchemaId: z.string().min(1, "Assessment schema ID is required"),
      componentId: z.string().optional(),
      marksObtained: z.number().min(0),
      branchId: z.string().min(1, "Branch ID is required"),
      comments: z.string().optional(),
      subCriteriaScores: z.record(z.number()).optional(),
      attendanceStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']).optional(),
      attendanceReason: z.string().optional(),
      attendanceNotes: z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('TRPC saveAssessmentScores called with input:', JSON.stringify(input, null, 2));

        // Validate that all scores belong to the same assessment schema
        const assessmentSchemaIds = [...new Set(input.map(score => score.assessmentSchemaId))];
        if (assessmentSchemaIds.length > 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All scores must belong to the same assessment schema",
          });
        }

        const assessmentSchemaId = assessmentSchemaIds[0];
        if (!assessmentSchemaId) {
          throw new TRPCError({
            code: "BAD_REQUEST", 
            message: "Assessment schema ID is required",
          });
        }
        console.log('Processing scores for assessment schema:', assessmentSchemaId);

        // Validate assessment schema exists and is active
        const assessmentSchema = await ctx.db.assessmentSchema.findUnique({
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
          console.error('Assessment schema not found:', assessmentSchemaId);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assessment schema not found",
          });
        }

        console.log('Found assessment schema:', assessmentSchema.name);
        console.log('Components count:', assessmentSchema.components.length);

        if (!assessmentSchema.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot save scores for inactive assessment schema",
          });
        }

        // Validate branch consistency
        const branchIds = [...new Set(input.map(score => score.branchId))];
        if (branchIds.length > 1 || branchIds[0] !== assessmentSchema.branchId) {
          console.error('Branch ID mismatch. Input branches:', branchIds, 'Schema branch:', assessmentSchema.branchId);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Branch ID mismatch with assessment schema",
          });
        }

        console.log('All validations passed. Processing', input.length, 'scores');

        // Process scores in transaction
        return ctx.db.$transaction(async (tx) => {
          const results = [];

          for (const scoreData of input) {
            const {
              studentId,
              componentId,
              marksObtained,
              subCriteriaScores,
              attendanceStatus,
              attendanceReason,
              attendanceNotes,
            } = scoreData;

            // Validate student exists
            const student = await tx.student.findUnique({
              where: { id: studentId },
            });

            if (!student) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Student not found: ${studentId}`,
              });
            }

            // Find or validate component if specified
            let targetComponent = null;
            if (componentId) {
              targetComponent = assessmentSchema.components.find(c => c.id === componentId);
              if (!targetComponent) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: `Component not found: ${componentId}`,
                });
              }

              // Validate marks don't exceed component maximum
              if (marksObtained > targetComponent.rawMaxScore) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Marks ${marksObtained} exceed maximum allowed ${targetComponent.rawMaxScore} for component ${targetComponent.name}`,
                });
              }

              // Validate sub-criteria scores if provided
              if (subCriteriaScores && Object.keys(subCriteriaScores).length > 0) {
                for (const [subCriteriaId, subScore] of Object.entries(subCriteriaScores)) {
                  const subCriteria = targetComponent.subCriteria.find(sc => sc.id === subCriteriaId);
                  if (!subCriteria) {
                    throw new TRPCError({
                      code: "NOT_FOUND",
                      message: `Sub-criteria not found: ${subCriteriaId}`,
                    });
                  }

                  if (subScore > subCriteria.maxScore) {
                    throw new TRPCError({
                      code: "BAD_REQUEST",
                      message: `Sub-criteria score ${subScore} exceeds maximum allowed ${subCriteria.maxScore} for ${subCriteria.name}`,
                    });
                  }
                }
              }
            } else {
              // For schema-level scores, validate against total marks
              if (marksObtained > assessmentSchema.totalMarks) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Marks ${marksObtained} exceed maximum allowed ${assessmentSchema.totalMarks}`,
                });
              }
            }

            // Create or update student assessment score
            const existingScore = await tx.studentAssessmentScore.findUnique({
              where: {
                studentId_assessmentSchemaId: {
                  studentId,
                  assessmentSchemaId,
                },
              },
            });

            let studentAssessmentScore;

            if (existingScore) {
              studentAssessmentScore = await tx.studentAssessmentScore.update({
                where: { id: existingScore.id },
                data: {
                  finalScore: marksObtained,
                  enteredBy: ctx.userId,
                  updatedAt: new Date(),
                },
              });
            } else {
              studentAssessmentScore = await tx.studentAssessmentScore.create({
                data: {
                  studentId,
                  assessmentSchemaId,
                  finalScore: marksObtained,
                  enteredBy: ctx.userId,
                  branchId: scoreData.branchId,
                },
              });
            }

            // Handle component-specific score
            if (componentId && targetComponent) {
              const existingComponentScore = await tx.componentScore.findUnique({
                where: {
                  componentId_studentAssessmentScoreId: {
                    componentId,
                    studentAssessmentScoreId: studentAssessmentScore.id,
                  },
                },
              });

              let componentScore;

              if (existingComponentScore) {
                componentScore = await tx.componentScore.update({
                  where: { id: existingComponentScore.id },
                  data: {
                    rawScore: marksObtained,
                    updatedAt: new Date(),
                  },
                });
              } else {
                componentScore = await tx.componentScore.create({
                  data: {
                    studentAssessmentScoreId: studentAssessmentScore.id,
                    componentId,
                    rawScore: marksObtained,
                    enteredBy: ctx.userId,
                  },
                });
              }

              // Handle sub-criteria scores
              if (subCriteriaScores && Object.keys(subCriteriaScores).length > 0) {
                // Delete existing sub-criteria scores for this component
                await tx.subCriteriaScore.deleteMany({
                  where: {
                    componentScore: {
                      studentAssessmentScoreId: studentAssessmentScore.id,
                      componentId,
                    },
                  },
                });

                // Create new sub-criteria scores
                for (const [subCriteriaId, subScore] of Object.entries(subCriteriaScores)) {
                  if (subScore > 0) {
                    await tx.subCriteriaScore.create({
                      data: {
                        componentScoreId: componentScore.id,
                        subCriteriaId,
                        score: subScore,
                        enteredBy: ctx.userId,
                      },
                    });
                  }
                }
              }
            }

            results.push(studentAssessmentScore);
          }

          return results;
        });
      } catch (error) {
        console.error('Error in saveAssessmentScores:', error);
        throw error;
      }
    }),

  deleteAssessmentScore: protectedProcedure
    .input(z.object({
      studentId: z.string().min(1, "Student ID is required"),
      assessmentSchemaId: z.string().min(1, "Assessment schema ID is required"),
      componentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { studentId, assessmentSchemaId, componentId } = input;

      return ctx.db.$transaction(async (tx) => {
        // Log deletion attempt
        console.log(`🗑️ Deleting assessment score - Student: ${studentId}, Schema: ${assessmentSchemaId}, Component: ${componentId || 'ALL'}`);

        if (componentId) {
          // Delete specific component score
          const studentScore = await tx.studentAssessmentScore.findUnique({
            where: {
              studentId_assessmentSchemaId: {
                studentId,
                assessmentSchemaId,
              },
            },
            include: {
              componentScores: {
                where: { componentId },
                include: { subCriteriaScores: true }
              }
            }
          });

          if (!studentScore) {
            console.log(`❌ No student assessment score found for deletion`);
            return { success: false, message: "Student assessment score not found" };
          }

          const targetComponent = studentScore.componentScores[0];
          if (!targetComponent) {
            console.log(`❌ No component score found for deletion`);
            return { success: false, message: "Component score not found" };
          }

          console.log(`🔍 Found component score with ${targetComponent.subCriteriaScores.length} sub-criteria scores`);

          // Delete sub-criteria scores first
          const subCriteriaDeleteResult = await tx.subCriteriaScore.deleteMany({
            where: {
              componentScore: {
                studentAssessmentScoreId: studentScore.id,
                componentId,
              },
            },
          });
          console.log(`🗑️ Deleted ${subCriteriaDeleteResult.count} sub-criteria scores`);

          // Delete component score
          const componentDeleteResult = await tx.componentScore.deleteMany({
            where: {
              studentAssessmentScoreId: studentScore.id,
              componentId,
            },
          });
          console.log(`🗑️ Deleted ${componentDeleteResult.count} component scores`);

          // Check if this was the last component - if so, delete the main record
          const remainingComponents = await tx.componentScore.count({
            where: {
              studentAssessmentScoreId: studentScore.id,
            },
          });

          if (remainingComponents === 0) {
            await tx.studentAssessmentScore.delete({
              where: { id: studentScore.id },
            });
            console.log(`🗑️ Deleted main assessment score record (no components remaining)`);
          }

        } else {
          // Delete entire student assessment score and related data
          const studentScore = await tx.studentAssessmentScore.findUnique({
            where: {
              studentId_assessmentSchemaId: {
                studentId,
                assessmentSchemaId,
              },
            },
            include: {
              componentScores: {
                include: { subCriteriaScores: true }
              }
            }
          });

          if (!studentScore) {
            console.log(`❌ No student assessment score found for deletion`);
            return { success: false, message: "Student assessment score not found" };
          }

          const totalSubCriteria = studentScore.componentScores.reduce((sum, comp) => sum + comp.subCriteriaScores.length, 0);
          console.log(`🔍 Found assessment score with ${studentScore.componentScores.length} components and ${totalSubCriteria} sub-criteria scores`);

          // Delete sub-criteria scores
          const subCriteriaDeleteResult = await tx.subCriteriaScore.deleteMany({
            where: {
              componentScore: {
                studentAssessmentScoreId: studentScore.id,
              },
            },
          });
          console.log(`🗑️ Deleted ${subCriteriaDeleteResult.count} sub-criteria scores`);

          // Delete component scores
          const componentDeleteResult = await tx.componentScore.deleteMany({
            where: {
              studentAssessmentScoreId: studentScore.id,
            },
          });
          console.log(`🗑️ Deleted ${componentDeleteResult.count} component scores`);

          // Delete student assessment score
          await tx.studentAssessmentScore.delete({
            where: { id: studentScore.id },
          });
          console.log(`🗑️ Deleted main assessment score record`);
        }

        // Verification step - ensure deletion was complete
        const remainingScore = await tx.studentAssessmentScore.findUnique({
          where: {
            studentId_assessmentSchemaId: {
              studentId,
              assessmentSchemaId,
            },
          },
        });

        if (remainingScore && !componentId) {
          console.error(`❌ DELETION VERIFICATION FAILED - Score still exists after full deletion`);
          throw new Error("Deletion verification failed - score still exists");
        }

        console.log(`✅ Deletion verification successful`);
        return { 
          success: true, 
          verified: true,
          message: `Successfully deleted ${componentId ? 'component' : 'all'} assessment scores`
        };
      });
    }),

  // Verification procedure to check for orphaned scores
  verifyAssessmentDataConsistency: protectedProcedure
    .input(z.object({
      assessmentSchemaId: z.string().min(1, "Assessment schema ID is required"),
      studentId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { assessmentSchemaId, studentId } = input;

      try {
        console.log('🔍 Verifying assessment data consistency for schema:', assessmentSchemaId);

        // Check for orphaned component scores (component scores without parent student assessment score)
        const orphanedComponentScores = await ctx.db.componentScore.findMany({
          where: {
            studentScore: {
              assessmentSchemaId,
              ...(studentId && { studentId }),
            },
          },
          include: {
            studentScore: true,
            subCriteriaScores: true,
          },
        });

        // Check for orphaned sub-criteria scores (sub-criteria scores without parent component score)
        const orphanedSubCriteriaScores = await ctx.db.subCriteriaScore.findMany({
          where: {
            componentScore: {
              studentScore: {
                assessmentSchemaId,
                ...(studentId && { studentId }),
              },
            },
          },
          include: {
            componentScore: {
              include: {
                studentScore: true,
              },
            },
          },
        });

        // Check for student assessment scores without any component scores
        const incompleteStudentScores = await ctx.db.studentAssessmentScore.findMany({
          where: {
            assessmentSchemaId,
            ...(studentId && { studentId }),
            componentScores: {
              none: {},
            },
          },
        });

        const issues: string[] = [];
        const summary = {
          orphanedComponentScores: orphanedComponentScores.length,
          orphanedSubCriteriaScores: orphanedSubCriteriaScores.length,
          incompleteStudentScores: incompleteStudentScores.length,
        };

        if (orphanedComponentScores.length > 0) {
          issues.push(`Found ${orphanedComponentScores.length} orphaned component scores`);
        }

        if (orphanedSubCriteriaScores.length > 0) {
          issues.push(`Found ${orphanedSubCriteriaScores.length} orphaned sub-criteria scores`);
        }

        if (incompleteStudentScores.length > 0) {
          issues.push(`Found ${incompleteStudentScores.length} student assessment scores without component scores`);
        }

        const isConsistent = issues.length === 0;

        console.log(isConsistent ? '✅ Data consistency verified' : '❌ Data consistency issues found:', summary);

        return {
          isConsistent,
          issues,
          summary,
          details: {
            orphanedComponentScores: orphanedComponentScores.map(score => ({
              id: score.id,
              studentId: score.studentScore?.studentId,
              componentId: score.componentId,
            })),
            orphanedSubCriteriaScores: orphanedSubCriteriaScores.map(score => ({
              id: score.id,
              componentScoreId: score.componentScoreId,
              subCriteriaId: score.subCriteriaId,
            })),
            incompleteStudentScores: incompleteStudentScores.map(score => ({
              id: score.id,
              studentId: score.studentId,
            })),
          },
        };
      } catch (error) {
        console.error('❌ Data consistency verification failed:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify data consistency",
        });
      }
    }),

  // ============ ASSESSMENT MARKS ============
  createAssessmentMarks: protectedProcedure
    .input(assessmentMarksSchema)
    .mutation(async ({ ctx, input }) => {
      const { assessmentConfigId, studentId, marksObtained, comments, branchId } = input;

      // Check if assessment configuration exists
      const assessmentConfig = await ctx.db.assessmentConfiguration.findUnique({
        where: { id: assessmentConfigId },
      });

      if (!assessmentConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment configuration not found",
        });
      }

      // Validate marks don't exceed maximum
      if (marksObtained !== undefined && marksObtained > assessmentConfig.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks ${marksObtained} exceed maximum allowed ${assessmentConfig.maxMarks}`,
        });
      }

      // Check if student exists
      const student = await ctx.db.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Create or update assessment marks
      const existingMarks = await ctx.db.assessmentMarks.findUnique({
        where: {
          assessmentConfigId_studentId: {
            assessmentConfigId,
            studentId,
          },
        },
      });

      let assessmentMarks;

      if (existingMarks) {
        // Update existing marks
        assessmentMarks = await ctx.db.assessmentMarks.update({
          where: { id: existingMarks.id },
          data: {
            marksObtained,
            comments,
            enteredBy: ctx.userId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new marks record
        assessmentMarks = await ctx.db.assessmentMarks.create({
          data: {
            id: createId(),
            assessmentConfigId,
            studentId,
            marksObtained,
            comments,
            enteredBy: ctx.userId,
            branchId,
            updatedAt: new Date(),
          },
        });
      }

      return assessmentMarks;
    }),

  getAssessmentMarks: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      assessmentConfigId: z.string(),
      studentId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, assessmentConfigId, studentId } = input;

      const marks = await ctx.db.assessmentMarks.findMany({
        where: {
          branchId,
          assessmentConfigId,
          ...(studentId && { studentId }),
        },
        include: {
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              admissionNumber: true,
            },
          },
          AssessmentConfiguration: {
            select: {
              id: true,
              name: true,
              maxMarks: true,
            },
          },
        },
        orderBy: [
          { Student: { rollNumber: 'asc' } },
          { Student: { firstName: 'asc' } },
        ],
      });

      return marks;
    }),

  updateAssessmentMarks: protectedProcedure
    .input(z.object({
      id: z.string(),
      marksObtained: z.number().min(0).optional(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, marksObtained, comments } = input;

      // Get the existing record to validate marks
      const existingMarks = await ctx.db.assessmentMarks.findUnique({
        where: { id },
        include: {
          AssessmentConfiguration: true,
        },
      });

      if (!existingMarks) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment marks not found",
        });
      }

      // Validate marks don't exceed maximum
      if (marksObtained !== undefined && marksObtained > existingMarks.AssessmentConfiguration.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks ${marksObtained} exceed maximum allowed ${existingMarks.AssessmentConfiguration.maxMarks}`,
        });
      }

             return ctx.db.assessmentMarks.update({
         where: { id },
         data: {
           marksObtained,
           comments,
           enteredBy: ctx.userId,
           updatedAt: new Date(),
         },
       });
    }),

  deleteAssessmentMarks: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentMarks.delete({
        where: { id: input.id },
      });
    }),

  // ============ GRADE SCALES ============
  createGradeScale: protectedProcedure
    .input(gradeScaleSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      // If this is set as default, unset other defaults
      if (data.isDefault) {
        await ctx.db.gradeScale.updateMany({
          where: {
            branchId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return ctx.db.gradeScale.create({
        data: {
          ...data,
          branchId,
        },
      });
    }),

  getGradeScales: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.gradeScale.findMany({
        where: {
          branchId,
          isActive: input?.isActive,
        },
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { name: "asc" },
        ],
      });
    }),

  updateGradeScale: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeScaleSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If this is being set as default, unset other defaults
      if (input.data.isDefault) {
        const gradeScale = await ctx.db.gradeScale.findUnique({
          where: { id: input.id },
        });

        if (gradeScale) {
          await ctx.db.gradeScale.updateMany({
            where: {
              branchId: gradeScale.branchId,
              isDefault: true,
              id: { not: input.id },
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: input.data,
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  deleteGradeScale: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ GRADE RANGES ============
  createGradeRange: protectedProcedure
    .input(gradeRangeSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate percentage range
      if (input.minPercentage >= input.maxPercentage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum percentage must be less than maximum percentage",
        });
      }

      return ctx.db.gradeRange.create({
        data: input,
      });
    }),

  getGradeRanges: protectedProcedure
    .input(z.object({
      gradeScaleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gradeRange.findMany({
        where: {
          gradeScaleId: input.gradeScaleId,
        },
        orderBy: { order: "asc" },
      });
    }),

  updateGradeRange: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeRangeSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteGradeRange: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.delete({
        where: { id: input.id },
      });
    }),

  // ============ ASSESSMENT SCHEMAS MANAGEMENT ============
  getAssessmentSchemas: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.branchId) {
        where.branchId = input.branchId;
      }

      // Get assessment schemas with basic counts
      const schemas = await ctx.db.assessmentSchema.findMany({
        where,
        include: {
          class: true,
          subject: true,
          termRelation: true,
          components: {
            include: {
              subCriteria: true,
            },
            orderBy: { order: 'asc' },
          },
          permissions: true,
          _count: {
            select: {
              studentAssessmentScores: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get component score counts for each schema to determine actual protection status
      const schemaIds = schemas.map(schema => schema.id);
      
      let componentScoreCounts: Record<string, number> = {};
      
      if (schemaIds.length > 0) {
        // Query to count component scores for each assessment schema
        const componentScoreQuery = await ctx.db.$queryRaw<Array<{ assessmentSchemaId: string; componentCount: bigint }>>`
          SELECT 
            ac."assessmentSchemaId",
            COUNT(cs.id)::bigint as "componentCount"
          FROM "AssessmentComponent" ac
          LEFT JOIN "ComponentScore" cs ON cs."componentId" = ac.id
          WHERE ac."assessmentSchemaId" = ANY(${schemaIds})
          GROUP BY ac."assessmentSchemaId"
        `;

        componentScoreCounts = componentScoreQuery.reduce((acc, row) => {
          acc[row.assessmentSchemaId] = Number(row.componentCount);
          return acc;
        }, {} as Record<string, number>);
      }

      // Add component score counts to each schema
      const schemasWithCounts = schemas.map(schema => ({
        ...schema,
        _count: {
          ...schema._count,
          componentScores: componentScoreCounts[schema.id] || 0,
        },
      }));

      console.log('📊 Assessment schemas with protection counts:', schemasWithCounts.map(s => ({
        name: s.name,
        studentScores: s._count.studentAssessmentScores,
        componentScores: s._count.componentScores,
        isProtected: s._count.componentScores > 0
      })));

      return schemasWithCounts;
    }),

  createAssessmentSchema: protectedProcedure
    .input(createAssessmentSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const { classIds, components, ...schemaData } = input;

      // Parse and validate class-section selections
      const appliedClassesData: Array<{
        classId: string;
        className: string;
        sectionId?: string;
        sectionName?: string;
      }> = [];
      const allClassIds = new Set<string>();

      for (const classIdString of classIds) {
        let actualClassId: string;
        let sectionId: string | null = null;

        // Parse class ID from the format "classId" or "classId-sectionId"
        if (classIdString.includes('-')) {
          const parts = classIdString.split('-');
          const firstPart = parts[0];
          const secondPart = parts[1];
          
          if (!firstPart) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid class ID format: ${classIdString}`,
            });
          }
          
          actualClassId = firstPart;
          sectionId = secondPart || null;
        } else {
          actualClassId = classIdString;
        }

        if (!actualClassId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid class ID format: ${classIdString}`,
          });
        }

        allClassIds.add(actualClassId);
        appliedClassesData.push({
          classId: actualClassId,
          className: actualClassId, // Placeholder, will be fetched
          sectionId: sectionId || undefined,
          sectionName: sectionId ? 'Section' : undefined // Placeholder
        });
      }

      // Use the first class ID as the primary class for the schema
      const primaryClassId = allClassIds.values().next().value;
      if (!primaryClassId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one class must be selected",
        });
      }

      // Check for existing schema with same name, subject, and term
      const existingSchema = await ctx.db.assessmentSchema.findFirst({
        where: {
          name: schemaData.name,
          subjectId: schemaData.subjectId,
          term: schemaData.term,
          branchId: schemaData.branchId,
        },
      });

      if (existingSchema) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assessment schema already exists for this subject and term combination",
        });
      }

      // Create assessment schema with components in a transaction
      return ctx.db.$transaction(async (tx) => {
        // Create the main schema
        const newSchema = await tx.assessmentSchema.create({
          data: {
            name: schemaData.name,
            term: schemaData.term,
            classId: primaryClassId,
            subjectId: schemaData.subjectId,
            branchId: schemaData.branchId,
            totalMarks: schemaData.totalMarks,
            isActive: true,
            createdBy: ctx.userId,
            appliedClasses: appliedClassesData,
          },
        });

        // Create components
        for (const [index, component] of components.entries()) {
          const newComponent = await tx.assessmentComponent.create({
            data: {
              name: component.name,
              rawMaxScore: component.rawMaxScore,
              reducedScore: component.reducedScore,
              weightage: component.weightage,
              formula: component.formula,
              description: component.description,
              order: index,
              assessmentSchemaId: newSchema.id,
            },
          });

          // Create sub-criteria if provided
          if (component.subCriteria && component.subCriteria.length > 0) {
            for (const [subIndex, subCriteria] of component.subCriteria.entries()) {
              await tx.assessmentSubCriteria.create({
                data: {
                  name: subCriteria.name,
                  maxScore: subCriteria.maxScore,
                  description: subCriteria.description,
                  order: subIndex,
                  componentId: newComponent.id,
                },
              });
            }
          }
        }

        // Return the created schema with relations
        return tx.assessmentSchema.findUnique({
          where: { id: newSchema.id },
          include: {
            class: true,
            subject: true,
            termRelation: true,
            components: {
              include: {
                subCriteria: true,
              },
              orderBy: { order: 'asc' },
            },
            permissions: true,
          },
        });
      });
    }),

  updateAssessmentSchema: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Schema ID is required"),
      data: updateAssessmentSchemaSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      // Check if schema exists
      const existingSchema = await ctx.db.assessmentSchema.findUnique({
        where: { id },
        include: { 
          components: { include: { subCriteria: true } }
        }
      });

      if (!existingSchema) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment schema not found",
        });
      }

      // Check if there are any actual component scores (real marks) - prevent editing if they exist
      const componentScoreCount = await ctx.db.componentScore.count({
        where: {
          component: {
            assessmentSchemaId: id
          }
        }
      });

      if (componentScoreCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot edit assessment schema. It has ${componentScoreCount} actual mark(s) entered. Please remove all component scores first.`,
        });
      }

      // Update schema in transaction
      return ctx.db.$transaction(async (tx) => {
        // Update basic schema data
        const updatedSchema = await tx.assessmentSchema.update({
          where: { id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.term && { term: data.term }),
            ...(data.subjectId && { subjectId: data.subjectId }),
            ...(data.totalMarks && { totalMarks: data.totalMarks }),
            ...(data.passingCriteria !== undefined && { passingCriteria: data.passingCriteria }),
            ...(data.description !== undefined && { description: data.description }),
          },
        });

        // Update components if provided
        if (data.components) {
          // Delete existing components and sub-criteria
          await tx.assessmentSubCriteria.deleteMany({
            where: {
              component: {
                assessmentSchemaId: id
              }
            }
          });

          await tx.assessmentComponent.deleteMany({
            where: { assessmentSchemaId: id }
          });

          // Create new components
          for (const [index, component] of data.components.entries()) {
            const newComponent = await tx.assessmentComponent.create({
              data: {
                name: component.name,
                rawMaxScore: component.rawMaxScore,
                reducedScore: component.reducedScore,
                weightage: component.weightage,
                formula: component.formula,
                description: component.description,
                order: index,
                assessmentSchemaId: id,
              },
            });

            // Create sub-criteria if provided
            if (component.subCriteria && component.subCriteria.length > 0) {
              for (const [subIndex, subCriteria] of component.subCriteria.entries()) {
                await tx.assessmentSubCriteria.create({
                  data: {
                    name: subCriteria.name,
                    maxScore: subCriteria.maxScore,
                    description: subCriteria.description,
                    order: subIndex,
                    componentId: newComponent.id,
                  },
                });
              }
            }
          }
        }

        // Return updated schema with relations
        return tx.assessmentSchema.findUnique({
          where: { id },
          include: {
            class: true,
            subject: true,
            termRelation: true,
            components: {
              include: {
                subCriteria: true,
              },
              orderBy: { order: 'asc' },
            },
            permissions: true,
          },
        });
      });
    }),

  updateAssessmentSchemaStatus: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Schema ID is required"),
      action: z.enum(['set-draft', 'set-published', 'freeze-marks']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, action } = input;

      // Check if schema exists
      const existingSchema = await ctx.db.assessmentSchema.findUnique({
        where: { id },
      });

      if (!existingSchema) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment schema not found",
        });
      }

      let updateData: any = {};

      switch (action) {
        case 'set-draft':
          updateData = { isPublished: false, isActive: true };
          break;
        case 'set-published':
          updateData = { isPublished: true, isActive: true };
          break;
        case 'freeze-marks':
          updateData = { isPublished: true, isActive: false };
          break;
      }

      return ctx.db.assessmentSchema.update({
        where: { id },
        data: updateData,
        include: {
          class: true,
          subject: true,
          termRelation: true,
          components: {
            include: {
              subCriteria: true,
            },
            orderBy: { order: 'asc' },
          },
          permissions: true,
        },
      });
    }),

  deleteAssessmentSchema: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Schema ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Check if schema exists
      const existingSchema = await ctx.db.assessmentSchema.findUnique({
        where: { id },
      });

      if (!existingSchema) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment schema not found",
        });
      }

      // Check if there are any actual component scores (real marks) - prevent deletion if they exist
      const componentScoreCount = await ctx.db.componentScore.count({
        where: {
          component: {
            assessmentSchemaId: id
          }
        }
      });

      if (componentScoreCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete assessment schema. It has ${componentScoreCount} actual mark(s) entered. Please remove all component scores before deleting the schema.`,
        });
      }

      // Delete schema and related data in transaction
      return ctx.db.$transaction(async (tx) => {
        // Delete sub-criteria
        await tx.assessmentSubCriteria.deleteMany({
          where: {
            component: {
              assessmentSchemaId: id
            }
          }
        });

        // Delete components
        await tx.assessmentComponent.deleteMany({
          where: { assessmentSchemaId: id }
        });

        // Delete the schema
        return tx.assessmentSchema.delete({
          where: { id },
        });
      });
    }),
}); 