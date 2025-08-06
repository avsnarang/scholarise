# WhatsApp Document Templates Implementation Guide

## ✅ What's Fixed

The WhatsApp document message implementation has been updated to properly follow the [WhatsApp Cloud API specification](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/document-messages).

### Key Updates:

1. **Edge Function Fixed**: Document headers now use the correct API structure
2. **Template Builder Enhanced**: Better UI for document template creation
3. **Receipt Service Updated**: Already following correct document format
4. **Full Integration**: Document templates work end-to-end

## 📋 Template Creation in Meta Business Manager

### Template 1: Receipt with PDF Document

**Template Name:** `fee_receipt_with_pdf`
**Category:** `UTILITY`
**Language:** English (`en`)

#### Header Configuration:
- **Type:** `DOCUMENT`
- **Sample Document URL:** `https://scholarise.tsh.edu.in/api/receipts/SAMPLE123/pdf`

#### Body Text:
```
🧾 Fee Receipt Confirmation

Dear Parent,

Payment received successfully for {{1}}.

📄 Receipt No: {{2}}
💰 Amount: ₹{{3}}
📅 Date: {{4}}

The receipt document is attached above.

For any queries, contact school office.
Thank you!
```

#### Variables:
1. `{{1}}` - Student Name
2. `{{2}}` - Receipt Number  
3. `{{3}}` - Amount (formatted)
4. `{{4}}` - Payment Date

### Template 2: Fallback Text Template

**Template Name:** `fee_receipt_text`
**Category:** `UTILITY`
**Language:** English (`en`)

#### Body Text:
```
🧾 Fee Receipt Confirmation

Dear Parent,

Payment received successfully for {{1}}.

📄 Receipt No: {{2}}
💰 Amount: ₹{{3}}
📅 Date: {{4}}

📎 Download your receipt: {{5}}

For any queries, contact school office.
Thank you!
```

#### Variables:
1. `{{1}}` - Student Name
2. `{{2}}` - Receipt Number  
3. `{{3}}` - Amount (formatted)
4. `{{4}}` - Payment Date
5. `{{5}}` - Receipt PDF URL

## 🔧 Creating Templates in ERP System

### Using the Enhanced Template Builder:

1. **Navigate to:** Communication → Templates → Create Template

2. **Fill Basic Info:**
   - Template Name: `fee_receipt_with_pdf`
   - Category: `UTILITY`
   - Language: `en`

3. **Configure Document Header:**
   - ✅ Enable Header section
   - Header Type: `DOCUMENT`
   - Document URL: `{{1}}`
   - Document Filename: `Fee_Receipt_{{2}}.pdf`

4. **Set Body Content:**
   ```
   🧾 Fee Receipt Confirmation

   Dear Parent,

   Payment received successfully for {{3}}.

   📄 Receipt No: {{4}}
   💰 Amount: ₹{{5}}
   📅 Date: {{6}}

   The receipt document is attached above.

   For any queries, contact school office.
   Thank you!
   ```

5. **Variable Mapping:**
   - `{{1}}` → Receipt PDF URL
   - `{{2}}` → Receipt Number
   - `{{3}}` → Student Name
   - `{{4}}` → Receipt Number
   - `{{5}}` → Amount
   - `{{6}}` → Payment Date

## 📱 How Document Messages Work

### Message Structure:
```json
{
  "messaging_product": "whatsapp",
  "to": "+919876543210",
  "type": "template",
  "template": {
    "name": "fee_receipt_with_pdf",
    "language": { "code": "en" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "document",
            "document": {
              "link": "https://scholarise.tsh.edu.in/api/receipts/RECEIPT123/pdf",
              "filename": "Fee_Receipt_RECEIPT123.pdf"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "John Doe" },
          { "type": "text", "text": "RECEIPT123" },
          { "type": "text", "text": "5,000" },
          { "type": "text", "text": "15/01/2025" }
        ]
      }
    ]
  }
}
```

### User Experience:
1. **Parent Receives:** WhatsApp message with PDF attachment
2. **Document Icon:** Shows PDF icon with filename
3. **Download:** Tap to download the actual receipt PDF
4. **Professional:** Branded document with school logo

## 🧪 Testing Document Templates

### Test Template Creation:
1. Create template in ERP system
2. Submit to Meta for approval
3. Wait for approval (24-48 hours)
4. Test with real WhatsApp numbers

### Test Receipt System:
```bash
# Test PDF generation
curl "https://scholarise.tsh.edu.in/api/receipts/RECEIPT_NUMBER/pdf" -o test.pdf

# Test WhatsApp sending
# Use the communication module's send message feature
```

### Validation Checklist:
- ✅ Document URL resolves correctly
- ✅ PDF downloads properly
- ✅ Filename appears correctly in WhatsApp
- ✅ Variables are populated correctly
- ✅ Message delivery succeeds

## 🔒 Supported Document Types

According to WhatsApp Cloud API:

| Document Type | Extension | MIME Type | Max Size |
|---------------|-----------|-----------|----------|
| PDF | .pdf | application/pdf | 100 MB |
| Excel | .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 100 MB |
| Word | .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 100 MB |
| PowerPoint | .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation | 100 MB |
| Text | .txt | text/plain | 100 MB |

## 🚀 Production Deployment

### Environment Variables:
```bash
META_ACCESS_TOKEN=your_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
NEXT_PUBLIC_APP_URL=https://scholarise.tsh.edu.in
```

### Template Approval Process:
1. Create templates in Meta Business Manager
2. Submit for review
3. Address any rejection feedback
4. Get approval notification
5. Test with live system

### Monitoring:
- Check Meta Business Manager for delivery status
- Monitor edge function logs
- Track message success rates
- Review user feedback

## 🔧 Troubleshooting

### Common Issues:

**Template Rejected:**
- Ensure document URL is publicly accessible
- Check Meta's template guidelines
- Verify variable usage is correct

**Document Not Downloading:**
- Test PDF URL directly in browser
- Check CORS headers on PDF endpoint
- Verify HTTPS usage

**Message Send Failed:**
- Confirm template is approved
- Check phone number format
- Verify Meta API credentials

**Edge Function Errors:**
- Check Supabase logs
- Verify environment variables
- Test with dry run mode

The document template system is now fully compliant with WhatsApp Cloud API specifications and ready for production use! 🎉