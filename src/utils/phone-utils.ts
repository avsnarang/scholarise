/**
 * Phone number utilities for proper normalization and comparison
 */

export interface NormalizedPhone {
  original: string;
  normalized: string;
  isValid: boolean;
  countryCode?: string;
  nationalNumber?: string;
}

/**
 * Normalize phone number for comparison
 * Handles various formats like +91, 91, without country code, etc.
 */
export function normalizePhoneNumber(phoneNumber: string): NormalizedPhone {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      original: phoneNumber || '',
      normalized: '',
      isValid: false
    };
  }

  // Remove whatsapp: prefix and all non-digit characters
  let cleaned = phoneNumber
    .replace(/^whatsapp:/, '')
    .replace(/[^\d]/g, '');

  // Handle empty or too short numbers
  if (cleaned.length < 10) {
    return {
      original: phoneNumber,
      normalized: cleaned,
      isValid: false
    };
  }

  let normalized = cleaned;
  let countryCode = '';
  let nationalNumber = '';

  // Handle Indian numbers specifically (most common case)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    // 10-digit Indian mobile number starting with 9
    countryCode = '91';
    nationalNumber = cleaned;
    normalized = '91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // 12-digit number with Indian country code
    countryCode = '91';
    nationalNumber = cleaned.substring(2);
    normalized = cleaned;
  } else if (cleaned.length === 13 && cleaned.startsWith('91')) {
    // 13-digit number (sometimes with extra digit)
    countryCode = '91';
    nationalNumber = cleaned.substring(2);
    normalized = cleaned.substring(0, 12); // Take first 12 digits
  } else if (cleaned.length >= 10 && cleaned.length <= 15) {
    // International number - keep as is if reasonable length
    normalized = cleaned;
    if (cleaned.length > 10) {
      // Try to extract country code (first 1-3 digits)
      const possibleCountryCode = cleaned.substring(0, cleaned.length - 10);
      const possibleNational = cleaned.substring(cleaned.length - 10);
      if (possibleCountryCode.length <= 3) {
        countryCode = possibleCountryCode;
        nationalNumber = possibleNational;
      }
    }
  } else {
    // Invalid length
    return {
      original: phoneNumber,
      normalized: cleaned,
      isValid: false
    };
  }

  return {
    original: phoneNumber,
    normalized,
    isValid: true,
    countryCode,
    nationalNumber
  };
}

/**
 * Compare two phone numbers for exact match
 * Handles different formats and normalization
 */
export function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;

  const norm1 = normalizePhoneNumber(phone1);
  const norm2 = normalizePhoneNumber(phone2);

  if (!norm1.isValid || !norm2.isValid) return false;

  // Exact match on normalized numbers
  if (norm1.normalized === norm2.normalized) return true;

  // Also try matching just the national number for cases where 
  // one has country code and other doesn't
  if (norm1.nationalNumber && norm2.nationalNumber) {
    return norm1.nationalNumber === norm2.nationalNumber;
  }

  return false;
}

/**
 * Find matching phone number from a list
 * Returns the first match found
 */
export function findMatchingPhone(
  targetPhone: string, 
  phoneList: (string | null | undefined)[]
): string | null {
  if (!targetPhone) return null;

  const targetNorm = normalizePhoneNumber(targetPhone);
  if (!targetNorm.isValid) return null;

  for (const phone of phoneList) {
    if (phone && phoneNumbersMatch(targetPhone, phone)) {
      return phone;
    }
  }

  return null;
}

/**
 * Validate if a phone number is in a valid format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);
  return normalized.isValid;
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!normalized.isValid) return phoneNumber;

  // Format Indian numbers nicely
  if (normalized.countryCode === '91' && normalized.nationalNumber) {
    return `+91 ${normalized.nationalNumber}`;
  }

  // Format other international numbers
  if (normalized.countryCode && normalized.nationalNumber) {
    return `+${normalized.countryCode} ${normalized.nationalNumber}`;
  }

  return `+${normalized.normalized}`;
}

/**
 * Convert to WhatsApp format
 */
export function formatForWhatsApp(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!normalized.isValid) return phoneNumber;

  return `whatsapp:+${normalized.normalized}`;
} 