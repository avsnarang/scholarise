import { TeacherStatsCards } from "@/components/teachers/teacher-stats-cards"
import { AppLayout } from "@/components/layout/app-layout"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { TeacherDataTable, type Teacher } from "@/components/teachers/teacher-data-table"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState } from "react"
import { TeacherAdvancedFilters, type AdvancedFilters } from "@/components/teachers/teacher-advanced-filters"
import { useToast } from "@/components/ui/use-toast"
import type { NextPageWithLayout } from "../_app"

const TeachersPage: NextPageWithLayout = () => {
  const [filters, setFilters] = useState<AdvancedFilters>({
    conditions: [
      {
        id: "default-active-filter",
        field: "isActive",
        operator: "equals",
        value: true,
      }
    ],
    logicOperator: "and",
  });

  const { toast } = useToast();
  const utils = api.useContext();

  // API query
  const { data: teachersData, isLoading } = api.teacher.getAll.useQuery({
    advancedFilters: filters,
  });

  // Transform data to match the Teacher type
  const teachers: Teacher[] = (teachersData?.items || []).map(teacher => {
    // Get branch name from a branch lookup if needed
    const branchName = "Main Branch"; // This would come from a lookup based on branchId

    return {
      id: teacher.id,
      employeeCode: teacher.employeeCode || '',
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: (teacher as any).email || undefined,
      phone: (teacher as any).phone || undefined,
      qualification: teacher.qualification || undefined,
      specialization: teacher.specialization || undefined,
      joinDate: teacher.joinDate?.toISOString() || undefined,
      isActive: teacher.isActive,
      branch: {
        name: branchName
      }
    };
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  return (
    <PageWrapper
      title="Teachers"
      subtitle="Manage all teachers in your institution"
      action={
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/teachers/create">
            <Button className="flex items-center gap-1 bg-[#00501B] hover:bg-[#00501B]/90 text-white">
              <PlusCircle className="h-4 w-4" />
              <span>Add Teacher</span>
            </Button>
          </Link>
        </div>
      }
    >
      <TeacherStatsCards />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Teachers</h2>
          <TeacherAdvancedFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading teachers...
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No teachers found. Try adjusting your filters.
          </div>
        ) : (
          <TeacherDataTable
            data={teachers}
          />
        )}
      </div>
    </PageWrapper>
  )
}

TeachersPage.getLayout = (page) => {
  return <AppLayout title="Teachers" description="Manage teachers in ScholaRise ERP">{page}</AppLayout>
}

export default TeachersPage
