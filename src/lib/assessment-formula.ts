import { Parser } from 'expr-eval';
import type { FormulaContext } from '@/types/assessment';

// Safe formula evaluator for assessment calculations
export class AssessmentFormulaEvaluator {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    
    // Add custom functions for assessment calculations
    this.parser.functions.sum = (arr: number[]) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((sum, val) => sum + (val || 0), 0);
    };

    this.parser.functions.avg = (arr: number[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      return this.parser.functions.sum(arr) / arr.length;
    };

    this.parser.functions.max = (arr: number[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      return Math.max(...arr.filter(val => val !== null && val !== undefined));
    };

    this.parser.functions.min = (arr: number[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      return Math.min(...arr.filter(val => val !== null && val !== undefined));
    };

    this.parser.functions.round = (num: number, decimals = 2) => {
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    this.parser.functions.ceil = Math.ceil;
    this.parser.functions.floor = Math.floor;
  }

  /**
   * Evaluate a formula with given context
   * @param formula - The formula string to evaluate
   * @param context - Variables available in the formula
   * @returns The calculated result
   */
  evaluate(formula: string, context: FormulaContext): number {
    try {
      // Sanitize the formula - only allow safe characters
      if (!this.isFormulaValid(formula)) {
        throw new Error('Invalid formula: contains unsafe characters');
      }

      // Parse and evaluate the formula
      const expr = this.parser.parse(formula);
      const result = expr.evaluate(context);

      // Ensure result is a number
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula evaluation did not return a valid number');
      }

      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if a formula is safe to evaluate
   * @param formula - The formula string to validate
   * @returns true if formula is safe
   */
  private isFormulaValid(formula: string): boolean {
    // Allow only safe characters: numbers, operators, parentheses, letters, dots, underscores
    const safePattern = /^[a-zA-Z0-9+\-*/().,_\s]+$/;
    
    // Disallow dangerous patterns
    const dangerousPatterns = [
      /eval/i,
      /function/i,
      /constructor/i,
      /prototype/i,
      /__/,
      /\[/,
      /\]/,
      /;/,
      /=/
    ];

    if (!safePattern.test(formula)) {
      return false;
    }

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get available variables and functions for formula help
   */
  getAvailableFunctions(): Record<string, string> {
    return {
      'raw': 'Raw score obtained by student',
      'rawMax': 'Maximum raw score possible',
      'subScores': 'Array of sub-criteria scores',
      'totalMax': 'Total maximum score',
      'sum(array)': 'Sum of array values',
      'avg(array)': 'Average of array values',
      'max(array)': 'Maximum value in array',
      'min(array)': 'Minimum value in array',
      'round(number, decimals)': 'Round number to specified decimals',
      'ceil(number)': 'Round up to nearest integer',
      'floor(number)': 'Round down to nearest integer'
    };
  }

  /**
   * Test a formula with sample data
   * @param formula - Formula to test
   * @param sampleContext - Sample context for testing
   * @returns Test result with success status and result/error
   */
  testFormula(formula: string, sampleContext: FormulaContext): { success: boolean; result?: number; error?: string } {
    try {
      const result = this.evaluate(formula, sampleContext);
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Singleton instance
export const formulaEvaluator = new AssessmentFormulaEvaluator();

// Common formula templates
export const FORMULA_TEMPLATES = {
  // Simple percentage: (raw / rawMax) * weight
  SIMPLE_PERCENTAGE: '(raw / rawMax) * {weight}',
  
  // Sub-criteria sum with weight: (sum(subScores) / totalMax) * weight
  SUB_CRITERIA_SUM: '(sum(subScores) / totalMax) * {weight}',
  
  // Average of sub-criteria: avg(subScores)
  SUB_CRITERIA_AVERAGE: 'avg(subScores)',
  
  // Weighted average: (raw * 0.7) + (avg(subScores) * 0.3)
  WEIGHTED_AVERAGE: '(raw * {primaryWeight}) + (avg(subScores) * {secondaryWeight})',
  
  // Pass the raw score as-is
  RAW_SCORE: 'raw',
  
  // Grade boundaries with conditions
  GRADE_BOUNDARY: 'raw >= {passMarks} ? raw : 0'
};

// Helper function to replace placeholders in formula templates
export function applyFormulaTemplate(template: string, replacements: Record<string, number>): string {
  let formula = template;
  for (const [key, value] of Object.entries(replacements)) {
    formula = formula.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
  }
  return formula;
} 