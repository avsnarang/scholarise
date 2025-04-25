import { useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  FileDown,
  Edit,
  Trash,
  Eye,
  UserCheck,
  UserX,
  Check,
  X,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ShareButton } from "@/components/shared/share-button";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/utils/api";
import { TeacherAdvancedFilters, type AdvancedFilters } from "./teacher-advanced-filters";
import { TeacherStatsCards } from "./teacher-stats-cards";
import { exportToCSV } from "@/utils/export";
import { usePopup } from "@/components/ui/custom-popup";
import { useToast } from "@/components/ui/use-toast";
import { useCustomAlert, useCustomConfirm, useDeleteConfirm, useBulkDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";

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

  // Custom popup hooks
  const customAlert = useCustomAlert();
  const customConfirm = useCustomConfirm();
  const deleteConfirm = useDeleteConfirm();
  const bulkDeleteConfirm = useBulkDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  const { toast } = useToast();

  // No pagination state needed
  const { hasPermission } = usePermissions();

  // Real API call with filters - no limit to show all teachers
  const { data: teachersData, isLoading } = api.teacher.getAll.useQuery({
    advancedFilters: filters,
    search: searchQuery || undefined,
    // No limit to show all teachers
  });
  const teachers = teachersData?.items || [];
  // No pagination needed since we're showing all teachers

  // All filtering is now done on the server
  const filteredTeachers = teachers;

  const handleExportCSV = () => {
    // Export teachers to CSV
    const headers = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'joinDate', label: 'Join Date' },
      { key: 'isActive', label: 'Status' },
    ];

    // Prepare data for export - ensure consistent format
    const exportData = teachers.map((teacher: any) => ({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      joinDate: teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : '',
      isActive: teacher.isActive ? 'Active' : 'Inactive',
    }));

    exportToCSV(exportData, headers, 'teachers.csv');

    toast({
      title: "Export successful",
      description: `Exported ${teachers.length} teachers to CSV`,
      variant: "success"
    });
  };

  const handleExportPDF = () => {
    // Implementation for exporting to PDF
    console.log("Export to PDF");

    toast({
      title: "Export initiated",
      description: "Preparing PDF export...",
      variant: "info"
    });
  };

  // Mutations
  const utils = api.useContext();

  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      // Refetch teachers after deletion
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
    },
  });

  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      // Refetch teachers after status change
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
    },
  });

  const bulkUpdateStatusMutation = api.teacher.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      // Refetch teachers after bulk status change
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      setSelectedTeacherIds([]);
    },
  });

  const bulkDeleteMutation = api.teacher.bulkDelete.useMutation({
    onSuccess: () => {
      // Refetch teachers after bulk deletion
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      setSelectedTeacherIds([]);
    },
  });

  const handleDeleteTeacher = async (id: string) => {
    deleteConfirm("teacher", async () => {
      try {
        await deleteTeacherMutation.mutateAsync({ id });
        toast({
          title: "Teacher deleted",
          description: "Teacher has been successfully deleted.",
          variant: "success"
        });
      } catch (error) {
        console.error("Error deleting teacher:", error);
        toast({
          title: "Error",
          description: "Failed to delete teacher. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  // Toggle teacher selection
  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((teacherId) => teacherId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle all teachers selection
  const toggleAllTeachers = () => {
    if (selectedTeacherIds.length === filteredTeachers.length) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(filteredTeachers.map((teacher: any) => teacher.id));
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  // No pagination needed since we're showing all teachers

  // Check permissions
  const canCreate = true; // hasPermission("teacher", "global", "create");
  const canEdit = true; // hasPermission("teacher", "global", "edit");
  const canDelete = true; // hasPermission("teacher", "global", "delete");

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
          {/* Filter buttons moved below search bar */}
          {/* Export buttons moved to the filter bar */}
          {/* Share button removed */}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {selectedTeacherIds.length > 0 ? (
          <div className="p-4 border-b border-gray-100 bg-[#00501B]/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#00501B]">
                {selectedTeacherIds.length} {selectedTeacherIds.length === 1 ? 'teacher' : 'teachers'} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 hover:border-[#00501B]/30 hover:text-[#00501B] transition-all duration-200"
                onClick={() => setSelectedTeacherIds([])}
              >
                Deselect All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 hover:border-[#00501B]/30 hover:text-[#00501B] transition-all duration-200"
                onClick={() => {
                  // Handle bulk export
                  const selectedTeachers = filteredTeachers.filter(teacher =>
                    selectedTeacherIds.includes(teacher.id)
                  );
                  // Export logic here
                  toast({
                    title: "Exporting teachers",
                    description: `Exporting ${selectedTeachers.length} teachers`,
                    variant: "info"
                  });
                }}
              >
                <FileDown className="mr-1 h-4 w-4" />
                Export Selected
              </Button>
              {canEdit && (() => {
                // Check if all selected teachers are inactive
                const selectedTeachers = filteredTeachers.filter(teacher =>
                  selectedTeacherIds.includes(teacher.id)
                );
                const allInactive = selectedTeachers.length > 0 &&
                  selectedTeachers.every(teacher => teacher.isActive === false);

                // Check if all selected teachers are active
                const allActive = selectedTeachers.length > 0 &&
                  selectedTeachers.every(teacher => teacher.isActive === true);

                return (
                  <>
                    {allInactive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:border-green-300 hover:text-green-600 transition-all duration-200"
                        onClick={() => {
                          // Handle bulk activate
                          statusChangeConfirm("teacher", true, selectedTeacherIds.length, async () => {
                            try {
                              await bulkUpdateStatusMutation.mutateAsync({
                                ids: selectedTeacherIds,
                                isActive: true
                              });
                              toast({
                                title: "Teachers activated",
                                description: `Successfully activated ${selectedTeacherIds.length} teachers`,
                                variant: "success"
                              });
                            } catch (error) {
                              console.error("Error activating teachers:", error);
                              toast({
                                title: "Error",
                                description: "Failed to activate teachers. Please try again.",
                                variant: "destructive"
                              });
                            }
                          });
                        }}
                      >
                        <UserCheck className="mr-1 h-4 w-4" />
                        Activate Selected
                      </Button>
                    )}
                    {allActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                        onClick={() => {
                          // Handle bulk deactivate
                          statusChangeConfirm("teacher", false, selectedTeacherIds.length, async () => {
                            try {
                              await bulkUpdateStatusMutation.mutateAsync({
                                ids: selectedTeacherIds,
                                isActive: false
                              });
                              toast({
                                title: "Teachers deactivated",
                                description: `Successfully deactivated ${selectedTeacherIds.length} teachers`,
                                variant: "success"
                              });
                            } catch (error) {
                              console.error("Error deactivating teachers:", error);
                              toast({
                                title: "Error",
                                description: "Failed to deactivate teachers. Please try again.",
                                variant: "destructive"
                              });
                            }
                          });
                        }}
                      >
                        <UserX className="mr-1 h-4 w-4" />
                        Deactivate Selected
                      </Button>
                    )}
                    {!allActive && !allInactive && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 hover:border-green-300 hover:text-green-600 transition-all duration-200"
                          onClick={() => {
                            // Handle bulk activate for mixed selection
                            const inactiveIds = selectedTeachers
                              .filter(teacher => teacher.isActive === false)
                              .map(teacher => teacher.id);

                            if (inactiveIds.length === 0) return;

                            statusChangeConfirm("teacher", true, inactiveIds.length, async () => {
                              try {
                                await bulkUpdateStatusMutation.mutateAsync({
                                  ids: inactiveIds,
                                  isActive: true
                                });
                                toast({
                                  title: "Teachers activated",
                                  description: `Successfully activated ${inactiveIds.length} teachers`,
                                  variant: "success"
                                });
                              } catch (error) {
                                console.error("Error activating teachers:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to activate teachers. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            });
                          }}
                        >
                          <UserCheck className="mr-1 h-4 w-4" />
                          Activate Inactive
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                          onClick={() => {
                            // Handle bulk deactivate for mixed selection
                            const activeIds = selectedTeachers
                              .filter(teacher => teacher.isActive === true)
                              .map(teacher => teacher.id);

                            if (activeIds.length === 0) return;

                            statusChangeConfirm("teacher", false, activeIds.length, async () => {
                              try {
                                await bulkUpdateStatusMutation.mutateAsync({
                                  ids: activeIds,
                                  isActive: false
                                });
                                toast({
                                  title: "Teachers deactivated",
                                  description: `Successfully deactivated ${activeIds.length} teachers`,
                                  variant: "success"
                                });
                              } catch (error) {
                                console.error("Error deactivating teachers:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to deactivate teachers. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            });
                          }}
                        >
                          <UserX className="mr-1 h-4 w-4" />
                          Deactivate Active
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 transition-all duration-200"
                  onClick={() => {
                    // Handle bulk delete
                    bulkDeleteConfirm("teacher", selectedTeacherIds.length, async () => {
                      try {
                        await bulkDeleteMutation.mutateAsync({
                          ids: selectedTeacherIds
                        });
                        toast({
                          title: "Teachers deleted",
                          description: `Successfully deleted ${selectedTeacherIds.length} teachers`,
                          variant: "success"
                        });
                      } catch (error) {
                        console.error("Error deleting teachers:", error);
                        toast({
                          title: "Error",
                          description: "Failed to delete teachers. Please try again.",
                          variant: "destructive"
                        });
                      }
                    });
                  }}
                >
                  <Trash className="mr-1 h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Debounce this in a real implementation
                  }}
                  className="border-0 p-0 focus-visible:ring-0"
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
                  variant="ghost"
                  className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-all duration-200"
                  onClick={handleExportCSV}
                >
                  <FileDown className="h-4 w-4" />
                  <span className="font-medium">Export CSV</span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-all duration-200"
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4" />
                  <span className="font-medium">Export PDF</span>
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="w-full table-auto">
            <thead className="bg-gray-50/50 text-left text-sm font-medium text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-2 py-3">
                  <Checkbox
                    checked={selectedTeacherIds.length === filteredTeachers.length && filteredTeachers.length > 0}
                    onCheckedChange={toggleAllTeachers}
                    aria-label="Select all teachers"
                    className="border-gray-300 text-[#00501B] focus:ring-[#00501B]/20"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Qualification</th>
                <th className="px-4 py-3 font-medium">Specialization</th>
                <th className="px-4 py-3 font-medium">Classes</th>
                <th className="px-4 py-3 font-medium">Join Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00501B] border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading teachers...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <p className="text-gray-500">No teachers found</p>
                    <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher: any) => {
                  const isSelected = selectedTeacherIds.includes(teacher.id);
                  const isActive = 'isActive' in teacher ? teacher.isActive : true;
                  const classes = teacher.classes || [];

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-[#00501B]/5' : ''}`}
                    >
                      <td className="px-2 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTeacherSelection(teacher.id)}
                          aria-label={`Select ${teacher.firstName} ${teacher.lastName}`}
                          className="border-gray-300 text-[#00501B] focus:ring-[#00501B]/20"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {teacher.firstName} {teacher.lastName}
                      </td>
                      <td className="px-4 py-3">{teacher.qualification || 'N/A'}</td>
                      <td className="px-4 py-3">{teacher.specialization || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {classes.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-[#00501B]" />
                            <span>{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
                          </div>
                        ) : (
                          'None'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? 'bg-[#00501B]/10 text-[#00501B]' : 'bg-[#A65A20]/10 text-[#A65A20]'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/teachers/${teacher.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </Link>
                          {canEdit && (
                            <Link href={`/teachers/${teacher.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </Link>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 transition-colors ${isActive ? 'text-gray-500 hover:text-[#A65A20] hover:bg-[#A65A20]/5' : 'text-gray-500 hover:text-[#00501B] hover:bg-[#00501B]/5'}`}
                              onClick={() => {
                                statusChangeConfirm("teacher", !isActive, 1, async () => {
                                  try {
                                    await toggleStatusMutation.mutateAsync({
                                      id: teacher.id,
                                      isActive: !isActive,
                                    });
                                    toast({
                                      title: "Status updated",
                                      description: `Teacher has been ${!isActive ? 'activated' : 'deactivated'}.`,
                                      variant: "success"
                                    });
                                  } catch (error) {
                                    console.error("Error toggling teacher status:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to update teacher status. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                });
                              }}
                            >
                              {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              <span className="sr-only">{isActive ? 'Deactivate' : 'Activate'}</span>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-[#A65A20] hover:bg-[#A65A20]/5 transition-colors"
                              onClick={() => handleDeleteTeacher(teacher.id)}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing all {filteredTeachers.length} teachers
          </div>
        </div>
      </div>
    </div>
  );
}
