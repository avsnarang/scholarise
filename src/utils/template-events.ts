import { EventEmitter } from 'events';

export interface TemplateStatusUpdate {
  templateId: string;
  templateName: string;
  metaTemplateId?: string;
  status: string;
  previousStatus?: string;
  rejectionReason?: string;
  approvedAt?: Date;
  timestamp: Date;
}

// Global event emitter for template updates
class TemplateEventEmitter extends EventEmitter {
  private static instance: TemplateEventEmitter;

  static getInstance(): TemplateEventEmitter {
    if (!TemplateEventEmitter.instance) {
      TemplateEventEmitter.instance = new TemplateEventEmitter();
    }
    return TemplateEventEmitter.instance;
  }

  // Emit template status update
  emitTemplateStatusUpdate(update: TemplateStatusUpdate) {
    console.log(`📡 Emitting template status update: ${update.templateName} -> ${update.status}`);
    this.emit('template-status-update', update);
  }

  // Subscribe to template status updates
  onTemplateStatusUpdate(callback: (update: TemplateStatusUpdate) => void) {
    this.on('template-status-update', callback);
    return () => this.off('template-status-update', callback);
  }
}

export const templateEventEmitter = TemplateEventEmitter.getInstance(); 