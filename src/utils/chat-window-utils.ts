import { formatDistanceToNow } from "date-fns";

/**
 * Interface for WhatsApp message window information (client-side safe)
 */
export interface ChatMessageWindow {
  canSendFreeform: boolean;
  reason: string;
  lastIncomingMessageAt?: Date;
  hoursRemaining?: number;
}

/**
 * Get user-friendly explanation of WhatsApp messaging window status
 * This is a client-safe version that doesn't import Twilio dependencies
 */
export function getWindowStatusExplanation(windowInfo: ChatMessageWindow): string {
  if (windowInfo.canSendFreeform) {
    const hours = windowInfo.hoursRemaining || 0;
    const hoursText = hours > 1 ? `${hours.toFixed(1)} hours` : `${Math.round(hours * 60)} minutes`;
    
    return `You can send unlimited freeform messages for the next ${hoursText}. Window opened by customer's last message and stays active until expired.`;
  }

  if (windowInfo.reason.includes('No previous conversation')) {
    return `This is a new conversation. You must send a pre-approved template message first. Once the customer responds, you'll have 24 hours to send unlimited freeform messages.`;
  }

  if (windowInfo.reason.includes('24-hour window expired')) {
    const lastMessage = windowInfo.lastIncomingMessageAt;
    const timeAgo = lastMessage ? formatDistanceToNow(lastMessage) : 'unknown time';
    
    return `The 24-hour window expired ${timeAgo} ago (since customer's last message). You can only send pre-approved template messages. When the customer responds again, you'll get a new 24-hour window.`;
  }

  return windowInfo.reason;
}

/**
 * WhatsApp Business API 24-Hour Window Rules Summary
 */
export const WHATSAPP_WINDOW_RULES = {
  title: "WhatsApp 24-Hour Window Rules",
  rules: [
    "Customer sends message → Opens 24-hour window",
    "Business can send unlimited freeform messages during window", 
    "Each new customer message → Resets window to fresh 24 hours",
    "Window expires → Must use template messages only",
    "Template messages → Do NOT open new windows",
    "Business-initiated conversations → Must start with templates"
  ],
  example: [
    'Customer: "Hello" → 24hr window opens ✅',
    'Business: "Hi! How can I help?" ✅ (freeform)',
    'Business: "We have offers!" ✅ (freeform)',
    'Business: "Any questions?" ✅ (freeform)',
    '[24 hours pass without customer response]',
    'Business: Must use template ❌ (no freeform)',
    'Customer: "Tell me more" → New 24hr window ✅'
  ]
}; 