import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number in Indian numbering system (lakhs and crores)
 * @param num - The number to format
 * @param showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted string with Indian numbering
 */
export function formatIndianNumber(num: number, showDecimals: boolean = false): string {
  if (num === 0) return "0";
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  // Helper function to add commas in Indian format
  const addCommas = (numStr: string): string => {
    // Remove any existing commas
    numStr = numStr.replace(/,/g, '');
    
    // For numbers less than 1000, no commas needed
    if (numStr.length <= 3) {
      return numStr;
    }
    
    // Split into integer and decimal parts
    const parts = numStr.split('.');
    let integerPart = parts[0]!;
    const decimalPart = parts[1];
    
    // Apply Indian numbering system
    let result = '';
    let count = 0;
    
    // Process from right to left
    for (let i = integerPart.length - 1; i >= 0; i--) {
      if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
        result = ',' + result;
      }
      result = integerPart[i] + result;
      count++;
    }
    
    // Add decimal part back if it exists
    if (decimalPart) {
      result += '.' + decimalPart;
    }
    
    return result;
  };
  
  let formattedNumber: string;
  
  if (showDecimals) {
    formattedNumber = addCommas(absNum.toFixed(2));
  } else {
    formattedNumber = addCommas(Math.round(absNum).toString());
  }
  
  return (isNegative ? '-' : '') + formattedNumber;
}

/**
 * Format currency in Indian numbering system with ₹ symbol
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted currency string
 */
export function formatIndianCurrency(amount: number, showDecimals: boolean = false): string {
  return `₹${formatIndianNumber(amount, showDecimals)}`;
}

/**
 * Convert number to words in Indian numbering system (lakhs, crores)
 * @param num - The number to convert
 * @returns String representation in words
 */
export function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  if (absNum >= 10000000) { // 1 crore and above
    const crores = Math.floor(absNum / 10000000);
    const remainder = absNum % 10000000;
    let result = `${formatIndianNumber(crores)} Crore${crores > 1 ? 's' : ''}`;
    
    if (remainder >= 100000) { // Remaining lakhs
      const lakhs = Math.floor(remainder / 100000);
      result += ` ${formatIndianNumber(lakhs)} Lakh${lakhs > 1 ? 's' : ''}`;
      const finalRemainder = remainder % 100000;
      if (finalRemainder > 0) {
        result += ` ${formatIndianNumber(finalRemainder)}`;
      }
    } else if (remainder > 0) {
      result += ` ${formatIndianNumber(remainder)}`;
    }
    
    return (isNegative ? 'Minus ' : '') + result;
  } else if (absNum >= 100000) { // 1 lakh and above
    const lakhs = Math.floor(absNum / 100000);
    const remainder = absNum % 100000;
    let result = `${formatIndianNumber(lakhs)} Lakh${lakhs > 1 ? 's' : ''}`;
    
    if (remainder > 0) {
      result += ` ${formatIndianNumber(remainder)}`;
    }
    
    return (isNegative ? 'Minus ' : '') + result;
  } else {
    return (isNegative ? 'Minus ' : '') + formatIndianNumber(absNum);
  }
}

// Alias for cn to match different naming conventions
export const cx = cn

export function formatDate(date: Date | string): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
