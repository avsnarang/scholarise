import fs from 'fs';
import path from 'path';

/**
 * Get logo as base64 data URI for embedding directly in HTML
 * This is more reliable for PDF generation than external URLs
 */
export function getLogoAsDataUri(branchCode?: string): string | null {
  try {
    // Only works server-side
    if (typeof window !== 'undefined') {
      return null;
    }
    
    const logoFileName = 'logo.png';
    let logoPath = '';
    
    // Try branch-specific logo first
    if (branchCode) {
      logoPath = path.join(process.cwd(), 'public', 'logos', branchCode, logoFileName);
      if (!fs.existsSync(logoPath)) {
        // Fallback to default
        logoPath = path.join(process.cwd(), 'public', 'logos', 'default', logoFileName);
      }
    } else {
      // Use default logo
      logoPath = path.join(process.cwd(), 'public', 'logos', 'default', logoFileName);
    }
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      // Try the android-chrome logo as last fallback
      logoPath = path.join(process.cwd(), 'public', 'android-chrome-192x192.png');
    }
    
    if (!fs.existsSync(logoPath)) {
      console.warn(`Logo not found for branch: ${branchCode || 'default'}`);
      return null;
    }
    
    // Read file and convert to base64
    const logoBuffer = fs.readFileSync(logoPath);
    const base64Logo = logoBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Logo}`;
    
    console.log(`✅ Logo loaded for branch ${branchCode || 'default'}, size: ${logoBuffer.length} bytes`);
    
    return dataUri;
    
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

/**
 * Extract branch code from receipt number
 */
export function extractBranchCode(receiptNumber: string): string {
  if (receiptNumber && receiptNumber.includes('/')) {
    return receiptNumber.split('/')[0] || '';
  }
  return '';
}
