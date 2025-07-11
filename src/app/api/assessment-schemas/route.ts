import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const schemas = await db.assessmentSchema.findMany({
      where: {
        ...(branchId && { branchId }),
      },
      include: {
        class: true,
        subject: true,
        components: {
          include: {
            subCriteria: true,
          },
          orderBy: { order: 'asc' },
        },
        permissions: true,
        _count: {
          select: {
            studentScores: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(schemas);
  } catch (error) {
    console.error('Error fetching assessment schemas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment schemas' },
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
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    const {
      name,
      term,
      classIds,
      subjectId,
      branchId,
      totalMarks,
      passingCriteria,
      description,
      components,
    } = data;

    // Validate required fields
    if (!name || !term || !classIds || !Array.isArray(classIds) || classIds.length === 0 || !subjectId || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, term, classIds, subjectId, branchId' },
        { status: 400 }
      );
    }

    // Validate components
    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: 'At least one component is required' },
        { status: 400 }
      );
    }

    // Parse and validate class-section selections
    const appliedClassesData = [];
    const allClassIds = new Set<string>();

    for (const classIdString of classIds) {
      let actualClassId: string;
      let sectionId: string | null = null;

      // Parse class ID from the format "classId" or "classId-sectionId"
      if (classIdString.includes('-')) {
        const parts = classIdString.split('-');
        actualClassId = parts[0];
        sectionId = parts[1];
      } else {
        actualClassId = classIdString;
      }

      if (!actualClassId) {
        return NextResponse.json(
          { error: `Invalid class ID format: ${classIdString}` },
          { status: 400 }
        );
      }

      allClassIds.add(actualClassId);
      appliedClassesData.push({
        classId: actualClassId,
        sectionId: sectionId,
        originalValue: classIdString
      });
    }

    // Get class and section details for validation and storage
    const classDetails = await db.class.findMany({
      where: {
        id: {
          in: Array.from(allClassIds)
        }
      },
      include: {
        sections: true
      }
    });

    // Validate that all classes exist
    if (classDetails.length !== allClassIds.size) {
      const foundClassIds = classDetails.map(c => c.id);
      const missingClassIds = Array.from(allClassIds).filter(id => !foundClassIds.includes(id));
      return NextResponse.json(
        { error: `Classes not found: ${missingClassIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Build the applied classes data with names
    const processedAppliedClasses = appliedClassesData.map(item => {
      const classInfo = classDetails.find(c => c.id === item.classId);
      if (!classInfo) {
        throw new Error(`Class not found: ${item.classId}`);
      }

      const result: any = {
        classId: item.classId,
        className: classInfo.name,
      };

      if (item.sectionId) {
        const sectionInfo = classInfo.sections.find(s => s.id === item.sectionId);
        if (!sectionInfo) {
          throw new Error(`Section not found: ${item.sectionId} in class ${classInfo.name}`);
        }
        result.sectionId = item.sectionId;
        result.sectionName = sectionInfo.name;
      }

      return result;
    });

    // Use the first class as the primary class for backward compatibility
    const primaryClassId = appliedClassesData[0]?.classId;
    
    if (!primaryClassId) {
      return NextResponse.json(
        { error: 'No valid class ID found in the selection' },
        { status: 400 }
      );
    }

    // Check for existing schema with same term, primary class, and subject
    const existingSchema = await db.assessmentSchema.findFirst({
      where: {
        branchId,
        classId: primaryClassId,
        subjectId,
        term,
      },
    });

    if (existingSchema) {
      return NextResponse.json(
        { error: `Assessment schema already exists for this subject and term combination` },
        { status: 409 }
      );
    }

    // Validate that all required fields are present
    if (!primaryClassId || !subjectId || !branchId || !name || !term) {
      return NextResponse.json(
        { error: 'Missing required fields for database operation' },
        { status: 400 }
      );
    }

    // Create assessment schema with components in a transaction
    const schema = await db.$transaction(async (tx) => {
      // Create the main schema
      const newSchema = await tx.assessmentSchema.create({
        data: {
          name: String(name),
          term: String(term),
          classId: String(primaryClassId),
          subjectId: String(subjectId),
          branchId: String(branchId),
          totalMarks: Number(totalMarks) || 100,
          isActive: true,
          createdBy: String(userId),
          appliedClasses: processedAppliedClasses, // Store the class-section selections
        },
      });

        // Create components
        if (components && components.length > 0) {
          for (let i = 0; i < components.length; i++) {
            const component = components[i];
            
            // Validate component data
            if (!component.name || !component.rawMaxScore || component.reducedScore === undefined) {
              throw new Error(`Invalid component data at index ${i}: missing name, rawMaxScore, or reducedScore`);
            }

            const newComponent = await tx.assessmentComponent.create({
              data: {
                assessmentSchemaId: newSchema.id,
                name: component.name,
                rawMaxScore: Number(component.rawMaxScore),
                reducedScore: Number(component.reducedScore),
                weightage: component.weightage ? Number(component.weightage) : 1.0,
                formula: component.formula || null,
                order: i + 1,
                description: component.description || null,
              },
            });

            // Create sub-criteria if they exist
            if (component.subCriteria && component.subCriteria.length > 0) {
              for (let j = 0; j < component.subCriteria.length; j++) {
                const subCriteria = component.subCriteria[j];
                
                // Validate sub-criteria data
                if (!subCriteria.name || !subCriteria.maxScore) {
                  throw new Error(`Invalid sub-criteria data in component "${component.name}" at index ${j}: missing name or maxScore`);
                }
                
                await tx.assessmentSubCriteria.create({
                  data: {
                    componentId: newComponent.id,
                    name: subCriteria.name,
                    maxScore: Number(subCriteria.maxScore),
                    order: j + 1,
                    description: subCriteria.description || null,
                  },
                });
              }
            }
          }
        }

        return newSchema;
      });

    // Fetch the created schema with all relations
    const schemaWithRelations = await db.assessmentSchema.findUnique({
      where: { id: schema.id },
      include: {
        class: true,
        subject: true,
        components: {
          include: {
            subCriteria: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({
      message: 'Successfully created assessment schema',
      schema: schemaWithRelations,
      appliedClasses: processedAppliedClasses
    });
  } catch (error) {
    console.error('Error creating assessment schema:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create assessment schema';
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'Assessment schema already exists for this combination';
      } else if (error.message.includes('Foreign key constraint failed')) {
        errorMessage = 'Invalid class, subject, or branch reference';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get('id');

    if (!schemaId) {
      return NextResponse.json({ error: 'Schema ID is required' }, { status: 400 });
    }

    const data = await request.json();
    console.log('Updating schema with data:', JSON.stringify(data, null, 2));
    
    const {
      name,
      term,
      classIds,
      subjectId,
      branchId,
      totalMarks,
      passingCriteria,
      description,
      components,
    } = data;

    // Validate required fields
    if (!name || !term || !classIds || !Array.isArray(classIds) || classIds.length === 0 || !subjectId || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, term, classIds, subjectId, branchId' },
        { status: 400 }
      );
    }

    // Check if schema exists and get related data
    const existingSchema = await db.assessmentSchema.findUnique({
      where: { id: schemaId },
      include: { 
        components: { include: { subCriteria: true } },
        studentScores: true
      }
    });

    if (!existingSchema) {
      return NextResponse.json({ error: 'Assessment schema not found' }, { status: 404 });
    }

    // Check if there are any student scores - prevent editing if scores exist
    if (existingSchema.studentScores.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot edit assessment schema with existing student scores. Please remove all scores first.',
          hasScores: true
        },
        { status: 400 }
      );
    }

    // Parse and validate class-section selections (same as create)
    const appliedClassesData = [];
    const allClassIds = new Set<string>();

    for (const classIdString of classIds) {
      let actualClassId: string;
      let sectionId: string | null = null;

      if (classIdString.includes('-')) {
        const parts = classIdString.split('-');
        actualClassId = parts[0];
        sectionId = parts[1];
      } else {
        actualClassId = classIdString;
      }

      if (!actualClassId) {
        return NextResponse.json(
          { error: `Invalid class ID format: ${classIdString}` },
          { status: 400 }
        );
      }

      allClassIds.add(actualClassId);
      appliedClassesData.push({
        classId: actualClassId,
        sectionId: sectionId,
        originalValue: classIdString
      });
    }

    // Get class and section details
    const classDetails = await db.class.findMany({
      where: { id: { in: Array.from(allClassIds) } },
      include: { sections: true }
    });

    if (classDetails.length !== allClassIds.size) {
      const foundClassIds = classDetails.map(c => c.id);
      const missingClassIds = Array.from(allClassIds).filter(id => !foundClassIds.includes(id));
      return NextResponse.json(
        { error: `Classes not found: ${missingClassIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Build the applied classes data with names
    const processedAppliedClasses = appliedClassesData.map(item => {
      const classInfo = classDetails.find(c => c.id === item.classId);
      if (!classInfo) {
        throw new Error(`Class not found: ${item.classId}`);
      }

      const result: any = {
        classId: item.classId,
        className: classInfo.name,
      };

      if (item.sectionId) {
        const sectionInfo = classInfo.sections.find(s => s.id === item.sectionId);
        if (!sectionInfo) {
          throw new Error(`Section not found: ${item.sectionId} in class ${classInfo.name}`);
        }
        result.sectionId = item.sectionId;
        result.sectionName = sectionInfo.name;
      }

      return result;
    });

    const primaryClassId = appliedClassesData[0]?.classId;
    
    if (!primaryClassId) {
      return NextResponse.json(
        { error: 'No valid class ID found in the selection' },
        { status: 400 }
      );
    }

    // Update schema with components in a transaction
    const updatedSchema = await db.$transaction(async (tx) => {
      // Update the main schema
      const updated = await tx.assessmentSchema.update({
        where: { id: schemaId },
        data: {
          name: String(name),
          term: String(term),
          classId: String(primaryClassId),
          subjectId: String(subjectId),
          branchId: String(branchId),
          totalMarks: Number(totalMarks) || 100,
          appliedClasses: processedAppliedClasses,
          updatedAt: new Date(),
        },
      });

      // Delete existing components and sub-criteria
      await tx.assessmentSubCriteria.deleteMany({
        where: {
          component: {
            assessmentSchemaId: schemaId,
          },
        },
      });

      await tx.assessmentComponent.deleteMany({
        where: {
          assessmentSchemaId: schemaId,
        },
      });

      // Create new components
      if (components && components.length > 0) {
        for (let i = 0; i < components.length; i++) {
          const component = components[i];
          
          if (!component.name || !component.rawMaxScore || component.reducedScore === undefined) {
            throw new Error(`Invalid component data at index ${i}: missing name, rawMaxScore, or reducedScore`);
          }

          const newComponent = await tx.assessmentComponent.create({
            data: {
              assessmentSchemaId: updated.id,
              name: component.name,
              rawMaxScore: Number(component.rawMaxScore),
              reducedScore: Number(component.reducedScore),
              weightage: component.weightage ? Number(component.weightage) : 1.0,
              formula: component.formula || null,
              order: i + 1,
              description: component.description || null,
            },
          });

          // Create sub-criteria if they exist
          if (component.subCriteria && component.subCriteria.length > 0) {
            for (let j = 0; j < component.subCriteria.length; j++) {
              const subCriteria = component.subCriteria[j];
              
              if (!subCriteria.name || !subCriteria.maxScore) {
                throw new Error(`Invalid sub-criteria data in component "${component.name}" at index ${j}: missing name or maxScore`);
              }
              
              await tx.assessmentSubCriteria.create({
                data: {
                  componentId: newComponent.id,
                  name: subCriteria.name,
                  maxScore: Number(subCriteria.maxScore),
                  order: j + 1,
                  description: subCriteria.description || null,
                },
              });
            }
          }
        }
      }

      return updated;
    });

    // Fetch the updated schema with all relations
    const schemaWithRelations = await db.assessmentSchema.findUnique({
      where: { id: updatedSchema.id },
      include: {
        class: true,
        subject: true,
        components: {
          include: {
            subCriteria: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({
      message: 'Assessment schema updated successfully',
      schema: schemaWithRelations,
      appliedClasses: processedAppliedClasses
    });
  } catch (error) {
    console.error('Error updating assessment schema:', error);
    
    let errorMessage = 'Failed to update assessment schema';
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'Assessment schema already exists for this combination';
      } else if (error.message.includes('Foreign key constraint failed')) {
        errorMessage = 'Invalid class, subject, or branch reference';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get('id');

    if (!schemaId) {
      return NextResponse.json({ error: 'Schema ID is required' }, { status: 400 });
    }

    // Check if schema exists and get related data
    const existingSchema = await db.assessmentSchema.findUnique({
      where: { id: schemaId },
      include: {
        studentScores: true,
        components: {
          include: {
            subCriteria: true,
            componentScores: true,
          },
        },
      },
    });

    if (!existingSchema) {
      return NextResponse.json({ error: 'Assessment schema not found' }, { status: 404 });
    }

    // Check if there are any student scores - might want to prevent deletion if scores exist
    if (existingSchema.studentScores.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete assessment schema with existing student scores. Please remove all scores first.',
          hasScores: true
        },
        { status: 400 }
      );
    }

    // Delete schema and all related data in a transaction
    await db.$transaction(async (tx) => {
      // Delete sub-criteria scores (if any)
      await tx.subCriteriaScore.deleteMany({
        where: {
          subCriteria: {
            component: {
              assessmentSchemaId: schemaId,
            },
          },
        },
      });

      // Delete component scores (if any)
      await tx.componentScore.deleteMany({
        where: {
          component: {
            assessmentSchemaId: schemaId,
          },
        },
      });

      // Delete sub-criteria
      await tx.assessmentSubCriteria.deleteMany({
        where: {
          component: {
            assessmentSchemaId: schemaId,
          },
        },
      });

      // Delete components
      await tx.assessmentComponent.deleteMany({
        where: {
          assessmentSchemaId: schemaId,
        },
      });

      // Delete permissions
      await tx.assessmentPermission.deleteMany({
        where: {
          assessmentSchemaId: schemaId,
        },
      });

      // Finally delete the schema
      await tx.assessmentSchema.delete({
        where: { id: schemaId },
      });
    });

    return NextResponse.json({
      message: 'Assessment schema deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessment schema:', error);
    
    let errorMessage = 'Failed to delete assessment schema';
    
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint failed')) {
        errorMessage = 'Cannot delete assessment schema due to related data. Please remove all associated scores first.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 