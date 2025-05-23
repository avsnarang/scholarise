"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Trash2,
  ArrowLeft,
  UserCheck,
  ListChecks,
  ClipboardList
} from "lucide-react";
import { ApplicationStatus } from "@/server/api/routers/admission";

// Define types for map functions
interface MapLeadType {
  id: string;
  firstName: string | null;
  lastName: string | null;
  // Add other fields if used from lead, to be safe
}

interface MapStaffType {
  id: string;
  name: string;
  // Add other fields if used from staff, to be safe
}

const applicationSchema = z.object({
  leadId: z.string({
    required_error: "Lead is required",
  }),
  applicationNumber: z.string().min(1, "Application number is required"),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus),
});

const stageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  description: z.string().optional(),
  sequence: z.number(),
});

const requirementSchema = z.object({
  name: z.string().min(1, "Requirement name is required"),
  description: z.string().optional(),
  isRequired: z.boolean().default(true),
});

export default function NewApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBranchId } = useBranchContext();
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | null>(null);
  const [stages, setStages] = useState<z.infer<typeof stageSchema>[]>([
    { name: "Document Verification", description: "Verify submitted documents", sequence: 1 },
    { name: "Academic Assessment", description: "Complete academic assessment", sequence: 2 },
    { name: "Interview", description: "Parent and student interview", sequence: 3 },
    { name: "Final Decision", description: "Review and make final decision", sequence: 4 },
  ]);
  
  const [requirements, setRequirements] = useState<z.infer<typeof requirementSchema>[]>([
    { name: "Birth Certificate", description: "Copy of birth certificate", isRequired: true },
    { name: "Previous School Records", description: "Transcripts from previous school", isRequired: true },
    { name: "ID Proof", description: "Government issued ID proof", isRequired: true },
    { name: "Passport Photos", description: "Recent passport size photographs", isRequired: true },
  ]);

  // Fetch leads for dropdown
  const { data: leads, isLoading: isLoadingLeads } = api.admission.getLeads.useQuery(
    {
      branchId: currentBranchId!,
      limit: 100,
    },
    {
      enabled: !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );
  
  // Fetch staff members for assignment dropdown
  const { data: staffMembers, isLoading: isLoadingStaff } = api.admission.getStaffMembers.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );
  
  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      applicationNumber: `APP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      status: ApplicationStatus.SUBMITTED,
    },
  });
  
  useEffect(() => {
    const leadId = searchParams?.get("leadId");
    if (leadId) {
      setPreselectedLeadId(leadId);
      form.setValue("leadId", leadId);
    }
  }, [searchParams, form]);
  
  const createApplicationMutation = api.admission.createApplication.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application created successfully",
      });
      router.push("/admissions/applications");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });
  
  const handleAddStage = () => {
    setStages([
      ...stages,
      {
        name: "",
        description: "",
        sequence: stages.length + 1,
      },
    ]);
  };
  
  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
    // Update sequences
    setStages(prev => 
      prev.map((stage, i) => ({
        ...stage,
        sequence: i + 1,
      }))
    );
  };
  
  const handleStageChange = (index: number, field: keyof z.infer<typeof stageSchema>, value: string | number) => {
    setStages(stages.map((stage, i) => 
      i === index ? { ...stage, [field]: value } : stage
    ));
  };
  
  const handleAddRequirement = () => {
    setRequirements([
      ...requirements,
      {
        name: "",
        description: "",
        isRequired: true,
      },
    ]);
  };
  
  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };
  
  const handleRequirementChange = (index: number, field: keyof z.infer<typeof requirementSchema>, value: string | boolean) => {
    setRequirements(requirements.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ));
  };
  
  const onSubmit = (data: z.infer<typeof applicationSchema>) => {
    if (!currentBranchId) {
      toast({
        title: "Error",
        description: "Branch not selected",
        variant: "destructive",
      });
      return;
    }
    
    // Filter out empty stages and requirements
    const validStages = stages.filter(stage => stage.name.trim() !== "");
    const validRequirements = requirements.filter(req => req.name.trim() !== "");
    
    createApplicationMutation.mutate({
      ...data,
      status: data.status,
      stages: validStages.map(s => ({...s, sequence: Number(s.sequence)})),
      requirements: validRequirements.map(r => ({...r, isRequired: Boolean(r.isRequired)})),
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">New Application</h2>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="h-5 w-5 mr-2" />
              Application Details
            </CardTitle>
            <CardDescription>
              Basic information about the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!preselectedLeadId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select applicant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leads?.items.map((lead: MapLeadType) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.firstName} {lead.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="applicationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application # *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers?.map((staff: MapStaffType) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ApplicationStatus.SUBMITTED}>Submitted</SelectItem>
                        <SelectItem value={ApplicationStatus.IN_REVIEW}>In Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this application"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <ListChecks className="h-5 w-5 mr-2" />
                Application Stages
              </div>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleAddStage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </CardTitle>
            <CardDescription>
              Define the stages this application will go through
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stages.map((stage, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                <div className="col-span-1 flex justify-center items-center h-10 bg-muted rounded-md">
                  {stage.sequence}
                </div>
                <div className="col-span-4">
                  <FormItem>
                    <FormLabel>Stage Name</FormLabel>
                    <Input
                      value={stage.name}
                      onChange={(e) => handleStageChange(index, "name", e.target.value)}
                      placeholder="Stage name"
                    />
                  </FormItem>
                </div>
                <div className="col-span-6">
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={stage.description || ""}
                      onChange={(e) => handleStageChange(index, "description", e.target.value)}
                      placeholder="Stage description"
                    />
                  </FormItem>
                </div>
                <div className="col-span-1 pt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStage(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {stages.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No stages defined. Add at least one stage to track application progress.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Requirements
              </div>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleAddRequirement}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Requirement
              </Button>
            </CardTitle>
            <CardDescription>
              Specify documents and requirements needed for this application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requirements.map((requirement, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                <div className="col-span-4">
                  <FormItem>
                    <FormLabel>Requirement</FormLabel>
                    <Input
                      value={requirement.name}
                      onChange={(e) => handleRequirementChange(index, "name", e.target.value)}
                      placeholder="Requirement name"
                    />
                  </FormItem>
                </div>
                <div className="col-span-6">
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={requirement.description || ""}
                      onChange={(e) => handleRequirementChange(index, "description", e.target.value)}
                      placeholder="Requirement description"
                    />
                  </FormItem>
                </div>
                <div className="col-span-1 pt-8">
                  <Select
                    value={requirement.isRequired ? "true" : "false"}
                    onValueChange={(value) => handleRequirementChange(index, "isRequired", value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Required</SelectItem>
                      <SelectItem value="false">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 pt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRequirement(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {requirements.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No requirements defined. Add requirements to track documents needed.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardFooter className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createApplicationMutation.isPending}>
              {createApplicationMutation.isPending ? "Creating..." : "Create Application"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 