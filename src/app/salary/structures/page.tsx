"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface SalaryStructure {
  id: string;
  name: string;
  description: string | null;
  basicSalary: number;
  daPercentage: number;
  pfPercentage: number;
  esiPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function SalaryStructuresPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch all salary structures
  const { data: structures, isLoading, refetch } = api.salary.getSalaryStructures.useQuery<SalaryStructure[]>();

  // Update salary structure mutation
  const updateSalaryStructure = api.salary.updateSalaryStructure.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary structure updated successfully",
      });
      void refetch();
      setIsUpdating(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary structure",
        variant: "destructive",
      });
      setIsUpdating(null);
    },
  });

  // Handle toggle active status
  const handleToggleActive = (id: string, isActive: boolean) => {
    setIsUpdating(id);
    // Find the structure
    const structure = structures?.find((s: {id: string}) => s.id === id);
    if (!structure) return;

    // Update with all fields
    updateSalaryStructure.mutate({
      id,
      name: structure.name,
      description: structure.description || "",
      basicSalary: structure.basicSalary,
      daPercentage: structure.daPercentage,
      pfPercentage: structure.pfPercentage,
      esiPercentage: structure.esiPercentage,
      isActive: !isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Salary Structures</h1>
        <Button
          onClick={() => router.push("/salary/structures/new")}
        >
          Create New Structure
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Salary Structures</CardTitle>
          <CardDescription>
            View and manage all salary structure templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {structures && structures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>DA %</TableHead>
                  <TableHead>PF %</TableHead>
                  <TableHead>ESI %</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((structure: {
                  id: string;
                  name: string;
                  basicSalary: number;
                  daPercentage: number;
                  pfPercentage: number;
                  esiPercentage: number;
                  isActive: boolean;
                }) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-medium">{structure.name}</TableCell>
                    <TableCell>₹{structure.basicSalary.toLocaleString()}</TableCell>
                    <TableCell>{structure.daPercentage}%</TableCell>
                    <TableCell>{structure.pfPercentage}%</TableCell>
                    <TableCell>{structure.esiPercentage}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={structure.isActive}
                        disabled={isUpdating === structure.id}
                        onCheckedChange={() => handleToggleActive(structure.id, structure.isActive)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/salary/structures/edit/${structure.id}`)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="mb-4 text-center text-gray-500">
                No salary structures found. Create your first salary structure to get started.
              </p>
              <Button
                onClick={() => router.push("/salary/structures/new")}
              >
                Create New Structure
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 