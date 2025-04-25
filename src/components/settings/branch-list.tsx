import { useState } from "react";
import {
  PlusCircle,
  Search,
  Edit,
  Trash,
  Building,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";
import { BranchFormModal } from "./branch-form-modal";
import { useToast } from "@/components/ui/use-toast";
import { useCustomAlert, useDeleteConfirm } from "@/utils/popup-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BranchFormValues {
  id?: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the Branch type to fix the type error
type Branch = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function BranchList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<BranchFormValues | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const customAlert = useCustomAlert();

  // Real API call
  const { data: branches, isLoading } = api.branch.getAll.useQuery();

  // Filter branches based on search query
  const filteredBranches = branches?.filter((branch: Branch) => {
    const query = searchQuery.toLowerCase();
    return (
      branch.name.toLowerCase().includes(query) ||
      branch.code.toLowerCase().includes(query) ||
      branch.city?.toLowerCase().includes(query) ||
      branch.email?.toLowerCase().includes(query)
    );
  }) || [];

  const handleOpenModal = (branch?: BranchFormValues) => {
    console.log("Opening modal with branch data:", branch);
    setCurrentBranch(branch || null);
    setIsModalOpen(true);
  };

  const utils = api.useContext();

  const deleteBranch = api.branch.delete.useMutation({
    onSuccess: () => {
      // Refetch branches after deletion
      void utils.branch.getAll.invalidate();
      toast({
        title: "Branch deleted",
        description: "The branch has been deleted successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error deleting branch:", error);
      setErrorMessage(error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to delete branch. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async (id: string) => {
    // Clear any previous error messages
    setErrorMessage(null);

    deleteConfirm("branch", async () => {
      try {
        await deleteBranch.mutateAsync({ id });
      } catch (error) {
        console.error("Error deleting branch:", error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Error message display */}
      {errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{errorMessage}</p>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-100"
                  onClick={() => setErrorMessage(null)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#00501B]">Branches</h2>
          <p className="text-gray-500">Manage all school branches and campuses</p>
        </div>
        <div>
          <Button
            className="flex items-center gap-1 bg-[#00501B] hover:bg-[#00501B]/90 text-white"
            onClick={() => handleOpenModal()}
          >
            <PlusCircle className="h-4 w-4 text-white" />
            <span>Add Branch</span>
          </Button>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 p-0 focus-visible:ring-0"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table className="w-full table-auto">
              <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">
                      No branches found
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch: Branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#00501B]">{branch.name}</div>
                        <div className="text-xs text-gray-500">ID: {branch.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-gray-50 font-mono text-xs">
                          {branch.code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                          <span>{branch.city || 'N/A'}{branch.city && branch.state ? ', ' : ''}{branch.state || ''}</span>
                        </div>
                        {branch.country && (
                          <div className="text-xs text-gray-500">{branch.country}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {branch.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="mr-1 h-3 w-3 text-gray-400" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="mr-1 h-3 w-3 text-gray-400" />
                            <span>{branch.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-[#00501B]/10 hover:text-[#00501B]"
                            onClick={() => {
                              // Create a clean copy of the branch data
                              const branchData: BranchFormValues = {
                                id: branch.id,
                                name: branch.name,
                                code: branch.code,
                                address: branch.address,
                                city: branch.city,
                                state: branch.state,
                                country: branch.country,
                                phone: branch.phone,
                                email: branch.email,
                              };
                              handleOpenModal(branchData);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDelete(branch.id)}
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-gray-500">
              Showing {filteredBranches.length} of {branches?.length || 0} branches
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Form Modal */}
      <BranchFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branch={currentBranch || undefined}
      />
    </div>
  );
}
