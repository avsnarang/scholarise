# PDF Logo and Signature Display Fix

## Issues Resolved

### 1. Logo Not Appearing in PDF
**Problem**: The logo was not displaying in generated PDFs even though the path was correct.

**Root Causes**:
1. External URLs not loading properly during PDF generation
2. Puppeteer not waiting for images to load completely
3. Network timing issues with image loading

**Solution Implemented**:
- Created a helper utility (`logo-helper.ts`) that reads logo files directly from the filesystem
- Converts logos to base64 data URIs for embedding directly in HTML
- This eliminates network requests and ensures logos are always available

### 2. Cashier's Signature Text Not Showing
**Problem**: The "Cashier's Signature" heading was not appearing above the "E-Generated Receipt" text.

**Solution**:
- Adjusted the HTML structure and styling
- Reduced margin spacing to ensure both elements fit properly
- Changed from stacked margins to proper spacing

## Implementation Details

### 1. Logo Helper Utility (`src/utils/logo-helper.ts`)
```typescript
// Reads logo from filesystem and returns as base64 data URI
getLogoAsDataUri(branchCode?: string): string | null

// Logic:
1. Check for branch-specific logo: /public/logos/{branchCode}/logo.png
2. Fallback to default: /public/logos/default/logo.png  
3. Convert to base64 data URI: data:image/png;base64,...
```

### 2. PDF Routes Updated
Both PDF generation routes now use embedded logos:
- `/api/receipts/[receiptNumber]/pdf` - Standard PDF
- `/api/receipts/[receiptNumber]/pdf-light` - Lightweight PDF

```typescript
// Get logo as base64 for embedding
const branchCode = receiptData.branch.code || extractFromReceipt(receiptNumber);
const logoDataUri = getLogoAsDataUri(branchCode);

if (logoDataUri) {
  receiptData.branch.logoUrl = logoDataUri; // Embed directly
}
```

### 3. Improved Image Loading in Puppeteer
```javascript
// Wait for all images to complete loading
await page.evaluate(() => {
  return new Promise((resolve) => {
    const images = document.querySelectorAll('img');
    // Wait for each image to load or error
    // Timeout after 3 seconds to prevent hanging
  });
});
```

### 4. Signature Section HTML Structure
```html
<!-- For PDFs (isForPDF = true) -->
<div style="text-align: right;">
  <div style="margin-bottom: 8px;"><strong>Received By</strong></div>
  <div style="margin-top: 10px; margin-bottom: 5px;">
    <strong>Cashier's Signature</strong>
  </div>
  <div style="font-size: 8px; font-style: italic; color: #666;">
    This is an E-Generated Receipt.<br/>
    Signature is not required.
  </div>
</div>
```

## Benefits of Base64 Embedding

1. **Reliability**: No external requests, logos always available
2. **Performance**: Faster PDF generation (no network wait)
3. **Consistency**: Same logo appears every time
4. **Offline Support**: Works even without internet
5. **Vercel Compatible**: No issues with serverless timeouts

## Logo Directory Structure
```
public/logos/
├── default/logo.png     # Fallback for unknown branches
├── TSHPS/logo.png       # Paonta Sahib branch
├── TSHB/logo.png        # Branch B
├── TSHD/logo.png        # Branch D
└── TSHM/logo.png        # Branch M
```

## Testing Checklist

- [x] Logo appears in standard PDF generation
- [x] Logo appears in lightweight PDF
- [x] Branch-specific logos work correctly
- [x] Default logo fallback works
- [x] "Cashier's Signature" text appears
- [x] "E-Generated Receipt" disclaimer appears
- [x] Both signature texts visible in PDF
- [x] WhatsApp PDF shows correct filename

## Debugging Tips

### If Logo Still Not Appearing:
1. Check console logs for "Logo Resolution" messages
2. Verify logo file exists: `ls public/logos/{BRANCH_CODE}/logo.png`
3. Check if base64 conversion succeeds in logs
4. Ensure logo file is valid PNG format

### If Signature Text Not Showing:
1. Check `isForPDF` parameter is `true` when calling `generateReceiptHTML`
2. Verify HTML structure in browser DevTools
3. Check for CSS conflicts or overflow issues

## Environment Variables
Ensure these are set for production:
- `NEXT_PUBLIC_APP_URL`: Your production URL
- `VERCEL_URL`: Automatically set by Vercel

## Performance Notes
- Base64 encoding adds ~33% to logo size in HTML
- For logos under 50KB, this is negligible
- Embedded logos eliminate network latency
- Overall faster PDF generation despite larger HTML
