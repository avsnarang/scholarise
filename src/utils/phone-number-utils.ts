/**
 * Phone Number Utilities for WhatsApp Integration
 * Handles normalization and country code addition for international formats
 */

export interface PhoneNumberConfig {
  defaultCountryCode: string;
  allowedCountryCodes: string[];
  stripCharacters: RegExp;
  organizationCountry?: string; // ISO country code (IN, US, UK, etc.)
  branchSpecificRules?: Record<string, string>; // branchId -> country code
}

export interface CountryPhonePattern {
  countryCode: string;
  patterns: RegExp[];
  description: string;
  example: string;
}

export interface PhoneNumberValidationResult {
  isValid: boolean;
  normalizedNumber: string;
  originalNumber: string;
  countryCode: string;
  detectionMethod: 'existing' | 'pattern' | 'default' | 'branch_config';
  errors: string[];
  warnings: string[];
}

// Country-specific phone number patterns
export const COUNTRY_PATTERNS: CountryPhonePattern[] = [
  {
    countryCode: '+91',
    patterns: [/^[6-9]\d{9}$/], // Indian mobile: 10 digits starting with 6-9
    description: 'Indian mobile number',
    example: '9876543210'
  },
  {
    countryCode: '+1',
    patterns: [/^[2-9]\d{9}$/], // US/Canada: 10 digits, first digit 2-9
    description: 'US/Canada number',
    example: '2345678901'
  },
  {
    countryCode: '+44',
    patterns: [/^07\d{9}$/], // UK mobile: 11 digits starting with 07
    description: 'UK mobile number',
    example: '07123456789'
  },
  {
    countryCode: '+971',
    patterns: [/^5[0-9]\d{7}$/], // UAE mobile: 9 digits starting with 5
    description: 'UAE mobile number',
    example: '501234567'
  },
  {
    countryCode: '+65',
    patterns: [/^[89]\d{7}$/], // Singapore: 8 digits starting with 8 or 9
    description: 'Singapore number',
    example: '81234567'
  },
  {
    countryCode: '+966',
    patterns: [/^5\d{8}$/], // Saudi Arabia mobile: 9 digits starting with 5
    description: 'Saudi Arabia mobile',
    example: '501234567'
  }
];

// Default configuration for India (can be overridden)
export const DEFAULT_PHONE_CONFIG: PhoneNumberConfig = {
  defaultCountryCode: '+91',
  allowedCountryCodes: ['+91', '+1', '+44', '+971', '+65', '+966', '+974', '+968', '+973'],
  stripCharacters: /[^\d+]/g,
  organizationCountry: 'IN'
};

/**
 * Detect country code based on phone number patterns
 */
function detectCountryFromPattern(cleanNumber: string): { countryCode: string; method: string } | null {
  for (const pattern of COUNTRY_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(cleanNumber)) {
        return {
          countryCode: pattern.countryCode,
          method: `pattern (${pattern.description})`
        };
      }
    }
  }
  return null;
}

/**
 * Get country-specific configuration based on organization/branch settings
 */
export function getPhoneConfigForContext(context: {
  branchId?: string;
  organizationCountry?: string;
  userPreference?: string;
}): PhoneNumberConfig {
  const baseConfig = { ...DEFAULT_PHONE_CONFIG };
  
  // Override based on organization country
  if (context.organizationCountry) {
    switch (context.organizationCountry.toUpperCase()) {
      case 'IN':
      case 'INDIA':
        baseConfig.defaultCountryCode = '+91';
        baseConfig.organizationCountry = 'IN';
        break;
      case 'US':
      case 'USA':
      case 'UNITED STATES':
        baseConfig.defaultCountryCode = '+1';
        baseConfig.organizationCountry = 'US';
        break;
      case 'UK':
      case 'GB':
      case 'UNITED KINGDOM':
        baseConfig.defaultCountryCode = '+44';
        baseConfig.organizationCountry = 'UK';
        break;
      case 'AE':
      case 'UAE':
        baseConfig.defaultCountryCode = '+971';
        baseConfig.organizationCountry = 'AE';
        break;
      case 'SG':
      case 'SINGAPORE':
        baseConfig.defaultCountryCode = '+65';
        baseConfig.organizationCountry = 'SG';
        break;
    }
  }
  
  // Branch-specific overrides (for future implementation)
  if (context.branchId && baseConfig.branchSpecificRules?.[context.branchId]) {
    baseConfig.defaultCountryCode = baseConfig.branchSpecificRules[context.branchId] || baseConfig.defaultCountryCode;
  }
  
  return baseConfig;
}

