import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

// Define the Branch interface with the order property
interface Branch {
  id: string;
  name: string;
  code: string;
  order: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function BranchOrder() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get branches from API
  const { data: branchesData, isLoading } = api.branch.getAll.useQuery();
  const utils = api.useContext();
  
  // Update order mutation
  const updateOrderMutation = api.branch.updateOrder.useMutation({
    onSuccess: () => {
      toast({
        title: "Branch order updated",
        description: "The branch order has been updated successfully.",
        variant: "success",
      });
      setHasChanges(false);
      void utils.branch.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branch order. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Initialize branches state when data is loaded
  useEffect(() => {
    if (branchesData) {
      setBranches(branchesData.map((branch: Branch, index: number) => ({
        ...branch,
        order: (branch as any).order ?? index,
      })));
    }
  }, [branchesData]);
  
  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(branches);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem!);
    
    // Update order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));
    
    setBranches(updatedItems);
    setHasChanges(true);
  };
  
  // Save order changes
  const saveOrder = async () => {
    try {
      await updateOrderMutation.mutateAsync(
        branches.map((branch) => ({
          id: branch.id,
          order: branch.order,
        }))
      );
    } catch (error) {
      console.error("Error saving branch order:", error);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Loading branches...</div>;
  }
  
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-[#00501B]">
            Branch Display Order
          </CardTitle>
          <Button
            onClick={saveOrder}
            disabled={!hasChanges || updateOrderMutation.isPending}
            className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Order
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Drag and drop branches to set their display order across the application.
        </p>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="branches">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {branches.map((branch, index) => (
                  <Draggable key={branch.id} draggableId={branch.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium">{branch.name}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {branch.code}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">
                            Position: {index + 1}
                          </div>
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
