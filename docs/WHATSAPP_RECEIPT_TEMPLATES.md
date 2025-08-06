# WhatsApp Receipt Templates for Meta Business Manager

This document outlines the WhatsApp message templates that need to be created and approved in Meta Business Manager for automatic receipt sharing functionality.

## Template 1: Fee Receipt with PDF Document (Primary)

**Template Name:** `fee_receipt_with_pdf`
**Category:** `UTILITY`
**Language:** English (`en`)

### Header
- **Type:** DOCUMENT
- **Example PDF URL:** `https://scholarise.tsh.edu.in/api/receipts/TSHPS_FIN_2025-26_000001/pdf`

### Body
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

### Variables
1. `{{1}}` - Student Name
2. `{{2}}` - Receipt Number  
3. `{{3}}` - Amount (formatted in Indian numbering)
4. `{{4}}` - Payment Date (DD/MM/YYYY format)

### Header Parameter
- Document URL will be dynamically populated: `https://your-domain.com/api/receipts/{receiptNumber}/pdf`

---

## Template 2: Fee Receipt Text Only (Fallback)

**Template Name:** `fee_receipt_text`
**Category:** `UTILITY`
**Language:** English (`en`)

### Body
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

### Variables
1. `{{1}}` - Student Name
2. `{{2}}` - Receipt Number  
3. `{{3}}` - Amount (formatted in Indian numbering)
4. `{{4}}` - Payment Date (DD/MM/YYYY format)
5. `{{5}}` - Receipt PDF URL

---

## Setup Instructions

### 1. Create Templates in Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to WhatsApp Manager
3. Select your WhatsApp Business Account
4. Go to Message Templates
5. Click "Create Template"

### 2. Template Configuration

For each template:
1. Enter the template name exactly as specified above
2. Select category as "UTILITY"
3. Select language as "English"
4. Configure the header and body as specified
5. Submit for approval

### 3. Important Notes

- **Document Header:** For the primary template, ensure the header type is set to "DOCUMENT"
- **Variable Format:** Use exactly `{{1}}`, `{{2}}`, etc. for variables
- **Approval Time:** Templates typically take 24-48 hours for Meta approval
- **Rejection Handling:** If rejected, check Meta's feedback and adjust accordingly

### 4. Environment Variables Required

Ensure these environment variables are configured:

```bash
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 5. Testing

Once templates are approved:

1. Test with the `/api/finance/sendReceiptWhatsApp` endpoint
2. Verify PDF generation at `/api/receipts/[receiptNumber]/pdf`
3. Check WhatsApp delivery in Meta Business Manager logs

### 6. Template Usage in Code

```typescript
// Primary template with document
const templateMessage = {
  template: {
    name: "fee_receipt_with_pdf",
    language: { code: "en" },
    components: [
      {
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: "https://your-domain.com/api/receipts/receipt123/pdf",
              filename: "Fee_Receipt_receipt123.pdf"
            }
          }
        ]
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "John Doe" },
          { type: "text", text: "TSHPS_FIN_2025-26_000001" },
          { type: "text", text: "5,000" },
          { type: "text", text: "15/01/2025" }
        ]
      }
    ]
  }
}
```

## Support Documentation

- [WhatsApp Cloud API - Document Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/document-messages)
- [WhatsApp Cloud API - Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Meta Business Manager Template Guidelines](https://www.facebook.com/business/help/2055875911147364)