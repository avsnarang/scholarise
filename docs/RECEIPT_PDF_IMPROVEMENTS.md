# Receipt PDF Generation Improvements

## Changes Implemented (January 2025)

### 1. PDF File Naming
- **Changed**: PDF files are now named with just the receipt number
- **Before**: `Fee_Receipt_TSHPS_FIN_2025-26_000001.pdf`
- **After**: `TSHPS_FIN_2025-26_000001.pdf`
- **Files Updated**:
  - `/api/receipts/[receiptNumber]/pdf/route.ts`
  - `/api/receipts/[receiptNumber]/pdf-light/route.ts`

### 2. Logo Display in PDFs
- **Issue**: Logo was not displaying in generated PDFs due to relative URL paths
- **Solution**: Convert relative logo URLs to absolute URLs when generating PDFs
- **Implementation**:
  - Added `isForPDF` parameter to `ReceiptService.generateReceiptHTML()`
  - When `isForPDF=true`, logo URLs are converted to absolute paths using `NEXT_PUBLIC_APP_URL`
  - Ensures logo is accessible when PDF is generated on server

### 3. Removed Automatic Receipt Download
- **Changed**: Removed automatic HTML receipt download when payment is collected
- **Reason**: Receipts are automatically sent via WhatsApp, making manual download redundant
- **File Updated**: `src/components/finance/streamlined-fee-collection.tsx`
- **Note**: WhatsApp receipt delivery is handled automatically by the payment collection API

### 4. E-Generated Receipt Signature Text
- **Added**: For PDFs sent via WhatsApp, replaced "Cashier's Signature" with:
  ```
  This is an E-Generated Receipt.
  Signature is not required.
  ```
- **Implementation**:
  - Only applies to PDFs (when `isForPDF=true`)
  - Browser-based printing still shows "Cashier's Signature"
  - Lightweight PDFs also include the e-generated text

## Technical Details

### Receipt Generation Flow
1. **Payment Collection** → Creates fee collection record
2. **WhatsApp Service** → Attempts to generate and send PDF
3. **PDF Generation**:
   - Primary: Full HTML with Puppeteer (`/api/receipts/[receiptNumber]/pdf`)
   - Fallback: Lightweight text-based PDF (`/api/receipts/[receiptNumber]/pdf-light`)
4. **Receipt Delivery** → Sent via WhatsApp with document header

### Key Functions Modified

#### `ReceiptService.generateReceiptHTML(data, isForPDF)`
- **Parameters**:
  - `data`: UnifiedReceiptData object
  - `isForPDF`: Boolean flag (default: false)
- **Behavior**:
  - When `isForPDF=true`:
    - Converts relative logo URLs to absolute
    - Adds "E-Generated Receipt" text instead of signature line
  - When `isForPDF=false`:
    - Uses relative logo URLs (for browser printing)
    - Shows traditional "Cashier's Signature" line

### Logo URL Handling
```typescript
// Make logo URL absolute for PDF generation
let logoUrl = data.branch.logoUrl;
if (isForPDF && logoUrl && logoUrl.startsWith('/')) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scholarise.vercel.app';
  logoUrl = `${baseUrl}${logoUrl}`;
}
```

### E-Generated Receipt Text
```html
<!-- For PDFs -->
<div style="margin-top: 15px; font-size: 8px; font-style: italic; color: #666;">
  This is an E-Generated Receipt.<br/>
  Signature is not required.
</div>

<!-- For Browser Printing -->
<div style="margin-top: 15px;">
  <strong>Cashier's Signature</strong>
</div>
```

## Benefits
1. **Cleaner Filenames**: Receipt numbers are more readable without prefix
2. **Professional PDFs**: Logo properly displays in all generated PDFs
3. **Streamlined UX**: No redundant downloads when receipts are sent via WhatsApp
4. **Clear Documentation**: E-generated receipts clearly indicate no signature needed

## Testing
- Test PDF generation with receipt that has logo
- Verify logo appears in both standard and lightweight PDFs
- Confirm e-generated text appears in WhatsApp PDFs
- Ensure browser printing still shows signature line
