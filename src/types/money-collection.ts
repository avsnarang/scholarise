export interface MoneyCollectionWithRelations {
  id: string;
  title: string;
  description: string | null;
  collectionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  branchId: string;
  sessionId?: string;
  branch: {
    name: string;
  };
  classes: Array<{
    id: string;
    classId: string;
    class: {
      name: string;
      section: string;
    }
  }>;
  session?: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    amount: number;
    studentId: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
    };
    receivedAt?: Date;
    notes?: string;
  }>;
} 