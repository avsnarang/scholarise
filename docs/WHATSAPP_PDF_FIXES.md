# WhatsApp PDF Receipt Fixes

## Issues Fixed (January 2025)

### 1. PDF Shows as "Untitled" in WhatsApp
**Problem**: When PDF is sent via WhatsApp, it shows as "Untitled" instead of the receipt number.

**Solution**: Added `filename` parameter to the WhatsApp document header:
```javascript
document: {
  link: receiptPdfUrl,
  filename: `${data.receiptNumber}.pdf`  // Added this line
}
```

**File Updated**: `src/services/whatsapp-receipt-service.ts`

### 2. Logo Not Displaying in PDF
**Problem**: School logo was not appearing in generated PDFs sent via WhatsApp.

**Root Causes**:
1. Relative URLs (`/android-chrome-192x192.png`) not accessible during server-side PDF generation
2. Images not loading before PDF generation completes

**Solutions Implemented**:

#### A. Convert Logo URLs to Absolute
- Always convert relative logo URLs to absolute URLs using `NEXT_PUBLIC_APP_URL`
- Added fallback to `VERCEL_URL` for production deployments
- Files updated:
  - `src/services/receipt-service.ts`
  - `src/app/api/receipts/[receiptNumber]/pdf/route.ts`
  - `src/app/api/receipts/[receiptNumber]/pdf-light/route.ts`

#### B. Wait for Images to Load
- Changed `waitUntil: 'domcontentloaded'` to `waitUntil: 'networkidle2'`
- Added 500ms delay after content load to ensure images render
- This ensures Puppeteer waits for all network requests (including images) to complete

#### C. Add Error Handling for Missing Images
- Added `onerror="this.style.display='none'"` to logo img tag
- Gracefully hides logo if it fails to load

### 3. E-Generated Receipt Text Update
**User Request**: Show both "Cashier's Signature" heading and e-generated text

**Implementation**:
```html
<div style="margin-top: 15px;"><strong>Cashier's Signature</strong></div>
<div style="margin-top: 15px; font-size: 8px; font-style: italic; color: #666;">
  This is an E-Generated Receipt.<br/>
  Signature is not required.
</div>
```

## Technical Implementation Details

### Logo URL Resolution
```javascript
// In PDF generation routes
if (receiptData.branch.logoUrl && receiptData.branch.logoUrl.startsWith('/')) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                 'https://scholarise.vercel.app';
  receiptData.branch.logoUrl = `${baseUrl}${receiptData.branch.logoUrl}`;
  console.log(`📷 Using logo URL for PDF: ${receiptData.branch.logoUrl}`);
}
```

### Puppeteer Configuration for Images
```javascript
// Wait for network to be idle (all images loaded)
await page.setContent(htmlContent, { 
  waitUntil: 'networkidle2',  // Changed from 'domcontentloaded'
  timeout: 20000
});

// Additional wait for rendering
await new Promise(resolve => setTimeout(resolve, 500));
```

### WhatsApp Document Header
```javascript
{
  type: "document",
  document: {
    link: receiptPdfUrl,
    filename: `${data.receiptNumber}.pdf`  // Now shows proper filename
  }
}
```

## Testing Checklist
- [ ] PDF shows receipt number as filename in WhatsApp
- [ ] Logo appears in standard PDF generation
- [ ] Logo appears in lightweight PDF fallback
- [ ] E-Generated text appears below Cashier's Signature
- [ ] PDFs generate successfully on Vercel production

## Environment Variables Required
- `NEXT_PUBLIC_APP_URL`: Base URL of the application (e.g., https://scholarise.vercel.app)
- `VERCEL_URL`: Automatically set by Vercel (used as fallback)

## Fallback Chain for Logo URL
1. Use `NEXT_PUBLIC_APP_URL` if available
2. Fall back to `VERCEL_URL` with https prefix
3. Final fallback to hardcoded production URL

This ensures the logo works in all deployment scenarios.

