import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chapterId = searchParams.get('chapterId');

  if (!chapterId) {
    return NextResponse.json({ error: 'Missing chapterId parameter' }, { status: 400 });
  }

  try {
    // Get the most recent processing record for this chapter
    const processingRecord = await db.textbookProcessing.findFirst({
      where: {
        chapterId: chapterId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!processingRecord) {
      return NextResponse.json({ error: 'No processing record found' }, { status: 404 });
    }

    return NextResponse.json({
      id: processingRecord.id,
      status: processingRecord.status,
      questionsGenerated: processingRecord.questionsGenerated,
      errorMessage: processingRecord.errorMessage,
      createdAt: processingRecord.createdAt,
      completedAt: processingRecord.completedAt,
    });
  } catch (error) {
    console.error('Error fetching textbook processing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 