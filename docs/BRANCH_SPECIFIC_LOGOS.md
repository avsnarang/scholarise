# Branch-Specific Logo Implementation

## Overview
The receipt PDF generation system now supports branch-specific logos, allowing each branch to have its own unique logo on receipts. The system automatically selects the appropriate logo based on the branch code.

## Directory Structure
```
public/
└── logos/
    ├── README.md           # Documentation
    ├── default/           # Default fallback logo
    │   └── logo.png
    ├── TSHPS/             # Paonta Sahib branch
    │   └── logo.png
    ├── TSHB/              # Another branch
    │   └── logo.png
    ├── TSHD/              # Another branch
    │   └── logo.png
    └── TSHM/              # Another branch
        └── logo.png
```

## How It Works

### 1. Branch Code Detection
The system determines the branch code using the following priority:
1. **From Branch Data**: If `branch.code` is available in the database
2. **From Receipt Number**: Extracts from receipt format (e.g., `TSHPS/FIN/2025-26/000001` → `TSHPS`)
3. **Default Fallback**: Uses `/logos/default/logo.png` if no branch code found

### 2. Logo Path Resolution
```javascript
// Branch code determination logic
let branchCode = '';

// First try explicit branch code
if (data.branch?.code) {
  branchCode = data.branch.code;
} 
// Otherwise extract from receipt number
else if (data.receiptNumber && data.receiptNumber.includes('/')) {
  branchCode = data.receiptNumber.split('/')[0] || '';
}

// Construct logo path
let logoPath = branchCode ? `/logos/${branchCode}/logo.png` : '/logos/default/logo.png';
```

### 3. Absolute URL Generation
For PDF generation and WhatsApp sharing, relative paths are converted to absolute URLs:
```javascript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
               (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
               'https://scholarise.vercel.app';
logoUrl = `${baseUrl}${logoPath}`;
```

## Adding New Branch Logos

### Step 1: Create Branch Directory
```bash
mkdir -p public/logos/BRANCH_CODE
```

### Step 2: Add Logo File
- File must be named `logo.png`
- Recommended size: 192x192px or 256x256px
- Format: PNG (preferably with transparent background)
- Place in: `public/logos/BRANCH_CODE/logo.png`

### Step 3: Verify
The system will automatically use the new logo for receipts from that branch.

## Logo Requirements
- **Format**: PNG
- **Size**: 192x192px minimum, 512x512px maximum
- **File Name**: Must be exactly `logo.png`
- **Background**: Transparent recommended for better appearance
- **Quality**: High resolution for clear printing

## Branch Code Mapping

| Branch Name | Branch Code | Logo Path |
|------------|-------------|-----------|
| Paonta Sahib | TSHPS | `/logos/TSHPS/logo.png` |
| Branch B | TSHB | `/logos/TSHB/logo.png` |
| Branch D | TSHD | `/logos/TSHD/logo.png` |
| Branch M | TSHM | `/logos/TSHM/logo.png` |
| Default/Unknown | - | `/logos/default/logo.png` |

## Testing Logo Display

### 1. Local Testing
```bash
# Check if logo exists
ls -la public/logos/BRANCH_CODE/logo.png

# Test URL accessibility
curl http://localhost:3000/logos/BRANCH_CODE/logo.png
```

### 2. Production Testing
- Generate a receipt for the branch
- Check PDF preview
- Verify WhatsApp receipt attachment

## Troubleshooting

### Logo Not Appearing
1. **Check File Path**: Ensure logo is at `public/logos/BRANCH_CODE/logo.png`
2. **Check Branch Code**: Verify branch code matches directory name exactly (case-sensitive)
3. **Check File Format**: Must be PNG format
4. **Check Permissions**: File should be readable

### Wrong Logo Appearing
1. **Clear Cache**: Browser and CDN caches may need clearing
2. **Check Priority**: Branch code from database overrides receipt number extraction
3. **Verify Mapping**: Ensure branch code in database matches logo directory

### Performance Issues
1. **Optimize Size**: Keep logos under 500KB
2. **Use PNG Compression**: Tools like TinyPNG can reduce file size
3. **CDN Caching**: Logos are cached for better performance

## Benefits
1. **Brand Identity**: Each branch maintains its unique branding
2. **Automatic Selection**: No manual configuration needed per receipt
3. **Fallback Support**: Default logo ensures receipts always have a logo
4. **Easy Management**: Simple file-based system for adding/updating logos
5. **Performance**: Static files served efficiently with caching

## Future Enhancements
1. Support for SVG logos for better scalability
2. Dynamic logo upload through admin panel
3. Multiple logo variants (color, monochrome, etc.)
4. Seasonal or event-specific logos

