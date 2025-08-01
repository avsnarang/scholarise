import nodemailer from 'nodemailer';
import { db } from '@/server/db';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure?: boolean;
  fromEmail: string;
  fromName: string;
}

interface TaskEmailNotification {
  taskId: string;
  taskType: string;
  title: string;
  status: 'COMPLETED' | 'FAILED';
  processedItems: number;
  totalItems: number;
  failedItems?: number;
  results?: any;
  errors?: any[];
  duration?: string;
  branchId?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  async initializeTransporter(branchId?: string) {
    try {
      // Get email configuration from database
      const emailConfig = await db.emailConfiguration.findFirst({
        where: {
          OR: [
            { branchId: branchId, isActive: true },
            { isGlobal: true, isActive: true }
          ]
        },
        orderBy: [
          { branchId: 'desc' }, // Prefer branch-specific config
          { isGlobal: 'desc' }
        ]
      });

      if (!emailConfig?.smtpHost || !emailConfig.smtpUsername) {
        console.log('No email configuration found or incomplete configuration');
        return false;
      }

      this.config = {
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort || 587,
        smtpUsername: emailConfig.smtpUsername,
        smtpPassword: emailConfig.smtpPassword || '',
        smtpSecure: emailConfig.smtpPort === 465, // Use port 465 for secure
        fromEmail: emailConfig.fromEmail || emailConfig.smtpUsername,
        fromName: emailConfig.fromName || 'ScholaRise System'
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        auth: {
          user: this.config.smtpUsername,
          pass: this.config.smtpPassword,
        },
      });

      // Verify the connection
      if (this.transporter) {
        await this.transporter.verify();
      }
      console.log('Email transporter initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      return false;
    }
  }

  async sendTaskNotification(notification: TaskEmailNotification) {
    try {
      if (!this.transporter || !this.config) {
        const initialized = await this.initializeTransporter(notification.branchId);
        if (!initialized) {
          console.log('Cannot send email: transporter not initialized');
          return false;
        }
      }

      // Get email configuration and recipients
      const emailConfig = await db.emailConfiguration.findFirst({
        where: {
          OR: [
            { branchId: notification.branchId, isActive: true },
            { isGlobal: true, isActive: true }
          ]
        },
        orderBy: [
          { branchId: 'desc' },
          { isGlobal: 'desc' }
        ]
      });

      if (!emailConfig || emailConfig.adminEmails.length === 0) {
        console.log('No email recipients configured');
        return false;
      }

      // Check if we should send notification for this status
      const shouldNotify = (
        (notification.status === 'COMPLETED' && emailConfig.notifyOnTaskCompletion) ||
        (notification.status === 'FAILED' && emailConfig.notifyOnTaskFailure)
      );

      if (!shouldNotify) {
        console.log(`Notifications disabled for ${notification.status} status`);
        return false;
      }

      // Generate email content
      const subject = this.generateSubject(notification);
      const htmlContent = this.generateHtmlContent(notification, emailConfig);
      const textContent = this.generateTextContent(notification);

      // Send email to all recipients
      const mailOptions = {
        from: `${this.config?.fromName} <${this.config?.fromEmail}>`,
        to: emailConfig.adminEmails.join(', '),
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log('Task notification email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send task notification email:', error);
      return false;
    }
  }

  private generateSubject(notification: TaskEmailNotification): string {
    const status = notification.status === 'COMPLETED' ? '✅ Completed' : '❌ Failed';
    return `[Scholarise] Background Task ${status}: ${notification.title}`;
  }

  private generateHtmlContent(notification: TaskEmailNotification, config: any): string {
    const statusColor = notification.status === 'COMPLETED' ? '#10b981' : '#ef4444';
    const statusIcon = notification.status === 'COMPLETED' ? '✅' : '❌';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { padding: 20px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; background: ${statusColor}; font-weight: bold; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .progress-bar { background: #e5e7eb; height: 10px; border-radius: 5px; overflow: hidden; margin: 10px 0; }
          .progress-fill { background: ${statusColor}; height: 100%; transition: width 0.3s ease; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          .error-section { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusIcon} Task ${notification.status}</h1>
            <p style="margin: 0; opacity: 0.9;">${notification.title}</p>
          </div>
          
          <div class="content">
            <p>A background task has ${notification.status.toLowerCase()}. Here are the details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Task Type:</span>
                <span class="value">${notification.taskType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value">
                  <span class="status-badge">${notification.status}</span>
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Progress:</span>
                <span class="value">${notification.processedItems}/${notification.totalItems} items</span>
              </div>
    `;

    if (notification.status === 'COMPLETED') {
      const percentage = Math.round((notification.processedItems / notification.totalItems) * 100);
      html += `
              <div style="margin: 10px 0;">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <small style="color: #666;">${percentage}% completed</small>
              </div>
      `;
    }

    if (notification.failedItems && notification.failedItems > 0) {
      html += `
              <div class="detail-row">
                <span class="label">Failed Items:</span>
                <span class="value" style="color: #ef4444;">${notification.failedItems}</span>
              </div>
      `;
    }

    if (notification.duration) {
      html += `
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${notification.duration}</span>
              </div>
      `;
    }

    html += `</div>`;

    // Include task details if enabled
    if (config.includeTaskDetails && notification.results) {
      html += `
            <div class="details">
              <h3 style="margin-top: 0; color: #374151;">Task Results</h3>
              <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(notification.results, null, 2)}</pre>
            </div>
      `;
    }

    // Include errors if enabled and task failed
    if (config.includeErrorLogs && notification.status === 'FAILED' && notification.errors && notification.errors.length > 0) {
      html += `
            <div class="error-section">
              <h3 style="margin-top: 0; color: #dc2626;">Error Details</h3>
              <ul style="margin: 0; padding-left: 20px;">
      `;
      notification.errors.slice(0, 5).forEach(error => {
        html += `<li style="margin: 5px 0; font-size: 14px;">${String(error)}</li>`;
      });
      
      if (notification.errors.length > 5) {
        html += `<li style="color: #666; font-style: italic;">... and ${notification.errors.length - 5} more errors</li>`;
      }
      html += `</ul></div>`;
    }

    html += `
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the Scholarise system.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private generateTextContent(notification: TaskEmailNotification): string {
    const status = notification.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
    
    let text = `
Background Task ${status}: ${notification.title}

Task Details:
- Type: ${notification.taskType}
- Status: ${notification.status}
- Progress: ${notification.processedItems}/${notification.totalItems} items
`;

    if (notification.failedItems && notification.failedItems > 0) {
      text += `- Failed Items: ${notification.failedItems}\n`;
    }

    if (notification.duration) {
      text += `- Duration: ${notification.duration}\n`;
    }

    text += `\nThis is an automated notification from the Scholarise system.\nGenerated on ${new Date().toLocaleString()}`;

    return text;
  }

  async testConnection(branchId?: string): Promise<boolean> {
    try {
      const initialized = await this.initializeTransporter(branchId);
      if (!initialized) return false;
      
      await this.transporter!.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const emailService = new EmailService(); 