// Customizable Assessment Engine Types

export interface AppliedClass {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
}

export interface AssessmentSchema {
  id: string;
  name: string;
  term: string;
  classId: string;
  subjectId: string;
  totalMarks: number;
  isActive: boolean;
  isPublished: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  branchId: string;
  appliedClasses?: AppliedClass[]; // JSON field storing class-section selections
  components: AssessmentComponent[];
  studentScores?: StudentAssessmentScore[];
}

export interface AssessmentComponent {
  id: string;
  name: string;
  description?: string;
  assessmentSchemaId: string;
  rawMaxScore: number;
  reducedScore: number;
  weightage: number;
  formula?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subCriteria: AssessmentSubCriteria[];
  componentScores?: ComponentScore[];
}

export interface AssessmentSubCriteria {
  id: string;
  name: string;
  description?: string;
  componentId: string;
  maxScore: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subCriteriaScores?: SubCriteriaScore[];
}

export interface StudentAssessmentScore {
  id: string;
  assessmentSchemaId: string;
  studentId: string;
  finalScore?: number;
  finalGrade?: string;
  finalPercentage?: number;
  isComplete: boolean;
  submittedAt?: Date;
  enteredBy: string;
  enteredAt: Date;
  updatedAt: Date;
  branchId: string;
  componentScores: ComponentScore[];
}

export interface ComponentScore {
  id: string;
  componentId: string;
  studentAssessmentScoreId: string;
  rawScore?: number;
  reducedScore?: number;
  calculatedScore?: number;
  isComplete: boolean;
  enteredBy: string;
  enteredAt: Date;
  updatedAt: Date;
  subCriteriaScores: SubCriteriaScore[];
}

export interface SubCriteriaScore {
  id: string;
  subCriteriaId: string;
  componentScoreId: string;
  score?: number;
  comments?: string;
  enteredBy: string;
  enteredAt: Date;
  updatedAt: Date;
}

export interface AssessmentPermission {
  id: string;
  assessmentSchemaId?: string;
  userId: string;
  permissionType: AssessmentPermissionType;
  canCreate: boolean;
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
  canPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
  branchId: string;
}

export enum AssessmentPermissionType {
  ADMIN = 'ADMIN',
  SUBJECT_COORDINATOR = 'SUBJECT_COORDINATOR',
  TEACHER = 'TEACHER',
  VIEW_ONLY = 'VIEW_ONLY'
}

// Form types for creating/editing schemas
export interface CreateAssessmentSchemaInput {
  name: string;
  term: string;
  classIds: string[];
  subjectId: string;
  totalMarks: number;
  components: CreateAssessmentComponentInput[];
}

export interface CreateAssessmentComponentInput {
  name: string;
  description?: string;
  rawMaxScore: number;
  reducedScore: number;
  weightage: number;
  formula?: string;
  order: number;
  subCriteria: CreateAssessmentSubCriteriaInput[];
}

export interface CreateAssessmentSubCriteriaInput {
  name: string;
  description?: string;
  maxScore: number;
  order: number;
}

// Formula evaluation context
export interface FormulaContext {
  raw?: number;
  rawMax?: number;
  subScores?: number[];
  totalMax?: number;
  [key: string]: any;
}

// Assessment calculation result
export interface AssessmentCalculationResult {
  componentScores: {
    componentId: string;
    rawScore: number;
    reducedScore: number;
    calculatedScore: number;
  }[];
  finalScore: number;
  finalPercentage: number;
  errors?: string[];
}

// Assessment schema template (for JSON configuration)
export interface AssessmentSchemaTemplate {
  term: string;
  subject: string;
  totalMarks: number;
  components: AssessmentComponentTemplate[];
}

export interface AssessmentComponentTemplate {
  name: string;
  rawTotal: number;
  reducedTo: number;
  formula: string;
  subCriteria?: AssessmentSubCriteriaTemplate[];
}

export interface AssessmentSubCriteriaTemplate {
  name: string;
  max: number;
} 