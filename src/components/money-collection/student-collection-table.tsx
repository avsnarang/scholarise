"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  rollNumber?: string | null;
  class?: {
    name: string;
    section: string;
  };
}

interface StudentCollectionTableProps {
  students: Student[];
  collectionId: string;
  existingItems: any[];
}

export function StudentCollectionTable({
  students,
  collectionId,
  existingItems,
}: StudentCollectionTableProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Initialize amounts state from existing items
  const initialAmounts: Record<string, { amount: number; itemId?: string }> = {};
  existingItems.forEach((item) => {
    initialAmounts[item.studentId] = {
      amount: item.amount,
      itemId: item.id,
    };
  });

  const [amounts, setAmounts] = useState<Record<string, { amount: number; itemId?: string; isEditing?: boolean }>>(initialAmounts);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { mutate: addItem } = api.moneyCollection.addItem.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Payment recorded successfully.",
      });
      utils.moneyCollection.getById.invalidate({ id: collectionId });
      setSaving((prev) => ({ ...prev, [variables.studentId]: false }));
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSaving((prev) => ({ ...prev, [variables.studentId]: false }));
    },
  });

  const { mutate: updateItem } = api.moneyCollection.updateItem.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Payment updated successfully.",
      });
      utils.moneyCollection.getById.invalidate({ id: collectionId });
      setSaving((prev) => ({ ...prev, [variables.data.studentId!]: false }));
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSaving((prev) => ({ ...prev, [variables.data.studentId!]: false }));
    },
  });

  const handleAmountChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAmounts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        amount: numValue,
        isEditing: true,
      },
    }));
  };

  const handleSave = (studentId: string) => {
    const studentAmount = amounts[studentId];
    
    if (!studentAmount) return;
    
    setSaving((prev) => ({ ...prev, [studentId]: true }));
    
    // If itemId exists, it's an update, otherwise it's a new item
    if (studentAmount.itemId) {
      updateItem({
        id: studentAmount.itemId,
        data: {
          amount: studentAmount.amount,
          studentId: studentId,
          moneyCollectionId: collectionId,
        },
      });
    } else {
      addItem({
        studentId: studentId,
        amount: studentAmount.amount,
        moneyCollectionId: collectionId,
      });
    }

    // Clear editing state
    setAmounts((prev) => {
      const existingRecord = prev[studentId] || { amount: 0 };
      return {
        ...prev,
        [studentId]: {
          ...existingRecord,
          isEditing: false,
        },
      };
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Student Collection</CardTitle>
        <CardDescription>
          Enter the amount received from each student
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class & Section</TableHead>
                <TableHead>Money Received (₹)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No students found for the selected class.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const studentAmount = amounts[student.id] || { amount: 0 };
                  const isSaving = saving[student.id] || false;
                  const hasChanges = studentAmount.isEditing;

                  return (
                    <TableRow key={student.id}>
                      <TableCell>{student.rollNumber || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                        <div className="text-muted-foreground text-xs">
                          {student.admissionNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.class ? `${student.class.name} ${student.class.section}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={studentAmount.amount || ""}
                          onChange={(e) => handleAmountChange(student.id, e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSave(student.id)}
                          disabled={isSaving || !hasChanges}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : studentAmount.itemId ? (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Update
                            </>
                          ) : (
                            <>
                              <CheckIcon className="mr-2 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 