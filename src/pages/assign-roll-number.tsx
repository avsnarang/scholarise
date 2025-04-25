import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/layout";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowUpDown, Save, RefreshCw } from "lucide-react";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useGlobalSessionFilter } from "@/hooks/useGlobalSessionFilter";

// Define the form schema
const formSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  sortBy: z.enum(["firstName", "admissionNumber", "custom"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function AssignRollNumberPage() {
  const { toast } = useToast();
  const { branchId } = useGlobalBranchFilter();
  const { sessionId } = useGlobalSessionFilter();

  // Define a type for students with rollNumber
  type StudentWithRollNumber = {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    rollNumber?: string;
    [key: string]: any;
  };

  const [students, setStudents] = useState<StudentWithRollNumber[]>([]);
  const [rollNumbers, setRollNumbers] = useState<Record<string, string>>({});
  const [isAssigning, setIsAssigning] = useState(false);

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: "",
      sortBy: "firstName",
    },
  });

  // Get classes for the current branch and session
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery(
    {
      branchId: branchId || undefined,
      sessionId: sessionId || undefined,
      isActive: true
    },
    { enabled: !!branchId && !!sessionId }
  );

  // Get students for the selected class
  const { data: classStudents, isLoading: isLoadingStudents, refetch: refetchStudents } =
    api.class.getStudents.useQuery(
      { classId: form.watch("classId") || "" },
      { enabled: !!form.watch("classId") }
    );

  // Mutation for updating student roll numbers
  const updateRollNumberMutation = api.student.updateRollNumber.useMutation({
    onSuccess: () => {
      toast({
        title: "Roll numbers assigned",
        description: "Roll numbers have been successfully assigned to students.",
        variant: "success",
      });
      void refetchStudents();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign roll numbers. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update students when class students data changes
  useEffect(() => {
    if (classStudents) {
      // Cast the students to our type that includes rollNumber
      const studentsWithRollNumber = classStudents.map(student => ({
        ...student,
        rollNumber: (student as any).rollNumber || ""
      })) as StudentWithRollNumber[];

      setStudents(studentsWithRollNumber);

      // Initialize roll numbers from existing values
      const initialRollNumbers: Record<string, string> = {};
      studentsWithRollNumber.forEach(student => {
        initialRollNumbers[student.id] = student.rollNumber || "";
      });
      setRollNumbers(initialRollNumbers);
    }
  }, [classStudents]);

  // Handle sort method change
  const handleSortMethodChange = (sortBy: string) => {
    if (!students.length) return;

    let sortedStudents = [...students];

    if (sortBy === "firstName") {
      // Sort by first name, then last name
      sortedStudents.sort((a, b) => {
        const nameA = a.firstName.toLowerCase();
        const nameB = b.firstName.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase());
      });
    } else if (sortBy === "admissionNumber") {
      // Sort by admission number
      sortedStudents.sort((a, b) => {
        const numA = parseInt(a.admissionNumber.replace(/\D/g, ''));
        const numB = parseInt(b.admissionNumber.replace(/\D/g, ''));
        return numA - numB;
      });
    }
    // For "custom", we don't sort - keep the current order

    // If not custom, auto-assign roll numbers
    if (sortBy !== "custom") {
      const newRollNumbers: Record<string, string> = {};
      sortedStudents.forEach((student, index) => {
        newRollNumbers[student.id] = (index + 1).toString();
      });
      setRollNumbers(newRollNumbers);
    }

    setStudents(sortedStudents);
  };

  // Handle roll number change for a specific student
  const handleRollNumberChange = (studentId: string, value: string) => {
    setRollNumbers(prev => ({
      ...prev,
      [studentId]: value,
    }));
  };

  // Handle form submission
  const onSubmit = async () => {
    setIsAssigning(true);

    try {
      // Prepare data for the mutation
      const updates = Object.entries(rollNumbers).map(([studentId, rollNumber]) => ({
        id: studentId,
        rollNumber,
      }));

      // Call the mutation
      await updateRollNumberMutation.mutateAsync({ students: updates });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Assign Roll Numbers</h1>

        <Card>
          <CardHeader>
            <CardTitle>Roll Number Assignment</CardTitle>
            <CardDescription>
              Select a class and section, then assign roll numbers to students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form form={form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Class Selection */}
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class & Section</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset roll numbers when class changes
                            setRollNumbers({});
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingClasses ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                              </div>
                            ) : classes?.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No classes found
                              </div>
                            ) : (
                              classes?.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name} - {cls.section}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sort Method */}
                  <FormField
                    control={form.control}
                    name="sortBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Method</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value: "firstName" | "admissionNumber" | "custom") => {
                            field.onChange(value);
                            handleSortMethodChange(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sort method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="firstName">Alphabetical (First Name)</SelectItem>
                            <SelectItem value="admissionNumber">Admission Number</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Student List */}
                {form.watch("classId") && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Students</h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void refetchStudents()}
                          disabled={isLoadingStudents}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button
                          type="button"
                          onClick={onSubmit}
                          disabled={isAssigning || isLoadingStudents || students.length === 0}
                        >
                          {isAssigning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Roll Numbers
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {isLoadingStudents ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center p-8 border rounded-md bg-gray-50">
                        <p className="text-gray-500">No students found in this class.</p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">S.No</TableHead>
                              <TableHead>
                                <div className="flex items-center">
                                  <span>Name</span>
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead>Admission Number</TableHead>
                              <TableHead className="w-[150px]">Roll Number</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student, index) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>
                                  {student.firstName} {student.lastName}
                                </TableCell>
                                <TableCell>{student.admissionNumber}</TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={rollNumbers[student.id] || ""}
                                    onChange={(e) => handleRollNumberChange(student.id, e.target.value)}
                                    className="w-20"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
