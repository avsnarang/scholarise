"use client";

import { WebhookDebugPanel } from "@/components/communication/webhook-debug-panel";

export default function CommunicationDebugPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Communication Debug Panel</h1>
        <p className="text-muted-foreground">
          Debug and test WhatsApp templates, webhooks, and message sending
        </p>
      </div>
      
      <WebhookDebugPanel />
    </div>
  );
} 