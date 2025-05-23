import { useAuth } from './useAuth';
import { api } from '@/utils/api';
import { Role } from '@/types/permissions';

export function useUserRole() {
  const { user } = useAuth();
  
  // Get teacher data if user has Teacher role
  const { data: teacherData } = api.teacher.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id && (user?.roles?.includes('Teacher') || user?.roles?.includes('teacher') || user?.role === 'Teacher' || user?.role === 'teacher') }
  );
  
  // Get employee data if user has Employee role
  const { data: employeeData } = api.employee.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id && (user?.roles?.includes('Employee') || user?.roles?.includes('employee') || user?.role === 'Employee' || user?.role === 'employee') }
  );
  
  // Check if user has specific roles - handle both formats (capitalized and role enum format)
  const isTeacher = user?.roles?.includes('Teacher') || user?.roles?.includes(Role.TEACHER) || user?.role === 'Teacher' || user?.role === Role.TEACHER;
  const isEmployee = user?.roles?.includes('Employee') || user?.roles?.includes(Role.STAFF) || user?.role === 'Employee' || user?.role === Role.STAFF;
  const isAdmin = user?.roles?.includes('Admin') || user?.roles?.includes(Role.ADMIN) || user?.role === 'Admin' || user?.role === Role.ADMIN;
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') || user?.roles?.includes(Role.SUPER_ADMIN) || user?.role === 'SuperAdmin' || user?.role === Role.SUPER_ADMIN;
  const isParent = user?.roles?.includes('Parent') || user?.roles?.includes('parent') || user?.role === 'Parent' || user?.role === 'parent';
  const isStudent = user?.roles?.includes('Student') || user?.roles?.includes('student') || user?.role === 'Student' || user?.role === 'student';
  
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
