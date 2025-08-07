# Receipt PDF Generation Documentation

## Overview
This document describes the receipt PDF generation system, which ensures consistent receipt design across all generation methods, matching the Payment History page design.

## Architecture

### 1. Data Flow
```
Fee Collection Record → ReceiptService.createReceiptFromPaymentHistoryData() → UnifiedReceiptData → PDF Generation
```

### 2. PDF Generation Methods

#### Standard PDF (`/api/receipts/[receiptNumber]/pdf`)
- **Technology**: Puppeteer with Chromium
- **Features**: 
  - Full HTML rendering with CSS styling
  - Exact replica of Payment History receipt design
  - Includes logos, tables, and formatting
  - A5 landscape format (8.27" x 5.83")
- **Use Case**: Primary PDF generation method
- **Retry Logic**: 3 attempts with exponential backoff

#### Lightweight PDF (`/api/receipts/[receiptNumber]/pdf-light`)
- **Technology**: Native PDF generation (no external dependencies)
- **Features**:
  - Text-based rendering
  - Matches Payment History structure
  - Fast and reliable on serverless
  - Minimal resource usage
- **Use Case**: Fallback when Puppeteer fails
- **Always Returns**: Valid PDF even on error

#### Test Endpoint (`/api/receipts/test-pdf`)
- **Purpose**: Diagnostic and testing
- **Features**:
  - Tests browser launch
  - Tests page creation
  - Tests PDF generation
  - Provides detailed diagnostics
- **Access**: `/api/receipts/test-pdf?receipt=TEST-001`

## Receipt Structure (Payment History Design)

### Header Section
- School Name: "The Scholars' Home, [Branch Name]"
- Branch Address (if available)
- "RECEIPT" title
- Receipt Number

### Session Information
- Academic Session Name

### Student Information (Grid Layout)
- Student Name
- Father/Parent Name
- Fee Terms/Cycles
- Class and Section
- Student Registration Number

### Fee Details Table
| Sr. No | Particulars | Fee Structure | Concession | Received Fee |
|--------|-------------|---------------|------------|--------------|
| 1      | Fee Head 1  | Amount        | Discount   | Final Amount |
| ...    | ...         | ...           | ...        | ...          |
| Total  |             | Total Orig    | Total Disc | Total Paid   |

### Payment Information
- Amount in Words
- Payment Mode
- Payment Date
- Transaction Reference (if available)

### Footer
- Parent's Signature
- Receipt Date
- Cashier's Signature
- Note: "Fee once paid is non-refundable except for Security"

## WhatsApp Integration

### Dual-Mode PDF Generation
1. **Primary**: Attempts standard PDF generation
2. **Fallback**: Automatically switches to lightweight PDF if standard fails
3. **Validation**: Tests external accessibility before sending
4. **Headers**: Always includes proper Content-Type and Content-Length

### Error Handling
- Always returns valid PDF response (even minimal)
- Prevents WhatsApp API errors
- Logs failures for debugging
- Updates message status in database

## Production Optimizations (Vercel)

### Puppeteer Configuration
```javascript
{
  args: [
    ...chromium.args,
    '--single-process',
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=TranslateUI'
  ],
  executablePath: await chromium.executablePath(),
  headless: true,
  timeout: 30000
}
```

### Key Optimizations
1. **Browser Launch Retry**: 3 attempts with delays
2. **Timeout Handling**: Race conditions with 25s timeout
3. **Resource Cleanup**: Always closes browser on error
4. **Cache Headers**: 1-hour cache for successful PDFs
5. **Reduced Wait Times**: Uses 'domcontentloaded' instead of 'networkidle0'

## Troubleshooting

### Common Issues

#### "Content too small: 0 bytes"
- **Cause**: PDF generation failed on Vercel
- **Solution**: Implemented with lightweight fallback

#### Puppeteer Timeout
- **Cause**: Cold start or resource constraints
- **Solution**: Retry logic and lightweight fallback

#### External Access Failed
- **Cause**: PDF not ready or network issues
- **Solution**: Reduced retry attempts for faster fallback

### Debugging Tools
1. **Test Endpoint**: `/api/receipts/test-pdf`
2. **Verification Script**: `tsx src/scripts/verify-receipt-consistency.ts`
3. **Logs**: Extensive logging at each step

## API Usage

### Generate Receipt PDF
```bash
# Standard PDF
GET /api/receipts/{receiptNumber}/pdf

# Lightweight PDF (fallback)
GET /api/receipts/{receiptNumber}/pdf-light

# Test PDF generation
GET /api/receipts/test-pdf?receipt=TEST-001
```

### Response Headers
```
Content-Type: application/pdf
Content-Length: [size in bytes]
Content-Disposition: inline; filename="Fee_Receipt_[number].pdf"
Cache-Control: public, max-age=3600, s-maxage=3600
X-Receipt-Number: [receipt number]
X-PDF-Generated: [ISO timestamp]
```

## Consistency Guarantee

All PDF generation methods:
1. Use `ReceiptService.createReceiptFromPaymentHistoryData()` for data
2. Follow the same receipt structure
3. Include all required fields from Payment History
4. Handle errors gracefully
5. Return valid PDF responses

## Future Improvements

1. **Caching**: Implement Redis caching for generated PDFs
2. **Queue System**: Use job queue for PDF generation
3. **CDN**: Store generated PDFs in CDN
4. **Templates**: Support multiple receipt templates
5. **Batch Generation**: Support bulk PDF generation
