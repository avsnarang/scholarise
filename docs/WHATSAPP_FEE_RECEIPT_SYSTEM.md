# WhatsApp Fee Receipt System

A complete automation system for sending fee receipt PDFs via WhatsApp when fees are collected in your ERP system.

## 🚀 Quick Start

### 1. Create the WhatsApp Template
```bash
npm run create:whatsapp-template
```

This creates and submits the fee receipt template to Meta for approval.

### 2. Check Template Status
```bash
npm run check:whatsapp-templates
```

Monitor approval status and view all your WhatsApp templates.

### 3. Add Document Header (After Approval)
```bash
npm run add:document-header
```

Once Meta approves the basic template, add the PDF document header capability.

## 📋 Template Details

### Template Structure
- **Name**: `fee_receipt_automatic`
- **Category**: `UTILITY`
- **Header**: PDF Document (added after approval)
- **Body**: Fee receipt notification with variables
- **Footer**: "The Scholars' Home"

### Template Variables
1. `{{parent_name}}` - Parent's name with title
2. `{{student_name}}` - Student's full name
3. `{{receipt_number}}` - Fee receipt number
4. `{{payment_amount}}` - Amount paid with currency
5. `{{payment_date}}` - Payment date

### Template Body
```
Dear {{parent_name}},

Fee payment has been received successfully for {{student_name}}.

📄 Receipt Number: {{receipt_number}}
💰 Amount: {{payment_amount}}
📅 Date: {{payment_date}}

Thank you for your payment!

For queries, contact school office.
```

## 🔧 System Integration

### PDF Generation
- **Endpoint**: `/api/receipts/{receiptNumber}/pdf`
- **Format**: A5 Landscape PDF
- **Content**: Complete fee receipt with student details, payment info, and branding

### Sample PDF
- **Endpoint**: `/api/receipts/sample/pdf`
- **Purpose**: Used by Meta for template validation
- **Access**: Publicly accessible with CORS headers

### Template Sending
The system automatically sends receipt PDFs via WhatsApp when:
1. Fee payments are collected
2. Receipt is generated
3. Parent phone number is available
4. Template is approved by Meta

## 📱 Usage Workflow

### 1. Collect Fee Payment
- Process payment in the ERP system
- Generate receipt number
- Create fee collection record

### 2. Generate PDF Receipt
```typescript
GET /api/receipts/TSHPS%2FFIN%2F2025-26%2F000001/pdf
```

### 3. Send via WhatsApp
The system uses the approved template to send:
- PDF attachment (receipt)
- Formatted message with payment details
- Professional footer with school branding

## 🛠️ Meta Approval Process

### Phase 1: Basic Template
1. ✅ **Created**: Basic template without document header
2. ⏳ **Pending**: Submitted to Meta for approval
3. 🕐 **Timeline**: 24-48 hours for approval

### Phase 2: Document Header
1. 📄 **Enhanced**: Add PDF document capability
2. ⏳ **Re-approval**: May require additional Meta approval
3. 🎉 **Ready**: Full fee receipt automation

## 📊 Monitoring & Status

### Check All Templates
```bash
npm run check:whatsapp-templates
```

### Template Status Codes
- ✅ **APPROVED**: Ready for use
- ⏳ **PENDING**: Awaiting Meta approval
- ❌ **REJECTED**: Needs modification
- 📝 **DRAFT**: Not yet submitted

### Key Metrics
- Template approval rate
- Message delivery success
- PDF generation performance
- Parent engagement

## 🔍 Troubleshooting

### Template Not Approved
1. Check Meta Business Manager
2. Review template content guidelines
3. Ensure sample PDF is accessible
4. Verify business verification status

### PDF Generation Issues
1. Check receipt data completeness
2. Verify student and payment records
3. Test PDF endpoint directly
4. Review A5 landscape formatting

### WhatsApp Delivery Failures
1. Verify phone number format
2. Check Meta API credentials
3. Monitor rate limits
4. Review message templates

## 🎯 Best Practices

### Template Management
- Keep templates simple and clear
- Use consistent variable naming
- Test with sample data
- Monitor approval status regularly

### PDF Optimization
- Ensure A5 landscape format
- Optimize for mobile viewing
- Include all required information
- Maintain professional appearance

### Message Delivery
- Send immediately after payment
- Include clear call-to-action
- Provide contact information
- Monitor delivery status

## 📚 API Reference

### Core Endpoints
```typescript
// Generate specific receipt PDF
GET /api/receipts/{receiptNumber}/pdf

// Get sample PDF for Meta validation
GET /api/receipts/sample/pdf

// Send template message (internal)
POST /api/chat/send-template-message
```

### Template Variables Format
```javascript
{
  "parent_name": "Mr. John Smith",
  "student_name": "Alice Smith", 
  "receipt_number": "TSHPS/FIN/2025-26/000001",
  "payment_amount": "₹15,000",
  "payment_date": "15/01/2025"
}
```

## 🚨 Important Notes

### Meta Requirements
- Business verification required
- Templates must serve business purpose
- Document URLs must be publicly accessible
- Approval can take 24-48 hours

### Data Privacy
- PDFs contain sensitive financial data
- URLs are not guessable (encoded receipt numbers)
- Access logs are maintained
- GDPR/privacy compliance

### Rate Limits
- Meta WhatsApp API has message limits
- Monitor usage to avoid throttling
- Implement retry logic for failures
- Consider business vs utility templates

## 🎉 Success Indicators

### Template Ready
- ✅ Meta approval received
- ✅ Document header enabled
- ✅ PDF generation working
- ✅ WhatsApp delivery successful

### System Working
- 📱 Parents receive instant receipts
- 📄 PDFs are properly formatted
- 🏦 Payments are tracked automatically
- 📈 High delivery success rate

---

## 📞 Support

For issues with:
- **Meta Approval**: Check Meta Business Manager
- **PDF Generation**: Review API logs and formatting
- **WhatsApp Integration**: Verify credentials and permissions
- **Template Variables**: Check data mapping and format

Your automated fee receipt system is now ready! 🎉