/**
 * Normalizes a phone number to international format with intelligent country detection
 */
export function normalizePhoneNumber(
  phoneNumber: string,
  config: PhoneNumberConfig = DEFAULT_PHONE_CONFIG
): PhoneNumberValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalNumber = phoneNumber;
  let detectionMethod: 'existing' | 'pattern' | 'default' | 'branch_config' = 'default';

  // Basic validation
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      normalizedNumber: '',
      originalNumber,
      countryCode: '',
      detectionMethod,
      errors: ['Phone number is required'],
      warnings: []
    };
  }

  // Clean the phone number
  const cleanNumber = phoneNumber.trim().replace(config.stripCharacters, '');

  if (!cleanNumber) {
    return {
      isValid: false,
      normalizedNumber: '',
      originalNumber,
      countryCode: '',
      detectionMethod,
      errors: ['Phone number contains no valid digits'],
      warnings: []
    };
  }

  let normalizedNumber = cleanNumber;
  let detectedCountryCode = '';

  // Step 1: Check if number already has a country code
  if (cleanNumber.startsWith('+')) {
    const hasValidCountryCode = config.allowedCountryCodes.some(code => 
      cleanNumber.startsWith(code)
    );

    if (hasValidCountryCode) {
      detectedCountryCode = config.allowedCountryCodes.find(code => 
        cleanNumber.startsWith(code)
      ) || '';
      normalizedNumber = cleanNumber;
      detectionMethod = 'existing';
    } else {
      warnings.push(`Unrecognized country code in ${cleanNumber}. Using as-is.`);
      normalizedNumber = cleanNumber;
      detectedCountryCode = cleanNumber.substring(0, Math.min(4, cleanNumber.length));
      detectionMethod = 'existing';
    }
  } else {
    // Step 2: Check if number starts with country code without +
    const countryCodeWithoutPlus = config.allowedCountryCodes.find(code => 
      cleanNumber.startsWith(code.substring(1))
    );

    if (countryCodeWithoutPlus) {
      normalizedNumber = '+' + cleanNumber;
      detectedCountryCode = countryCodeWithoutPlus;
      detectionMethod = 'existing';
      warnings.push(`Added missing + to country code`);
    } else {
      // Step 3: Try pattern recognition
      const patternResult = detectCountryFromPattern(cleanNumber);
      
      if (patternResult) {
        normalizedNumber = patternResult.countryCode + cleanNumber;
        detectedCountryCode = patternResult.countryCode;
        detectionMethod = 'pattern';
        warnings.push(`Detected ${patternResult.method}, added ${patternResult.countryCode}`);
        
        // Special handling for UK numbers (remove leading 0)
        if (patternResult.countryCode === '+44' && cleanNumber.startsWith('07')) {
          normalizedNumber = '+44' + cleanNumber.substring(1);
          warnings[warnings.length - 1] = `Detected UK mobile, added +44 and removed leading 0`;
        }
      } else {
        // Step 4: Use default country code
        normalizedNumber = config.defaultCountryCode + cleanNumber;
        detectedCountryCode = config.defaultCountryCode;
        detectionMethod = config.branchSpecificRules ? 'branch_config' : 'default';
        
        const countryName = getCountryName(config.defaultCountryCode);
        warnings.push(`No pattern match found, added default country code ${config.defaultCountryCode} (${countryName})`);
      }
    }
  }

  // Validation checks
  if (normalizedNumber.length < 8) {
    errors.push('Phone number too short (minimum 8 digits including country code)');
  }

  if (normalizedNumber.length > 20) {
    errors.push('Phone number too long (maximum 20 digits including country code)');
  }

  if (!normalizedNumber.startsWith('+')) {
    errors.push('Phone number must start with + for international format');
  }

  if ((/^\+0+/.exec(normalizedNumber)) || normalizedNumber.includes('00')) {
    errors.push('Phone number contains invalid digit patterns');
  }

  return {
    isValid: errors.length === 0,
    normalizedNumber,
    originalNumber,
    countryCode: detectedCountryCode,
    detectionMethod,
    errors,
    warnings
  };
}

