import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const messageCount = await db.chatMessage.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    // Test recent webhook activity
    const recentMessages = await db.chatMessage.findMany({
      where: {
        twilioMessageId: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        direction: true,
        twilioMessageId: true
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'connected',
          responseTime: `${responseTime}ms`
        },
        webhookActivity: {
          messagesLast24h: messageCount,
          messagesLastHour: recentMessages.length,
          recentMessages: recentMessages
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasTwilioConfig: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
          webhookUrl: `${req.nextUrl.origin}/api/webhooks/twilio`
        }
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Use GET method for health checks' 
  }, { status: 405 });
} 