"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/utils/api";
import { Loader2, Upload, Book, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAIProviderInfo } from "@/utils/ai-service";

// Helper function to get model options for the current provider
function getModelOptionsForCurrentProvider(): { value: string; label: string }[] {
  // Default OpenAI models
  const defaultModels = [
    { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo (Higher quality, more expensive)" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Faster, less expensive)" }
  ];
  
  if (typeof window === 'undefined') {
    return defaultModels;
  }
  
  const currentProvider = localStorage.getItem('ai_provider') || 'openai';
  
  try {
    // In a real implementation, we would use getAIProviderInfo() from the AI service
    // But since that would require special handling for server/client components,
    // we'll use a simpler approach with hardcoded values for this demo
    
    switch (currentProvider) {
      case 'openai':
        return [
          { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo (Higher quality)" },
          { value: "gpt-4o", label: "GPT-4o (Latest model)" },
          { value: "gpt-4", label: "GPT-4 (Original)" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Faster, less expensive)" }
        ];
      case 'gemini':
        return [
          { value: "gemini-pro", label: "Gemini Pro" },
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Latest)" }
        ];
      case 'claude':
        return [
          { value: "claude-3-opus-20240229", label: "Claude 3 Opus (Highest capability)" },
          { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet (Balanced)" },
          { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (Fast)" }
        ];
      default:
        return defaultModels;
    }
  } catch (error) {
    console.error("Error getting model options:", error);
    return defaultModels;
  }
}

// Helper function to get the default model for the current provider
function getDefaultModelForCurrentProvider(): string {
  if (typeof window === 'undefined') {
    return 'gpt-4-turbo-preview';
  }
  
  const currentProvider = localStorage.getItem('ai_provider') || 'openai';
  
  switch (currentProvider) {
    case 'openai':
      return 'gpt-4-turbo-preview';
    case 'gemini':
      return 'gemini-pro';
    case 'claude':
      return 'claude-3-sonnet-20240229';
    default:
      return 'gpt-4-turbo-preview';
  }
}

export default function AIConfigurationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [useBatchProcessing, setUseBatchProcessing] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get data from API
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery();
  const { data: subjects, isLoading: isLoadingSubjects } = api.subject.getByClassId.useQuery(
    { classId: selectedClass },
    { enabled: !!selectedClass }
  );
  const { data: chapters, isLoading: isLoadingChapters } = api.questionPaper.getChaptersBySubject.useQuery(
    { subjectId: selectedSubject },
    { enabled: !!selectedSubject }
  );
  
  // Get processing history
  const { data: processingHistory, isLoading: isLoadingHistory, refetch } = 
    api.questionPaper.getTextbookProcessingHistory.useQuery();
    
  // Process textbook mutation
  const processTextbook = api.questionPaper.adminProcessTextbook.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Textbook queued for processing. Questions will be generated in the background.",
      });
      setFile(null);
      setIsUploading(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Check processing status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (processTextbook.isSuccess && selectedChapter) {
      setProcessingStatus("QUEUED");
      
      // Poll for status updates
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/textbook-processing-status?chapterId=${selectedChapter}`);
          if (response.ok) {
            const data = await response.json();
            if (data.status) {
              setProcessingStatus(data.status);
              
              // Stop polling when processing is complete
              if (data.status === "COMPLETED" || data.status === "FAILED") {
                if (interval) clearInterval(interval);
                
                // Show toast notification
                toast({
                  title: data.status === "COMPLETED" ? "Processing Complete" : "Processing Failed",
                  description: data.status === "COMPLETED" 
                    ? `Successfully generated ${data.questionsGenerated || 0} questions` 
                    : data.errorMessage || "Unknown error occurred",
                  variant: data.status === "COMPLETED" ? "default" : "destructive",
                });
                
                // Reset status after a delay
                setTimeout(() => setProcessingStatus(null), 5000);
              }
            }
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processTextbook.isSuccess, selectedChapter, toast]);

  const handleUpload = async () => {
    if (!file || !selectedClass || !selectedSubject || !selectedChapter) {
      toast({
        title: "Missing information",
        description: "Please select a file, class, subject, and chapter",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "textbooks");
    
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      
      // Get batch settings from localStorage or use defaults
      const batchSize = parseInt(localStorage.getItem('batch_size') || '5');
      const batchConcurrency = parseInt(localStorage.getItem('batch_concurrency') || '3');
      
      processTextbook.mutate({
        fileUrl: data.url,
        fileName: file.name,
        classId: selectedClass,
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        useBatchProcessing: useBatchProcessing,
        batchSize,
        batchConcurrency,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI Configuration</h1>
      
      <Tabs defaultValue="upload">
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload Textbooks</TabsTrigger>
          <TabsTrigger value="history">Processing History</TabsTrigger>
          <TabsTrigger value="settings">AI Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Textbook</CardTitle>
              <CardDescription>
                Upload a textbook to generate AI questions. These questions will be added to the question bank.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={setSelectedClass}
                    disabled={isLoadingClasses}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    disabled={isLoadingSubjects || !selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Select
                    value={selectedChapter}
                    onValueChange={setSelectedChapter}
                    disabled={isLoadingChapters || !selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters?.map((chapter: any) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Textbook PDF</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                    disabled={isUploading}
                  />
                  {file && <p className="text-sm text-muted-foreground mt-1">{file.name}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useBatchProcessing"
                    checked={useBatchProcessing}
                    onChange={(e) => setUseBatchProcessing(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <Label htmlFor="useBatchProcessing" className="text-sm">
                      Use batch processing (recommended)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processes questions in optimized batches to improve efficiency and reduce API costs.
                      This is especially beneficial for generating large numbers of questions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading || !selectedClass || !selectedSubject || !selectedChapter}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload and Generate Questions
                  </>
                )}
              </Button>
              
              {processingStatus && (
                <div className="mt-4 p-3 bg-primary/10 rounded-md">
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <div>
                      <p className="text-sm font-medium">
                        Processing Status: {processingStatus}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {processingStatus === "QUEUED" && "Waiting to start processing..."}
                        {processingStatus === "PROCESSING" && "Generating questions from textbook..."}
                        {processingStatus === "COMPLETED" && "Questions generated successfully!"}
                        {processingStatus === "FAILED" && "Failed to generate questions."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Processing History</CardTitle>
              <CardDescription>
                View the history of textbook processing and question generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : processingHistory && processingHistory.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Textbook</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Questions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {processingHistory.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.fileName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" :
                              item.status === "PROCESSING" ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100" :
                              item.status === "FAILED" ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100" :
                              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.questionsGenerated || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.batchProcessingUsed ? 
                              `${item.batchSize || 5} / ${item.batchConcurrency || 3}` : 
                              "No"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.processingDuration ? 
                              `${Math.floor(item.processingDuration / 60)}m ${item.processingDuration % 60}s` : 
                              "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Book className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No processing history yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload a textbook to generate AI questions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure AI question generation settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const provider = formData.get('provider') as string;
                    const model = formData.get('model') as string;
                    const easyCount = parseInt(formData.get('easyCount') as string);
                    const mediumCount = parseInt(formData.get('mediumCount') as string);
                    const hotsCount = parseInt(formData.get('hotsCount') as string);
                    const batchSize = parseInt(formData.get('batchSize') as string);
                    const batchConcurrency = parseInt(formData.get('batchConcurrency') as string);
                    
                    // Save settings to localStorage
                    localStorage.setItem('ai_provider', provider);
                    localStorage.setItem('ai_model', model);
                    localStorage.setItem('batch_size', batchSize.toString());
                    localStorage.setItem('batch_concurrency', batchConcurrency.toString());
                    localStorage.setItem('question_counts', JSON.stringify({
                      easy: easyCount,
                      medium: mediumCount,
                      hots: hotsCount
                    }));
                    
                    toast({
                      title: "Settings saved",
                      description: "Your AI settings have been saved successfully.",
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select 
                      name="provider"
                      defaultValue={typeof window !== 'undefined' ? localStorage.getItem('ai_provider') || 'openai' : 'openai'}
                      onValueChange={(value) => {
                        // When provider changes, we need to update the model options
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('ai_provider', value);
                          // We could trigger a re-render here to update models dropdown
                          window.location.reload();
                        }
                      }}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Select an AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                        <SelectItem value="gemini">Google (Gemini)</SelectItem>
                        <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select 
                      name="model"
                      defaultValue={typeof window !== 'undefined' ? localStorage.getItem('ai_model') || getDefaultModelForCurrentProvider() : 'gpt-4-turbo-preview'}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelOptionsForCurrentProvider().map(model => (
                          <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      The API keys for all providers are configured via environment variables and managed by administrators.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="questionCount">Questions per Difficulty</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="easyCount" className="text-xs">Easy</Label>
                        <Input 
                          id="easyCount" 
                          name="easyCount" 
                          type="number" 
                          defaultValue={typeof window !== 'undefined' ? 
                            JSON.parse(localStorage.getItem('question_counts') || '{"easy":20}').easy : 20} 
                          min="5" 
                          max="50" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediumCount" className="text-xs">Medium</Label>
                        <Input 
                          id="mediumCount" 
                          name="mediumCount" 
                          type="number" 
                          defaultValue={typeof window !== 'undefined' ? 
                            JSON.parse(localStorage.getItem('question_counts') || '{"medium":20}').medium : 20} 
                          min="5" 
                          max="50" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="hotsCount" className="text-xs">HOTS</Label>
                        <Input 
                          id="hotsCount" 
                          name="hotsCount" 
                          type="number" 
                          defaultValue={typeof window !== 'undefined' ? 
                            JSON.parse(localStorage.getItem('question_counts') || '{"hots":10}').hots : 10} 
                          min="5" 
                          max="30" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="batchSettings" className="flex items-center justify-between">
                      Batch Processing Settings
                      <span className="text-xs font-normal text-muted-foreground">Advanced</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="batchSize" className="text-xs">Questions per Batch</Label>
                        <Input 
                          id="batchSize" 
                          name="batchSize" 
                          type="number" 
                          defaultValue={typeof window !== 'undefined' ? 
                            localStorage.getItem('batch_size') || '5' : '5'} 
                          min="1" 
                          max="10" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 5-10 for efficiency
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="batchConcurrency" className="text-xs">Concurrent Batches</Label>
                        <Input 
                          id="batchConcurrency" 
                          name="batchConcurrency" 
                          type="number" 
                          defaultValue={typeof window !== 'undefined' ? 
                            localStorage.getItem('batch_concurrency') || '3' : '3'} 
                          min="1" 
                          max="5" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Higher may be faster but costs more
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">Save Settings</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 