/**
 * Get human-readable country name from country code
 */
function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    '+91': 'India',
    '+1': 'US/Canada',
    '+44': 'UK',
    '+971': 'UAE',
    '+65': 'Singapore',
    '+966': 'Saudi Arabia',
    '+974': 'Qatar',
    '+968': 'Oman',
    '+973': 'Bahrain'
  };
  return countryNames[countryCode] || 'Unknown';
}

/**
 * Normalizes multiple phone numbers in batch with detailed analytics
 */
export function normalizePhoneNumbers(
  phoneNumbers: string[],
  config: PhoneNumberConfig = DEFAULT_PHONE_CONFIG
): {
  valid: Array<{ 
    original: string; 
    normalized: string; 
    countryCode: string; 
    detectionMethod: string;
    warnings: string[] 
  }>;
  invalid: Array<{ original: string; errors: string[] }>;
  stats: { 
    total: number; 
    valid: number; 
    invalid: number; 
    warnings: number;
    detectionMethods: Record<string, number>;
    countryCodes: Record<string, number>;
  };
} {
  const valid: Array<{ 
    original: string; 
    normalized: string; 
    countryCode: string; 
    detectionMethod: string;
    warnings: string[] 
  }> = [];
  const invalid: Array<{ original: string; errors: string[] }> = [];
  const detectionMethods: Record<string, number> = {};
  const countryCodes: Record<string, number> = {};
  let warningCount = 0;

  phoneNumbers.forEach(phoneNumber => {
    const result = normalizePhoneNumber(phoneNumber, config);
    
    if (result.isValid) {
      valid.push({
        original: result.originalNumber,
        normalized: result.normalizedNumber,
        countryCode: result.countryCode,
        detectionMethod: result.detectionMethod,
        warnings: result.warnings
      });
      
      // Track statistics
      detectionMethods[result.detectionMethod] = (detectionMethods[result.detectionMethod] || 0) + 1;
      countryCodes[result.countryCode] = (countryCodes[result.countryCode] || 0) + 1;
      
      if (result.warnings.length > 0) warningCount++;
    } else {
      invalid.push({
        original: result.originalNumber,
        errors: result.errors
      });
    }
  });

  return {
    valid,
    invalid,
    stats: {
      total: phoneNumbers.length,
      valid: valid.length,
      invalid: invalid.length,
      warnings: warningCount,
      detectionMethods,
      countryCodes
    }
  };
}

/**
 * Gets phone number config based on branch/organization settings
 * This function can be enhanced to read from database settings
 */
export function getPhoneConfigForBranch(branchId?: string): PhoneNumberConfig {
  // TODO: In the future, this could read from database
  // const branchSettings = await getBranchSettings(branchId);
  // return getPhoneConfigForContext({ branchId, organizationCountry: branchSettings.country });
  
  return getPhoneConfigForContext({ branchId });
}

/**
 * Validates if a phone number is in correct WhatsApp format
 */
export function isValidWhatsAppNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') return false;
  
  if (!phoneNumber.startsWith('+')) return false;
  
  const digitsOnly = phoneNumber.substring(1);
  if (!/^\d+$/.test(digitsOnly)) return false;
  
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  
  return true;
}

/**
 * Extracts country code from a phone number
 */
