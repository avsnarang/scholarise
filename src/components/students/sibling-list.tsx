import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { Loader2, Trash2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SiblingListProps {
  studentId: string;
  onRefresh: () => void;
}

export function SiblingList({ studentId, onRefresh }: SiblingListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  
  const { data: siblings, isLoading } = api.student.getSiblings.useQuery(
    { studentId },
    { refetchOnWindowFocus: false }
  );
  
  const removeSiblingMutation = api.student.removeSibling.useMutation({
    onSuccess: () => {
      onRefresh();
    }
  });
  
  const handleDeleteClick = (relationshipId: string) => {
    setSelectedRelationship(relationshipId);
    setDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (selectedRelationship) {
      removeSiblingMutation.mutate({ relationshipId: selectedRelationship });
    }
    setDeleteDialogOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }
  
  if (!siblings || siblings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-[#303030] p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">No siblings found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#c0c0c0]">This student doesn't have any siblings registered in the system.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {siblings.map((sibling: any) => (
          <div 
            key={sibling.relationshipId} 
            className="flex items-start justify-between rounded-lg border border-gray-200 dark:border-[#303030] p-4 shadow-sm dark:bg-[#252525]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/10 text-sm font-bold uppercase text-[#00501B] dark:text-[#7aad8c]">
                {sibling.firstName?.[0]}{sibling.lastName?.[0]}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-[#e6e6e6]">{sibling.firstName} {sibling.lastName}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#c0c0c0]">
                  <span>{sibling.admissionNumber}</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>
                    {sibling.className || 'No Class'} 
                    {sibling.classSection ? ` - ${sibling.classSection}` : ''}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`inline-flex h-2 w-2 rounded-full ${sibling.isActive ? 'bg-green-500 dark:bg-[#7aad8c]' : 'bg-red-500 dark:bg-red-600'}`}></span>
                  <span className="text-xs text-gray-500 dark:text-[#c0c0c0] capitalize">
                    {sibling.relationshipType}
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              onClick={() => handleDeleteClick(sibling.relationshipId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="dark:bg-[#252525] dark:border-[#303030]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#e6e6e6]">Remove Sibling Relationship</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#c0c0c0]">
              Are you sure you want to remove this sibling relationship? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#303030] dark:text-[#e6e6e6] dark:border-[#404040] dark:hover:bg-[#353535]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600/80 dark:hover:bg-red-600 dark:text-white"
            >
              {removeSiblingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
