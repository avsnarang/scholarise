"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  code: z.string().min(1, "Board code is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface BoardFormProps {
  boardId?: string;
}

export function BoardForm({ boardId }: BoardFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!boardId;

  // Fetch board data when editing
  const { data: boardData, isLoading: isLoadingBoard } = api.questionPaper.getBoardById.useQuery(
    { id: boardId! },
    { enabled: isEditing }
  );

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
    },
  });

  // Create a new board
  const createBoard = api.questionPaper.createBoard.useMutation({
    onSuccess: () => {
      toast({
        title: "Board Created",
        description: "The education board has been created successfully.",
      });
      router.push("/settings/boards");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create board. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update an existing board
  const updateBoard = api.questionPaper.updateBoard.useMutation({
    onSuccess: () => {
      toast({
        title: "Board Updated",
        description: "The education board has been updated successfully.",
      });
      router.push("/settings/boards");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update board. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditing && boardData) {
      form.reset({
        name: boardData.name,
        code: boardData.code,
        description: boardData.description || "",
        isActive: boardData.isActive,
      });
    }
  }, [isEditing, boardData, form]);

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && boardId) {
        await updateBoard.mutateAsync({
          id: boardId,
          ...data,
        });
      } else {
        await createBoard.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isEditing && isLoadingBoard) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
        <span className="ml-2">Loading board data...</span>
      </div>
    );
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Board Name *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter board name (e.g. CBSE, ICSE)" />
            </FormControl>
            <FormDescription>
              The full name of the education board
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Board Code *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter board code (e.g. CBSE, ICSE)" />
            </FormControl>
            <FormDescription>
              A unique code for the education board
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Enter a brief description of the education board"
                className="resize-none min-h-[100px]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Active Status</FormLabel>
              <FormDescription>
                Inactive boards won't appear in dropdown menus
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/settings/boards")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#00501B] hover:bg-[#00501B]/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEditing ? "Update Board" : "Create Board"}</>
          )}
        </Button>
      </div>
    </Form>
  );
} 