export function extractCountryCode(phoneNumber: string): string | null {
  if (!phoneNumber?.startsWith('+')) return null;
  
  const commonCountryCodes = ['+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91', '+92', '+93', '+94', '+95', '+98', '+212', '+213', '+216', '+218', '+220', '+221', '+222', '+223', '+224', '+225', '+226', '+227', '+228', '+229', '+230', '+231', '+232', '+233', '+234', '+235', '+236', '+237', '+238', '+239', '+240', '+241', '+242', '+243', '+244', '+245', '+246', '+248', '+249', '+250', '+251', '+252', '+253', '+254', '+255', '+256', '+257', '+258', '+260', '+261', '+262', '+263', '+264', '+265', '+266', '+267', '+268', '+269', '+290', '+291', '+297', '+298', '+299', '+350', '+351', '+352', '+353', '+354', '+355', '+356', '+357', '+358', '+359', '+370', '+371', '+372', '+373', '+374', '+375', '+376', '+377', '+378', '+380', '+381', '+382', '+383', '+385', '+386', '+387', '+389', '+420', '+421', '+423', '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+508', '+509', '+590', '+591', '+592', '+593', '+594', '+595', '+596', '+597', '+598', '+599', '+670', '+672', '+673', '+674', '+675', '+676', '+677', '+678', '+679', '+680', '+681', '+682', '+683', '+684', '+685', '+686', '+687', '+688', '+689', '+690', '+691', '+692', '+850', '+852', '+853', '+855', '+856', '+880', '+882', '+883', '+886', '+888', '+960', '+961', '+962', '+963', '+964', '+965', '+966', '+967', '+968', '+970', '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992', '+993', '+994', '+995', '+996', '+998'];
  
  for (let i = 4; i >= 1; i--) {
    const potentialCode = phoneNumber.substring(0, i + 1);
    if (commonCountryCodes.includes(potentialCode)) {
      return potentialCode;
    }
  }
  
  return null;
}

/**
 * Formats a phone number for display (with proper spacing)
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized.isValid) return phoneNumber;
  
  const number = normalized.normalizedNumber;
  const countryCode = normalized.countryCode;
  
  if (countryCode === '+91') {
    const digits = number.substring(3);
    if (digits.length === 10) {
      return `${countryCode} ${digits.substring(0, 5)} ${digits.substring(5)}`;
    }
  } else if (countryCode === '+1') {
    const digits = number.substring(2);
    if (digits.length === 10) {
      return `${countryCode} (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
  } else if (countryCode === '+44') {
    const digits = number.substring(3);
    if (digits.length === 10) {
      return `${countryCode} ${digits.substring(0, 4)} ${digits.substring(4)}`;
    }
  }
  
  return number.replace(/^(\+\d{1,4})(\d+)$/, '$1 $2');
}

/**
 * Analyze phone numbers and provide recommendations
 */
export function analyzePhoneNumbers(phoneNumbers: string[]): {
  recommendations: string[];
  detectedCountries: Array<{ country: string; count: number; confidence: 'high' | 'medium' | 'low' }>;
  suggestedDefaultCountry: string;
} {
  const results = normalizePhoneNumbers(phoneNumbers);
  const recommendations: string[] = [];
  
  // Analyze country distribution
  const countryStats = Object.entries(results.stats.countryCodes)
    .map(([code, count]) => ({
      country: getCountryName(code),
      code,
      count,
      percentage: (count / results.valid.length) * 100,
      confidence: count > results.valid.length * 0.7 ? 'high' : 
                  count > results.valid.length * 0.3 ? 'medium' : 'low' as 'high' | 'medium' | 'low'
    }))
    .sort((a, b) => b.count - a.count);

  // Generate recommendations
  if (results.stats.invalid > 0) {
    recommendations.push(`${results.stats.invalid} phone numbers are invalid and should be corrected.`);
  }
  
  if (results.stats.warnings > results.stats.valid * 0.5) {
    recommendations.push(`Over 50% of numbers needed normalization. Consider updating your data collection process.`);
  }
  
  const topCountry = countryStats[0];
  if (topCountry && topCountry.percentage > 80) {
    recommendations.push(`${topCountry.percentage.toFixed(1)}% of numbers are from ${topCountry.country}. Consider setting ${topCountry.code} as default.`);
  }
  
  if (countryStats.length > 3) {
    recommendations.push(`Numbers from ${countryStats.length} different countries detected. Consider country-specific validation.`);
  }

  return {
    recommendations,
    detectedCountries: countryStats,
    suggestedDefaultCountry: topCountry?.code || '+91'
  };
} 