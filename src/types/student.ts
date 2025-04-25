export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string;
  gender: string;
  address?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  joinDate: Date | string;
  class: string;
  section: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  branchId: string;
  classId?: string;
  parentId?: string;
}
