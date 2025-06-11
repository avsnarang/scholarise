import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const sessionId = searchParams.get('sessionId');

    const terms = await db.term.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(sessionId && { sessionId }),
        isActive: true,
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
      orderBy: [
        { order: 'asc' },
        { startDate: 'asc' },
      ],
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terms' },
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
    const {
      name,
      description,
      startDate,
      endDate,
      order,
      isCurrentTerm,
      branchId,
      sessionId,
    } = data;

    // Validate required fields
    if (!name || !startDate || !endDate || !branchId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, endDate, branchId, sessionId' },
        { status: 400 }
      );
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Check for existing term with same name in branch and session
    const existingTerm = await db.term.findFirst({
      where: {
        name,
        branchId,
        sessionId,
      },
    });

    if (existingTerm) {
      return NextResponse.json(
        { error: 'A term with this name already exists in the selected branch and session' },
        { status: 409 }
      );
    }

    // If this is marked as current term, unset other current terms in the same session
    if (isCurrentTerm) {
      await db.term.updateMany({
        where: {
          branchId,
          sessionId,
          isCurrentTerm: true,
        },
        data: {
          isCurrentTerm: false,
        },
      });
    }

    const term = await db.term.create({
      data: {
        name: String(name),
        description: description ? String(description) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        order: Number(order) || 0,
        isCurrentTerm: Boolean(isCurrentTerm),
        branchId: String(branchId),
        sessionId: String(sessionId),
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

    return NextResponse.json({
      message: 'Term created successfully',
      term,
    });
  } catch (error) {
    console.error('Error creating term:', error);
    
    let errorMessage = 'Failed to create term';
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'A term with this name already exists';
      } else if (error.message.includes('Foreign key constraint failed')) {
        errorMessage = 'Invalid branch or session reference';
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
    const termId = searchParams.get('id');

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    const data = await request.json();
    const {
      name,
      description,
      startDate,
      endDate,
      order,
      isCurrentTerm,
      isActive,
    } = data;

    // Check if term exists
    const existingTerm = await db.term.findUnique({
      where: { id: termId },
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Validate date range if dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    }

    // Check for name conflict if name is being changed
    if (name && name !== existingTerm.name) {
      const conflictingTerm = await db.term.findFirst({
        where: {
          name,
          branchId: existingTerm.branchId,
          sessionId: existingTerm.sessionId,
          id: { not: termId },
        },
      });

      if (conflictingTerm) {
        return NextResponse.json(
          { error: 'A term with this name already exists in the selected branch and session' },
          { status: 409 }
        );
      }
    }

    // If this is being marked as current term, unset other current terms in the same session
    if (isCurrentTerm && !existingTerm.isCurrentTerm) {
      await db.term.updateMany({
        where: {
          branchId: existingTerm.branchId,
          sessionId: existingTerm.sessionId,
          isCurrentTerm: true,
          id: { not: termId },
        },
        data: {
          isCurrentTerm: false,
        },
      });
    }

    const updatedTerm = await db.term.update({
      where: { id: termId },
      data: {
        ...(name && { name: String(name) }),
        ...(description !== undefined && { description: description ? String(description) : null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isCurrentTerm !== undefined && { isCurrentTerm: Boolean(isCurrentTerm) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
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

    return NextResponse.json({
      message: 'Term updated successfully',
      term: updatedTerm,
    });
  } catch (error) {
    console.error('Error updating term:', error);
    
    let errorMessage = 'Failed to update term';
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'A term with this name already exists';
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
    const termId = searchParams.get('id');

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    // Check if term exists
    const existingTerm = await db.term.findUnique({
      where: { id: termId },
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // TODO: Add checks for term usage in assessments, exams, etc.
    // For now, we'll do a soft delete by setting isActive to false
    const deletedTerm = await db.term.update({
      where: { id: termId },
      data: {
        isActive: false,
        isCurrentTerm: false, // Remove current term status when deleting
      },
    });

    return NextResponse.json({
      message: 'Term deleted successfully',
      term: deletedTerm,
    });
  } catch (error) {
    console.error('Error deleting term:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete term',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 