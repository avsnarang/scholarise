import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { splitTextIntoSections, generateQuestions } from "@/utils/ai-service";
import { extractTextFromPdf } from "@/utils/pdf-parser-server";

// Type assertion to bypass TypeScript errors for models not recognized
type AnyPrismaClient = any;

export const questionPaperRouter = createTRPCRouter({
  // Board endpoints
  getBoards: protectedProcedure.query(async ({ ctx }) => {
    return (ctx.db as AnyPrismaClient).educationBoard.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  getBoardById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).educationBoard.findUnique({
        where: { id: input.id },
      });
    }),

  createBoard: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        code: z.string().min(1, "Code is required"),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if a board with the same code already exists
      const existingBoard = await (ctx.db as AnyPrismaClient).educationBoard.findFirst({
        where: { code: input.code },
      });

      if (existingBoard) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A board with this code already exists",
        });
      }

      return (ctx.db as AnyPrismaClient).educationBoard.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description,
          isActive: input.isActive,
        },
      });
    }),

  updateBoard: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        code: z.string().min(1, "Code is required"),
        description: z.string().optional(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if a different board with the same code already exists
      const existingBoard = await (ctx.db as AnyPrismaClient).educationBoard.findFirst({
        where: {
          code: input.code,
          id: { not: input.id },
        },
      });

      if (existingBoard) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Another board with this code already exists",
        });
      }

      return (ctx.db as AnyPrismaClient).educationBoard.update({
        where: { id: input.id },
        data: {
          name: input.name,
          code: input.code,
          description: input.description,
          isActive: input.isActive,
        },
      });
    }),

  deleteBoard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if this board is used in any blueprints
      const usedInBlueprints = await (ctx.db as AnyPrismaClient).blueprint.findFirst({
        where: { boardId: input.id },
      });

      if (usedInBlueprints) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This board is used in blueprints and cannot be deleted",
        });
      }

      return (ctx.db as AnyPrismaClient).educationBoard.delete({
        where: { id: input.id },
      });
    }),

  // Chapter endpoints
  getChaptersBySubject: protectedProcedure
    .input(z.object({ subjectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).chapter.findMany({
        where: {
          subjectId: input.subjectId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  // SubTopic endpoints
  getSubTopicsByChapter: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).subTopic.findMany({
        where: {
          chapterId: input.chapterId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  // Question endpoints
  getQuestionsBySubTopic: protectedProcedure
    .input(z.object({ subTopicId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).question.findMany({
        where: {
          subTopicId: input.subTopicId,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getQuestionsByChapter: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).question.findMany({
        where: {
          chapterId: input.chapterId,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // AI Question Generation endpoints
  processTextbook: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
        fileName: z.string(),
        classId: z.string(),
        subjectId: z.string(),
        chapterId: z.string(),
        useBatchProcessing: z.boolean().optional().default(true),
        batchSize: z.number().int().positive().optional().default(5),
        batchConcurrency: z.number().int().positive().optional().default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Create a processing record
      const textbookProcessing = await (ctx.db as AnyPrismaClient).textbookProcessing.create({
        data: {
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          classId: input.classId,
          subjectId: input.subjectId, 
          chapterId: input.chapterId,
          status: "PROCESSING",
          creatorId: (ctx as any).session.user.id,
          batchProcessingUsed: input.useBatchProcessing,
          batchSize: input.batchSize,
          batchConcurrency: input.batchConcurrency,
        },
      });

      // Start processing in the background
      // In a production environment, you would use a task queue like Bull or a serverless function
      // and not directly call the AI service here since it may timeout the request
      setTimeout(async () => {
        try {
          // Record processing start time
          const processingStartTime = Date.now();

          // Extract text from the PDF
          const textContent = await extractTextFromPdf(input.fileUrl);
          
          // Split text into manageable sections (to handle token limits)
          const textSections = splitTextIntoSections(textContent);
          
          const difficultyLevels = ["Easy", "Medium", "Hard"] as const;
          
          // Try to use custom counts if defined in local storage
          let questionCounts = { "Easy": 20, "Medium": 20, "Hard": 10 };
          if (typeof window !== 'undefined') {
            try {
              const storedCounts = localStorage.getItem('question_counts');
              if (storedCounts) {
                const parsedCounts = JSON.parse(storedCounts);
                questionCounts = {
                  "Easy": parsedCounts.easy || 20,
                  "Medium": parsedCounts.medium || 20,
                  "Hard": parsedCounts.hots || 10
                };
              }
            } catch (error) {
              console.error("Error parsing question counts from localStorage:", error);
            }
          }
          
          const allQuestions = [];
          
          // Generate questions for each difficulty level
          for (const difficulty of difficultyLevels) {
            // Use the first section for question generation (in production, you might want to use multiple sections)
            const textSection = textSections[0] || "";
            
            // Generate questions using OpenAI
            const generatedQuestions = await generateQuestions(
              textSection, 
              difficulty, 
              'Objective', // Default to objective questions
              undefined, // No specific subtype
              undefined, // No specific subject
              questionCounts[difficulty],
              input.useBatchProcessing // Use batch processing if specified
            );
            
            // Map the generated questions to the database schema
            const dbQuestions = generatedQuestions.map(q => ({
              text: q.text,
              type: q.type,
              difficulty: difficulty,
              marks: q.marks,
              chapterId: input.chapterId,
              isActive: true,
              isAIGenerated: true,
              creatorId: (ctx as any).session.user.id,
            }));
            
            allQuestions.push(...dbQuestions);
          }
          
          // Create the questions in the database
          await (ctx.db as AnyPrismaClient).question.createMany({
            data: allQuestions,
          });
          
          // Update the processing record
          await (ctx.db as AnyPrismaClient).textbookProcessing.update({
            where: { id: textbookProcessing.id },
            data: {
              status: "COMPLETED",
              questionsGenerated: allQuestions.length,
              completedAt: new Date(),
              processingDuration: Math.floor((Date.now() - processingStartTime) / 1000), // Duration in seconds
            },
          });
        } catch (error) {
          console.error("Error processing textbook:", error);
          // Update the processing record with error status
          await (ctx.db as AnyPrismaClient).textbookProcessing.update({
            where: { id: textbookProcessing.id },
            data: {
              status: "FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }, 100);

      return textbookProcessing;
    }),

  // Admin-only endpoint for textbook processing
  adminProcessTextbook: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
        fileName: z.string(),
        classId: z.string(),
        subjectId: z.string(),
        chapterId: z.string(),
        useBatchProcessing: z.boolean().optional().default(true),
        batchSize: z.number().int().positive().optional().default(5),
        batchConcurrency: z.number().int().positive().optional().default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create a processing record with QUEUED status
      const textbookProcessing = await (ctx.db as AnyPrismaClient).textbookProcessing.create({
        data: {
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          classId: input.classId,
          subjectId: input.subjectId,
          chapterId: input.chapterId,
          status: "QUEUED",
          creatorId: (ctx as any).session.user.id,
          batchProcessingUsed: input.useBatchProcessing,
          batchSize: input.batchSize,
          batchConcurrency: input.batchConcurrency,
        },
      });
      
      // Start processing in the background
      setTimeout(async () => {
        try {
          // Record processing start time
          const processingStartTime = Date.now();

          // Update status to PROCESSING
          await (ctx.db as AnyPrismaClient).textbookProcessing.update({
            where: { id: textbookProcessing.id },
            data: { status: "PROCESSING" },
          });
          
          // Extract text from the PDF
          const textContent = await extractTextFromPdf(input.fileUrl);
          
          // Split text into manageable sections (to handle token limits)
          const textSections = splitTextIntoSections(textContent);
          
          // Define difficulty levels and question counts (default values)
          const difficultyLevels = ["Easy", "Medium", "Hard"] as const;
          
          // Try to use custom counts if defined in local storage
          let questionCounts = { "Easy": 20, "Medium": 20, "Hard": 10 };
          if (typeof window !== 'undefined') {
            try {
              const storedCounts = localStorage.getItem('question_counts');
              if (storedCounts) {
                const parsedCounts = JSON.parse(storedCounts);
                questionCounts = {
                  "Easy": parsedCounts.easy || 20,
                  "Medium": parsedCounts.medium || 20,
                  "Hard": parsedCounts.hots || 10
                };
              }
            } catch (error) {
              console.error("Error parsing question counts from localStorage:", error);
            }
          }
          
          const allQuestions = [];
          
          // Process each text section and generate questions for each difficulty level
          for (const difficulty of difficultyLevels) {
            try {
              // Use the first section for now (in a full implementation, you might want to process multiple sections)
              const textSection = textSections[0] || "";
              const count = questionCounts[difficulty];
              
              // Generate questions using OpenAI
              const generatedQuestions = await generateQuestions(
                textSection, 
                difficulty,
                'Objective', // Default to objective questions
                undefined, // No specific subtype
                undefined, // No specific subject 
                count,
                input.useBatchProcessing // Use batch processing if specified
              );
              
              // Map the generated questions to the database schema
              const dbQuestions = generatedQuestions.map(q => ({
                text: q.text,
                type: q.type,
                difficulty: difficulty,
                marks: q.marks,
                chapterId: input.chapterId,
                isActive: true,
                isAIGenerated: true,
                creatorId: (ctx as any).session.user.id,
              }));
              
              allQuestions.push(...dbQuestions);
            } catch (error) {
              console.error(`Error generating ${difficulty} questions:`, error);
              // Continue with other difficulty levels even if one fails
            }
          }
          
          if (allQuestions.length === 0) {
            throw new Error("Failed to generate any questions");
          }
          
          // Create all questions in the database
          await (ctx.db as AnyPrismaClient).question.createMany({
            data: allQuestions,
          });
          
          // Update the processing record as completed
          await (ctx.db as AnyPrismaClient).textbookProcessing.update({
            where: { id: textbookProcessing.id },
            data: {
              status: "COMPLETED",
              questionsGenerated: allQuestions.length,
              completedAt: new Date(),
              processingDuration: Math.floor((Date.now() - processingStartTime) / 1000), // Duration in seconds
            },
          });
        } catch (error) {
          console.error("Error processing textbook:", error);
          // Update the processing record with error status
          await (ctx.db as AnyPrismaClient).textbookProcessing.update({
            where: { id: textbookProcessing.id },
            data: {
              status: "FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }, 100);
      
      return textbookProcessing;
    }),

  getTextbookProcessingHistory: protectedProcedure.query(async ({ ctx }) => {
    return (ctx.db as AnyPrismaClient).textbookProcessing.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getAIGeneratedQuestions: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).question.findMany({
        where: {
          chapterId: input.chapterId,
          isActive: true,
          isAIGenerated: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Filter questions by source (AI or manual) and difficulty
  getFilteredQuestions: protectedProcedure
    .input(
      z.object({
        chapterId: z.string().optional(),
        isAIGenerated: z.boolean().optional(),
        difficulty: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { isActive: true };
      
      if (input.chapterId) where.chapterId = input.chapterId;
      if (input.isAIGenerated !== undefined) where.isAIGenerated = input.isAIGenerated;
      if (input.difficulty) where.difficulty = input.difficulty;
      
      return (ctx.db as AnyPrismaClient).question.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }),

  getTextbookProcessingStatus: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).textbookProcessing.findFirst({
        where: {
          chapterId: input.chapterId,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Blueprint endpoints
  createBlueprint: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        classId: z.string(),
        boardId: z.string().optional(),
        chapters: z.array(z.string()), // chapter IDs
        sections: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            questionCount: z.number().int().positive(),
            instructions: z.string().optional(),
            sectionOrder: z.number().int().nonnegative(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create the blueprint
      const blueprint = await (ctx.db as AnyPrismaClient).blueprint.create({
        data: {
          name: input.name,
          description: input.description,
          classId: input.classId,
          boardId: input.boardId,
          creatorId: (ctx as any).session.user.id,
        },
      });

      // Add chapters to the blueprint
      await (ctx.db as AnyPrismaClient).blueprintChapter.createMany({
        data: input.chapters.map((chapterId) => ({
          blueprintId: blueprint.id,
          chapterId,
        })),
      });

      // Add sections to the blueprint
      await (ctx.db as AnyPrismaClient).blueprintSection.createMany({
        data: input.sections.map((section) => ({
          blueprintId: blueprint.id,
          name: section.name,
          description: section.description,
          questionCount: section.questionCount,
          instructions: section.instructions,
          sectionOrder: section.sectionOrder,
        })),
      });

      return blueprint;
    }),

  getBlueprints: protectedProcedure.query(async ({ ctx }) => {
    return (ctx.db as AnyPrismaClient).blueprint.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        class: true,
        board: true,
        chapters: {
          include: {
            chapter: true,
          },
        },
        sections: true,
      },
    });
  }),

  getBlueprintById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).blueprint.findUnique({
        where: { id: input.id },
        include: {
          class: true,
          board: true,
          chapters: {
            include: {
              chapter: {
                include: {
                  questions: true,
                },
              },
            },
          },
          sections: {
            orderBy: {
              sectionOrder: "asc",
            },
          },
        },
      });
    }),

  // Question Paper endpoints
  createQuestionPaper: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        duration: z.number().int().positive().optional(),
        blueprintId: z.string(),
        sections: z.array(
          z.object({
            blueprintSectionId: z.string(),
            name: z.string(),
            instructions: z.string().optional(),
            questions: z.array(
              z.object({
                questionId: z.string(),
                marks: z.number().int().positive().optional(),
                questionOrder: z.number().int().nonnegative(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate total marks
      let totalMarks = 0;
      for (const section of input.sections) {
        for (const question of section.questions) {
          if (question.marks) {
            totalMarks += question.marks;
          } else {
            // Get default marks from the question
            const questionData = await (ctx.db as AnyPrismaClient).question.findUnique({
              where: { id: question.questionId },
              select: { marks: true },
            });
            totalMarks += questionData?.marks ?? 0;
          }
        }
      }

      // Create the question paper
      const questionPaper = await (ctx.db as AnyPrismaClient).questionPaper.create({
        data: {
          title: input.title,
          description: input.description,
          duration: input.duration,
          totalMarks,
          blueprintId: input.blueprintId,
          creatorId: (ctx as any).session.user.id,
        },
      });

      // Create sections and questions
      for (const section of input.sections) {
        const paperSection = await (ctx.db as AnyPrismaClient).paperSection.create({
          data: {
            questionPaperId: questionPaper.id,
            blueprintSectionId: section.blueprintSectionId,
            name: section.name,
            instructions: section.instructions,
            sectionOrder: 0, // Default to 0 since it's missing from the input
          },
        });

        // Add questions to the section
        await (ctx.db as AnyPrismaClient).paperQuestion.createMany({
          data: section.questions.map((question) => ({
            paperSectionId: paperSection.id,
            questionId: question.questionId,
            questionOrder: question.questionOrder,
            marks: question.marks,
          })),
        });
      }

      return questionPaper;
    }),

  getQuestionPapers: protectedProcedure.query(async ({ ctx }) => {
    return (ctx.db as AnyPrismaClient).questionPaper.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        blueprint: {
          include: {
            class: true,
          },
        },
      },
    });
  }),

  getQuestionPaperById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return (ctx.db as AnyPrismaClient).questionPaper.findUnique({
        where: { id: input.id },
        include: {
          blueprint: {
            include: {
              class: true,
              board: true,
            },
          },
          sections: {
            include: {
              questions: {
                include: {
                  question: true,
                },
                orderBy: {
                  questionOrder: "asc",
                },
              },
            },
            orderBy: {
              sectionOrder: "asc",
            },
          },
        },
      });
    }),
}); 