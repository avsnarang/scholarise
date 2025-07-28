"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, GripVertical, Save } from "lucide-react";
import Link from "next/link";
import { api } from "@/utils/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Define the Class type for ordering
type ClassForOrdering = {
  id: string;
  name: string;
  grade?: string | null;
  isActive: boolean;
  displayOrder?: number;
  _count?: {
    sections: number;
  };
  sectionsCount?: number;
};

// SortableItem component for drag-and-drop
function SortableItem({ id, classData }: { id: string; classData: ClassForOrdering }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const sectionsCount = classData._count?.sections || classData.sectionsCount || 0;
  
  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="flex items-center p-3 rounded-md border border-border dark:border-[#303030] bg-card dark:bg-[#252525] text-card-foreground dark:text-[#e6e6e6] hover:bg-muted/50 dark:hover:bg-[#303030]/50 transition">
        <div 
          className="cursor-grab p-2 rounded-md hover:bg-muted dark:hover:bg-[#303030] mr-2"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground dark:text-[#808080]" />
        </div>
        <div className="flex-1">
          <div className="font-medium">{classData.name}</div>
          <div className="text-sm text-muted-foreground dark:text-[#a0aec0]">
            {classData.grade ? `Grade ${classData.grade} • ` : ""}{sectionsCount} section{sectionsCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={classData.isActive ? "outline" : "secondary"} className={classData.isActive
            ? "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/30 dark:hover:bg-[#7aad8c]/20"
            : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-[#303030] dark:text-[#808080] dark:border-[#404040] dark:hover:bg-[#353535]"}>
            {classData.isActive ? "Active" : "Inactive"}
          </Badge>
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted dark:bg-[#303030] text-sm font-medium">
            {sectionsCount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClassOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSessionId } = useAcademicSessionContext();
  const { currentBranchId } = useBranchContext();
  
  const [classes, setClasses] = useState<ClassForOrdering[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Get classes for the current session and branch (without sections, just count)
  const {
    data: classData,
    isLoading,
    isError,
    error
  } = api.class.getAll.useQuery(
    { 
      sessionId: currentSessionId || undefined,
      branchId: currentBranchId || undefined,
      includeSectionCount: true, // This will include _count: { sections: number }
    },
    { 
      enabled: !!currentSessionId && !!currentBranchId
    }
  );
  
  // Log the data when it arrives
  useEffect(() => {
    if (classData) {
      console.log("API RETURNED DATA:", classData);
      if (classData.length === 0) {
        console.log("No classes found for this session and branch");
      }
    }
  }, [classData]);
  
  // Handle errors from API
  useEffect(() => {
    if (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "Failed to load classes. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Update class order mutation
  const { mutate: updateClassOrder, isPending: isSaving } = api.class.updateOrder.useMutation({
    onSuccess: () => {
      toast({
        title: "Class order updated",
        description: "The class order has been updated successfully.",
        variant: "success"
      });
      setHasChanges(false);
      setOriginalOrder([...classes.map(c => c.id)]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class order. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Initialize classes when data loads
  useEffect(() => {
    if (classData) {
      try {
        // Log raw class data with display orders
        console.log("Original class data with displayOrder values:", 
          classData.map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
            displayOrder: c.displayOrder
          }))
        );
        
        // Map the data with displayOrder safely handled
        const mappedClasses = classData.map(c => {
          // Ensure displayOrder exists and is a number
          let displayOrder = 0;
          try {
            // Try to get display order, falling back to 0 if it doesn't exist or isn't a number
            displayOrder = typeof c.displayOrder === 'number' ? c.displayOrder : 
                           c.displayOrder ? Number(c.displayOrder) : 0;
            
            // If NaN, use 0
            if (isNaN(displayOrder)) displayOrder = 0;
          } catch (e) {
            console.warn("Error parsing displayOrder, using 0:", e);
          }
          
          // Return a complete class object with all necessary fields
          return {
            id: c.id,
            name: c.name,
            grade: c.grade,
            isActive: c.isActive,
            displayOrder,
            _count: c._count,
            sectionsCount: c._count?.sections || 0
          };
        });
        
        console.log("Mapped classes:", mappedClasses);
        
        // Explicitly set displayOrder if it's missing
        if (mappedClasses.every(c => c.displayOrder === 0)) {
          console.log("All classes have displayOrder 0, setting sequential order");
          // Set display order sequentially if all are 0
          mappedClasses.forEach((c, index) => {
            c.displayOrder = index;
          });
        }
        
        // Sort classes by displayOrder first, then by name
        const sortedClasses = [...mappedClasses].sort((a, b) => {
          // First compare by displayOrder
          const orderA = a.displayOrder || 0;
          const orderB = b.displayOrder || 0;
          
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          
          // If displayOrder is the same, compare by name
          return a.name.localeCompare(b.name);
        });
        
        console.log("Sorted classes:", sortedClasses);
        setClasses(sortedClasses);
        setOriginalOrder(sortedClasses.map(c => c.id));
      } catch (err) {
        console.error("Error processing class data:", err);
        // Set empty classes array as fallback
        setClasses([]);
        setOriginalOrder([]);
      }
    }
  }, [classData]);
  
  // Handle drag end event
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      console.log(`Moving class ${active.id} to position of ${over.id}`);
      
      setClasses((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        
        console.log(`Moving from index ${oldIndex} to ${newIndex}`);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update displayOrder values to match new positions
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          displayOrder: index
        }));
        
        console.log("New order:", updatedItems.map(i => `${i.name} (${i.displayOrder})`));
        
        const newOrder = updatedItems.map(c => c.id);
        // Check if order has changed
        const hasChanged = JSON.stringify(newOrder) !== JSON.stringify(originalOrder);
        setHasChanges(hasChanged);
        
        return updatedItems;
      });
    }
  }
  
  // Save the new class order
  const handleSaveOrder = () => {
    try {
      // Create updates with sequential display order values
      const updates = classes.map((classItem, index) => ({
        id: classItem.id,
        displayOrder: index
      }));
      
      console.log("Sending updates to server:", updates);
      
      updateClassOrder({ updates });
    } catch (error) {
      console.error("Error preparing order update:", error);
      toast({
        title: "Error",
        description: "Failed to prepare class order update. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <PageWrapper
        title="Order Classes"
        subtitle="Arrange the display order of classes"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 p-0"
              asChild
            >
              <Link href="/classes">
                <ChevronLeft className="h-4 w-4" />
                Back to Classes
              </Link>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Class Order</CardTitle>
              <CardDescription>Drag and drop classes to change their display order</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }
  
  if (isError) {
    return (
      <PageWrapper
        title="Order Classes"
        subtitle="Arrange the display order of classes"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 p-0"
              asChild
            >
              <Link href="/classes">
                <ChevronLeft className="h-4 w-4" />
                Back to Classes
              </Link>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Classes</CardTitle>
              <CardDescription>
                There was a problem loading the classes. Please try again later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-destructive">
                {error?.message || "Failed to fetch classes data."}
              </div>
              <Button 
                onClick={() => router.refresh()} 
                variant="outline"
                className="w-full mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper
      title="Order Classes"
      subtitle="Arrange the display order of classes"
      action={
        <Button 
          onClick={handleSaveOrder}
          disabled={!hasChanges || isSaving}
          variant="glowing" 
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          Save Order
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 p-0"
            asChild
          >
            <Link href="/classes">
              <ChevronLeft className="h-4 w-4" />
              Back to Classes
            </Link>
          </Button>
        </div>
        
        <Card className="dark:bg-[#252525] dark:border-[#303030]">
          <CardHeader>
            <CardTitle className="dark:text-[#e6e6e6]">Class Order</CardTitle>
            <CardDescription className="dark:text-[#c0c0c0]">
              Drag and drop classes to change their display order. Classes will be displayed in this order throughout the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground dark:text-[#a0aec0]">
                No classes found for the current academic session.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={classes.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {classes.map((classItem) => (
                    <SortableItem 
                      key={classItem.id} 
                      id={classItem.id} 
                      classData={classItem} 
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            
            {hasChanges && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-md dark:bg-amber-900/20 dark:text-amber-200">
                You have unsaved changes to the class order. Click "Save Order" to apply these changes.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 