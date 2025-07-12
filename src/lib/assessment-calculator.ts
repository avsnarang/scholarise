import { formulaEvaluator } from './assessment-formula';
import type {
  AssessmentSchema,
  AssessmentComponent,
  AssessmentSubCriteria,
  ComponentScore,
  SubCriteriaScore,
  AssessmentCalculationResult,
  FormulaContext
} from '@/types/assessment';

export class AssessmentCalculator {
  /**
   * Calculate scores for a student's assessment
   * @param schema - The assessment schema
   * @param componentScores - Student's component scores
   * @returns Calculated assessment result
   */
  calculateAssessment(
    schema: AssessmentSchema,
    componentScores: ComponentScore[]
  ): AssessmentCalculationResult {
    const result: AssessmentCalculationResult = {
      componentScores: [],
      finalScore: 0,
      finalPercentage: 0,
      errors: []
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Calculate each component score
    for (const component of schema.components) {
      try {
        const componentScore = componentScores.find(cs => cs.componentId === component.id);
        if (!componentScore) {
          result.errors?.push(`Missing score for component: ${component.name}`);
          continue;
        }

        const calculatedScore = this.calculateComponentScore(component, componentScore);
        
        result.componentScores.push({
          componentId: component.id,
          rawScore: componentScore.rawScore || 0,
          reducedScore: component.reducedScore,
          calculatedScore
        });

        totalWeightedScore += calculatedScore * component.weightage;
        totalWeight += component.weightage;
      } catch (error) {
        const errorMessage = `Error calculating ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors?.push(errorMessage);
      }
    }

    // Calculate final score and percentage
    if (totalWeight > 0) {
      result.finalScore = totalWeightedScore / totalWeight;
      result.finalPercentage = (result.finalScore / schema.totalMarks) * 100;
    }

    return result;
  }

  /**
   * Calculate score for a single component
   * @param component - The assessment component
   * @param componentScore - Student's score for this component
   * @returns Calculated component score
   */
  private calculateComponentScore(
    component: AssessmentComponent,
    componentScore: ComponentScore
  ): number {
    // If component has a custom formula, use it
    if (component.formula) {
      const context = this.buildFormulaContext(component, componentScore);
      return formulaEvaluator.evaluate(component.formula, context);
    }

    // Default calculation: simple percentage reduction
    const rawScore = componentScore.rawScore || 0;
    const percentage = rawScore / component.rawMaxScore;
    return percentage * component.reducedScore;
  }

  /**
   * Build formula context for evaluation
   * @param component - The assessment component
   * @param componentScore - Student's score for this component
   * @returns Formula context object
   */
  private buildFormulaContext(
    component: AssessmentComponent,
    componentScore: ComponentScore
  ): FormulaContext {
    const context: FormulaContext = {
      raw: componentScore.rawScore || 0,
      rawMax: component.rawMaxScore,
      totalMax: component.subCriteria.reduce((sum, sc) => sum + sc.maxScore, 0)
    };

    // Add sub-criteria scores if available
    if (componentScore.subCriteriaScores && componentScore.subCriteriaScores.length > 0) {
      context.subScores = componentScore.subCriteriaScores.map(scs => scs.score || 0);
    }

    // Add individual sub-criteria scores as named variables
    component.subCriteria.forEach((subCriteria, index) => {
      const subScore = componentScore.subCriteriaScores?.find(
        scs => scs.subCriteriaId === subCriteria.id
      );
      context[`sub${index + 1}`] = subScore?.score || 0;
      context[subCriteria.name.toLowerCase().replace(/\s+/g, '_')] = subScore?.score || 0;
    });

    return context;
  }

  /**
   * Validate assessment schema for calculation
   * @param schema - The assessment schema to validate
   * @returns Validation result with errors if any
   */
  validateSchema(schema: AssessmentSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if schema has components
    if (!schema.components || schema.components.length === 0) {
      errors.push('Assessment schema must have at least one component');
    }

    // Validate each component
    for (const component of schema.components) {
      // Check raw max score
      if (component.rawMaxScore <= 0) {
        errors.push(`Component "${component.name}" must have a positive raw max score`);
      }

      // Check reduced score
      if (component.reducedScore <= 0) {
        errors.push(`Component "${component.name}" must have a positive reduced score`);
      }

      // Validate formula if present
      if (component.formula) {
        const testContext: FormulaContext = {
          raw: component.rawMaxScore,
          rawMax: component.rawMaxScore,
          subScores: component.subCriteria.map(sc => sc.maxScore),
          totalMax: component.subCriteria.reduce((sum, sc) => sum + sc.maxScore, 0)
        };

        const testResult = formulaEvaluator.testFormula(component.formula, testContext);
        if (!testResult.success) {
          errors.push(`Invalid formula in component "${component.name}": ${testResult.error}`);
        }
      }

      // Validate sub-criteria
      for (const subCriteria of component.subCriteria) {
        if (subCriteria.maxScore <= 0) {
          errors.push(`Sub-criteria "${subCriteria.name}" in component "${component.name}" must have a positive max score`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate grade based on percentage and grade scale
   * @param percentage - The percentage score
   * @param gradeScale - Grade scale configuration
   * @returns Grade string
   */
  calculateGrade(percentage: number, gradeScale?: any): string {
    // Default CBSE-style grading if no custom scale provided
    if (!gradeScale) {
      if (percentage >= 91) return 'A1';
      if (percentage >= 81) return 'A2';
      if (percentage >= 71) return 'B1';
      if (percentage >= 61) return 'B2';
      if (percentage >= 51) return 'C1';
      if (percentage >= 41) return 'C2';
      if (percentage >= 33) return 'D';
      return 'E';
    }

    // Use custom grade scale
    for (const range of gradeScale.gradeRanges || []) {
      if (percentage >= range.minPercentage && percentage <= range.maxPercentage) {
        return range.grade;
      }
    }

    return 'N/A';
  }

  /**
   * Calculate grade with grade point if available
   * @param percentage - The percentage score
   * @param gradeScale - Grade scale configuration
   * @returns Grade object with grade and optional grade point
   */
  calculateGradeWithPoint(percentage: number, gradeScale?: any): { grade: string; gradePoint?: number; description?: string } {
    // Default CBSE-style grading if no custom scale provided
    if (!gradeScale) {
      const grade = this.calculateGrade(percentage);
      return { grade };
    }

    // Use custom grade scale
    for (const range of gradeScale.gradeRanges || []) {
      if (percentage >= range.minPercentage && percentage <= range.maxPercentage) {
        return {
          grade: range.grade,
          gradePoint: range.gradePoint || undefined,
          description: range.description || undefined
        };
      }
    }

    return { grade: 'N/A' };
  }

  /**
   * Generate assessment summary for a class
   * @param schema - Assessment schema
   * @param allStudentScores - All student scores for the assessment
   * @param gradeScale - Optional grade scale for grade distribution
   * @returns Summary statistics
   */
  generateClassSummary(
    schema: AssessmentSchema,
    allStudentScores: any[],
    gradeScale?: any
  ): {
    totalStudents: number;
    averageScore: number;
    averagePercentage: number;
    highestScore: number;
    lowestScore: number;
    gradeDistribution: Record<string, number>;
    componentAverages: Record<string, number>;
  } {
    const summary = {
      totalStudents: allStudentScores.length,
      averageScore: 0,
      averagePercentage: 0,
      highestScore: 0,
      lowestScore: Infinity,
      gradeDistribution: {} as Record<string, number>,
      componentAverages: {} as Record<string, number>
    };

    if (allStudentScores.length === 0) {
      return summary;
    }

    let totalScore = 0;
    let totalPercentage = 0;

    // Calculate component averages
    const componentTotals: Record<string, number> = {};
    const componentCounts: Record<string, number> = {};

    for (const studentScore of allStudentScores) {
      const result = this.calculateAssessment(schema, studentScore.componentScores || []);
      
      totalScore += result.finalScore;
      totalPercentage += result.finalPercentage;
      
      summary.highestScore = Math.max(summary.highestScore, result.finalScore);
      summary.lowestScore = Math.min(summary.lowestScore, result.finalScore);

      // Grade distribution using provided grade scale
      const grade = this.calculateGrade(result.finalPercentage, gradeScale);
      summary.gradeDistribution[grade] = (summary.gradeDistribution[grade] || 0) + 1;

      // Component averages
      for (const componentScore of result.componentScores) {
        const componentName = schema.components.find(c => c.id === componentScore.componentId)?.name || 'Unknown';
        componentTotals[componentName] = (componentTotals[componentName] || 0) + componentScore.calculatedScore;
        componentCounts[componentName] = (componentCounts[componentName] || 0) + 1;
      }
    }

    summary.averageScore = totalScore / allStudentScores.length;
    summary.averagePercentage = totalPercentage / allStudentScores.length;

    // Calculate component averages
    for (const [componentName, total] of Object.entries(componentTotals)) {
      summary.componentAverages[componentName] = total / (componentCounts[componentName] || 1);
    }

    if (summary.lowestScore === Infinity) {
      summary.lowestScore = 0;
    }

    return summary;
  }
}

// Singleton instance
export const assessmentCalculator = new AssessmentCalculator(); 