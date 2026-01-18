// Phone number validation with country code support
// Validates based on country-specific rules

export interface CountryPhoneConfig {
  code: string;
  name: string;
  dialCode: string;
  minLength: number;
  maxLength: number;
  format?: string;
}

// Common countries with their phone number rules
export const countryPhoneConfigs: CountryPhoneConfig[] = [
  { code: "ID", name: "Indonesia", dialCode: "62", minLength: 9, maxLength: 13, format: "8XX-XXXX-XXXX" },
  { code: "US", name: "United States", dialCode: "1", minLength: 10, maxLength: 10, format: "XXX-XXX-XXXX" },
  { code: "MY", name: "Malaysia", dialCode: "60", minLength: 9, maxLength: 10, format: "XX-XXXX-XXXX" },
  { code: "SG", name: "Singapore", dialCode: "65", minLength: 8, maxLength: 8, format: "XXXX-XXXX" },
  { code: "TH", name: "Thailand", dialCode: "66", minLength: 9, maxLength: 9, format: "XX-XXX-XXXX" },
  { code: "PH", name: "Philippines", dialCode: "63", minLength: 10, maxLength: 10, format: "XXX-XXX-XXXX" },
  { code: "VN", name: "Vietnam", dialCode: "84", minLength: 9, maxLength: 10, format: "XX-XXX-XXXX" },
  { code: "JP", name: "Japan", dialCode: "81", minLength: 10, maxLength: 11, format: "XX-XXXX-XXXX" },
  { code: "KR", name: "South Korea", dialCode: "82", minLength: 9, maxLength: 10, format: "XX-XXXX-XXXX" },
  { code: "CN", name: "China", dialCode: "86", minLength: 11, maxLength: 11, format: "XXX-XXXX-XXXX" },
  { code: "IN", name: "India", dialCode: "91", minLength: 10, maxLength: 10, format: "XXXXX-XXXXX" },
  { code: "AU", name: "Australia", dialCode: "61", minLength: 9, maxLength: 9, format: "XXX-XXX-XXX" },
  { code: "GB", name: "United Kingdom", dialCode: "44", minLength: 10, maxLength: 10, format: "XXXX-XXX-XXX" },
  { code: "DE", name: "Germany", dialCode: "49", minLength: 10, maxLength: 11, format: "XXXX-XXXXXXX" },
  { code: "FR", name: "France", dialCode: "33", minLength: 9, maxLength: 9, format: "X-XX-XX-XX-XX" },
  { code: "IT", name: "Italy", dialCode: "39", minLength: 9, maxLength: 10, format: "XXX-XXX-XXXX" },
  { code: "ES", name: "Spain", dialCode: "34", minLength: 9, maxLength: 9, format: "XXX-XXX-XXX" },
  { code: "NL", name: "Netherlands", dialCode: "31", minLength: 9, maxLength: 9, format: "X-XXX-XXXX" },
  { code: "BR", name: "Brazil", dialCode: "55", minLength: 10, maxLength: 11, format: "XX-XXXXX-XXXX" },
  { code: "MX", name: "Mexico", dialCode: "52", minLength: 10, maxLength: 10, format: "XXX-XXX-XXXX" },
  { code: "AE", name: "UAE", dialCode: "971", minLength: 9, maxLength: 9, format: "XX-XXX-XXXX" },
  { code: "SA", name: "Saudi Arabia", dialCode: "966", minLength: 9, maxLength: 9, format: "XX-XXX-XXXX" },
  { code: "RU", name: "Russia", dialCode: "7", minLength: 10, maxLength: 10, format: "XXX-XXX-XX-XX" },
  { code: "TR", name: "Turkey", dialCode: "90", minLength: 10, maxLength: 10, format: "XXX-XXX-XXXX" },
  { code: "PL", name: "Poland", dialCode: "48", minLength: 9, maxLength: 9, format: "XXX-XXX-XXX" },
];

// Find country config by dial code
export function getCountryByDialCode(dialCode: string): CountryPhoneConfig | undefined {
  return countryPhoneConfigs.find(c => c.dialCode === dialCode);
}

// Parse phone number to extract country code and local number
export function parsePhoneNumber(phoneNumber: string): { dialCode: string; localNumber: string; countryConfig?: CountryPhoneConfig } | null {
  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Try to match country codes (longest first)
  const sortedConfigs = [...countryPhoneConfigs].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const config of sortedConfigs) {
    if (cleaned.startsWith(config.dialCode)) {
      return {
        dialCode: config.dialCode,
        localNumber: cleaned.substring(config.dialCode.length),
        countryConfig: config,
      };
    }
  }
  
  // If no country code found, assume it might be a local number
  // Default to Indonesia if number starts with 0 or 8
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return {
      dialCode: '62',
      localNumber: cleaned,
      countryConfig: countryPhoneConfigs.find(c => c.dialCode === '62'),
    };
  }
  
  if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 12) {
    return {
      dialCode: '62',
      localNumber: cleaned,
      countryConfig: countryPhoneConfigs.find(c => c.dialCode === '62'),
    };
  }
  
  return null;
}

// Validate phone number with detailed error messages
export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  formattedNumber?: string;  // Full number with country code (no +)
  dialCode?: string;
  localNumber?: string;
  countryName?: string;
}

export function validatePhoneNumber(dialCode: string, localNumber: string): PhoneValidationResult {
  // Clean the local number - remove all non-digits
  const cleanedLocal = localNumber.replace(/\D/g, '');
  
  // Remove leading 0 if present (common mistake)
  const normalizedLocal = cleanedLocal.startsWith('0') ? cleanedLocal.substring(1) : cleanedLocal;
  
  // Find country config
  const countryConfig = getCountryByDialCode(dialCode);
  
  if (!countryConfig) {
    return {
      isValid: false,
      error: "Invalid country code",
    };
  }
  
  // Check if number is empty
  if (!normalizedLocal) {
    return {
      isValid: false,
      error: "Phone number is required",
    };
  }
  
  // Check if all digits
  if (!/^\d+$/.test(normalizedLocal)) {
    return {
      isValid: false,
      error: "Phone number can only contain digits",
    };
  }
  
  // Check length
  if (normalizedLocal.length < countryConfig.minLength) {
    return {
      isValid: false,
      error: `${countryConfig.name} phone number must be at least ${countryConfig.minLength} digits (you entered: ${normalizedLocal.length} digits)`,
    };
  }
  
  if (normalizedLocal.length > countryConfig.maxLength) {
    return {
      isValid: false,
      error: `${countryConfig.name} phone number can be at most ${countryConfig.maxLength} digits (you entered: ${normalizedLocal.length} digits)`,
    };
  }
  
  // Indonesia specific validation
  if (dialCode === '62') {
    // Must start with 8 for mobile numbers
    if (!normalizedLocal.startsWith('8')) {
      return {
        isValid: false,
        error: "Indonesian mobile numbers must start with 8",
      };
    }
  }
  
  return {
    isValid: true,
    formattedNumber: `${dialCode}${normalizedLocal}`,
    dialCode,
    localNumber: normalizedLocal,
    countryName: countryConfig.name,
  };
}

// Format phone number for display (with country code, no +)
export function formatPhoneForStorage(dialCode: string, localNumber: string): string {
  const cleanedLocal = localNumber.replace(/\D/g, '');
  const normalizedLocal = cleanedLocal.startsWith('0') ? cleanedLocal.substring(1) : cleanedLocal;
  return `${dialCode}${normalizedLocal}`;
}

// Format phone number for display with + prefix
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `+${cleaned}`;
}
