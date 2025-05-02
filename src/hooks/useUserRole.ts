import { useAuth } from './useAuth';
import { api } from '@/utils/api';

export function useUserRole() {
  const { user } = useAuth();
  
  // Get teacher data if user has Teacher role
  const { data: teacherData } = api.teacher.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id && (user?.roles?.includes('Teacher') || user?.role === 'Teacher') }
  );
  
  // Get employee data if user has Employee role
  const { data: employeeData } = api.employee.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id && (user?.roles?.includes('Employee') || user?.role === 'Employee') }
  );
  
  // Check if user has specific roles
  const isTeacher = user?.roles?.includes('Teacher') || user?.role === 'Teacher';
  const isEmployee = user?.roles?.includes('Employee') || user?.role === 'Employee';
  const isAdmin = user?.roles?.includes('Admin') || user?.role === 'Admin';
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') || user?.role === 'SuperAdmin';
  const isParent = user?.roles?.includes('Parent') || user?.role === 'Parent';
  const isStudent = user?.roles?.includes('Student') || user?.role === 'Student';
  
  return {
    userId: user?.id,
    teacherId: teacherData?.id,
    employeeId: employeeData?.id,
    isTeacher,
    isEmployee,
    isAdmin,
    isSuperAdmin,
    isParent,
    isStudent,
    teacher: teacherData,
    employee: employeeData,
  };
}
