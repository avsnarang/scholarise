"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  MoreHorizontal,
  PencilIcon,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { MoneyCollectionWithRelations } from "@/types/money-collection";

interface MoneyCollectionTableProps {
  initialMoneyCollections: MoneyCollectionWithRelations[];
}

export function MoneyCollectionTable({
  initialMoneyCollections,
}: MoneyCollectionTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Use the initial data directly without maintaining our own state
  const moneyCollections = initialMoneyCollections;

  // Delete function using direct fetch API instead of TRPC
  const deleteCollection = async (id: string) => {
    setIsDeleting(true);
    
    try {
      // Call our custom API endpoint
      const response = await fetch("/api/money-collection/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete collection");
      }
      
      // Show success message
      toast({
        title: "Success",
        description: "The collection has been deleted successfully.",
      });
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      
      // Hard refresh the page
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the collection",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedId) {
      deleteCollection(selectedId);
    }
  };

  // Get status badge based on collection data
  const getStatusBadge = (collection: MoneyCollectionWithRelations) => {
    const hasItems = collection.items.length > 0;
    const isRecent = new Date(collection.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Within last 7 days
    
    if (!hasItems) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">No Payments</Badge>;
    } else if (isRecent) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
    }
  };

  if (moneyCollections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium mb-1">No Collections Found</p>
          <p className="text-sm text-muted-foreground mb-4">No money collections are available.</p>
          <Button asChild>
            <Link href="/money-collection/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Collection
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Collection Details</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moneyCollections.map((collection) => {
              // Calculate total collection amount
              const totalAmount = collection.items
                .reduce((sum: number, item) => sum + item.amount, 0);
              
              return (
                <TableRow key={collection.id} className="group hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 mt-1 border">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {collection.title.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          <Link 
                            href={`/money-collection/${collection.id}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {collection.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{format(new Date(collection.collectionDate), "PPP")}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {collection.classes && collection.classes.length > 0 ? (
                      <div className="relative inline-block">
                        <HoverCard openDelay={100} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-sm font-normal text-blue-600 hover:text-blue-800 hover:no-underline flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {collection.classes.length} {collection.classes.length === 1 ? 'Class' : 'Classes'}
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            className="w-48 p-0 shadow-sm" 
                            side="right"
                            align="start" 
                            sideOffset={300}
                            alignOffset={-60}
                          >
                            <div className="text-xs text-muted-foreground p-2 border-b">
                              {collection.classes.length} {collection.classes.length === 1 ? 'class' : 'classes'}
                            </div>
                            <div className="p-1 max-h-[180px] overflow-y-auto">
                              {collection.classes.map((classItem) => (
                                <div key={classItem.id} className="px-2 py-1.5 text-sm hover:bg-slate-50">
                                  {classItem.class.name} <span className="text-muted-foreground">{classItem.class.section}</span>
                                </div>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">All Classes</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(collection)}
                      <span className="text-xs text-muted-foreground mt-1">
                        {collection.items.length} payment{collection.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">₹{totalAmount.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/money-collection/${collection.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/money-collection/${collection.id}/edit`}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(collection.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the money collection and all its
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 