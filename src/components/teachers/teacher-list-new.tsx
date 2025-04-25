import { useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  FileDown,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/utils/api";
import { TeacherAdvancedFilters, type AdvancedFilters } from "./teacher-advanced-filters";
import { TeacherStatsCards } from "./teacher-stats-cards";
import { exportToCSV } from "@/utils/export";
import { useToast } from "@/components/ui/use-toast";
import { TeacherDataTable } from "./teacher-data-table";

export function TeacherList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
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
  const { hasPermission } = usePermissions();

  // API query
  const { data: teachersData, isLoading } = api.teacher.getAll.useQuery({
    advancedFilters: filters,
    search: searchQuery || undefined,
  });
  const teachers = teachersData?.items || [];
  const filteredTeachers = teachers;

  // Export functions
  const handleExportCSV = () => {
    const headers = [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
    ];

    const exportData = teachers.map((teacher: any) => ({
      employeeCode: teacher.employeeCode,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
    }));

    exportToCSV(exportData, headers, 'teachers.csv');

    toast({
      title: "Export successful",
      description: `Exported ${teachers.length} teachers to CSV`,
      variant: "success"
    });
  };

  const handleExportPDF = () => {
    console.log("Export to PDF");
    toast({
      title: "Export initiated",
      description: "Preparing PDF export...",
      variant: "info"
    });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  // Check permissions
  const canCreate = true; // hasPermission("teacher", "global", "create");

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <TeacherStatsCards />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
          <p className="text-gray-500">Manage all teachers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Link href="/teachers/create">
              <Button className="flex items-center gap-1 bg-[#00501B] hover:bg-[#00501B]/90 text-white shadow-sm transition-all duration-200">
                <PlusCircle className="h-4 w-4" />
                <span>Add Teacher</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="max-w-sm border-0 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <TeacherAdvancedFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
            {/* Show reset button if there are filters other than the default isActive filter */}
            {(filters.conditions.length > 1 ||
              (filters.conditions.length === 1 && filters.conditions[0] &&
                (filters.conditions[0].field !== "isActive" ||
                 filters.conditions[0].operator !== "equals" ||
                 filters.conditions[0].value !== true))) && (
              <Button
                variant="ghost"
                className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                onClick={() => handleFilterChange({
                  conditions: [
                    {
                      id: "default-active-filter",
                      field: "isActive",
                      operator: "equals",
                      value: true,
                    }
                  ],
                  logicOperator: "and",
                })}
              >
                <X className="h-4 w-4" />
                <span className="font-medium">Clear</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:border-[#00501B]/30 transition-all duration-200"
              onClick={handleExportCSV}
            >
              <FileDown className="h-4 w-4" />
              <span className="font-medium">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:border-[#00501B]/30 transition-all duration-200"
              onClick={handleExportPDF}
            >
              <FileDown className="h-4 w-4" />
              <span className="font-medium">Export PDF</span>
            </Button>
          </div>
        </div>

        {/* New Data Table Component */}
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading teachers...
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No teachers found. Try adjusting your filters.
          </div>
        ) : (
          <TeacherDataTable 
            data={filteredTeachers} 
            onRowSelectionChange={(selectedRows) => setSelectedTeacherIds(selectedRows)}
          />
        )}
      </div>
    </div>
  );
}
