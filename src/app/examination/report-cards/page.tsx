"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Download, 
  Users, 
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  FileDown,
  Settings,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";
import { useTerms } from "@/hooks/useTerms";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { ReportCardPDFGenerator } from "@/components/examination/ReportCardPDFGenerator";
import { StudentSelector } from "@/components/examination/StudentSelector";
import { ClassSectionSelector } from "@/components/examination/ClassSectionSelector";

export default function ReportCardsPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_EXAMINATIONS]}>
      <PageWrapper>
        <ReportCardsContent />
      </PageWrapper>
    </RouteGuard>
  );
}

function ReportCardsContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [activeTab, setActiveTab] = useState("class-wise");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Fetch available classes
  const { data: classes = [], isLoading: classesLoading } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true,
      includeSections: true
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  // Fetch available terms using the useTerms hook
  const { terms } = useTerms(currentSessionId || undefined);

  // Fetch students for selected class/section
  const { data: studentsInClass = [], isLoading: studentsLoading } = api.student.getByClassAndSection.useQuery(
    {
      classId: selectedClassId || "",
      sectionId: selectedSectionId && selectedSectionId !== "all" ? selectedSectionId : undefined,
      branchId: currentBranchId || "",
      sessionId: currentSessionId || undefined,
    },
    { enabled: !!selectedClassId && !!currentBranchId && !!currentSessionId }
  );

  // Get sections for selected class
  const selectedClass = classes.find(cls => cls.id === selectedClassId);
  const sectionsInClass = selectedClass?.sections || [];

  const handleGenerateReportCards = async () => {
    if (!selectedClassId || selectedTerms.length === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Implementation will be in the PDF generator component
      console.log("Generating report cards for:", {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        terms: selectedTerms,
        students: activeTab === "individual" ? selectedStudents : studentsInClass.map(s => s.id)
      });
      
      // Simulate progress for now
      for (let i = 0; i <= 100; i += 10) {
        setGenerationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Error generating report cards:", error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Report Cards</h1>
        <p className="text-muted-foreground">
          Generate student report cards using PDF templates with assessment data
        </p>
      </div>

      {/* Generation Mode Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class-wise" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Class/Section Wise
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual Students
          </TabsTrigger>
        </TabsList>

        {/* Class/Section Wise Generation */}
        <TabsContent value="class-wise" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Class/Section Selection
              </CardTitle>
              <CardDescription>
                Generate report cards for entire class or specific sections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClassSectionSelector
                classes={classes}
                selectedClassId={selectedClassId}
                selectedSectionId={selectedSectionId}
                onClassChange={setSelectedClassId}
                onSectionChange={setSelectedSectionId}
                isLoading={classesLoading}
              />

              {selectedClassId && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">
                      {studentsInClass.length} students selected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedClass?.name}
                      {selectedSectionId && selectedSectionId !== "all" && 
                        ` - ${sectionsInClass.find(s => s.id === selectedSectionId)?.name}`
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Students Generation */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Individual Student Selection
              </CardTitle>
              <CardDescription>
                Select specific students for report card generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClassSectionSelector
                classes={classes}
                selectedClassId={selectedClassId}
                selectedSectionId={selectedSectionId}
                onClassChange={setSelectedClassId}
                onSectionChange={setSelectedSectionId}
                isLoading={classesLoading}
              />

              {selectedClassId && (
                <StudentSelector
                  students={studentsInClass}
                  selectedStudents={selectedStudents}
                  onSelectionChange={setSelectedStudents}
                  isLoading={studentsLoading}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Term Selection */}
      {selectedClassId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assessment Period
            </CardTitle>
            <CardDescription>
              Select the terms/periods to include in the report cards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {terms.map((term) => (
                <div key={term.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`term-${term.id}`}
                    checked={selectedTerms.includes(term.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTerms([...selectedTerms, term.id]);
                      } else {
                        setSelectedTerms(selectedTerms.filter(id => id !== term.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`term-${term.id}`} className="text-sm">
                    {term.name}
                  </Label>
                </div>
              ))}
            </div>

            {selectedTerms.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  {selectedTerms.length} term(s) selected for report generation
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Selection & Generation */}
      {selectedClassId && selectedTerms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Template & Generation
            </CardTitle>
            <CardDescription>
              Configure PDF template and generate report cards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Report cards will be generated using the Classes 6-8 Half Yearly template. 
                Ensure all assessment data is complete before generation.
              </AlertDescription>
            </Alert>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating report cards...</span>
                </div>
                <Progress value={generationProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {generationProgress}% complete
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button
                onClick={handleGenerateReportCards}
                disabled={
                  isGenerating || 
                  !selectedClassId || 
                  selectedTerms.length === 0 ||
                  (activeTab === "individual" && selectedStudents.length === 0)
                }
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Generate Report Cards
              </Button>

              <div className="text-sm text-muted-foreground">
                {activeTab === "class-wise" 
                  ? `${studentsInClass.length} report cards will be generated`
                  : `${selectedStudents.length} report cards will be generated`
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Generator Component (Hidden) - Only render when actually generating */}
      {isGenerating && (
        <ReportCardPDFGenerator
          classId={selectedClassId}
          sectionId={selectedSectionId}
          studentIds={activeTab === "individual" ? selectedStudents : studentsInClass.map(s => s.id)}
          termIds={selectedTerms}
          templateType="classes-6-8-half-yearly"
          onGenerationComplete={() => {
            setIsGenerating(false);
            setGenerationProgress(0);
          }}
          onProgress={setGenerationProgress}
        />
      )}
    </div>
  );
} 