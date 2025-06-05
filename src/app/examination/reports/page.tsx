"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3,
  PieChart,
  Target,
  Award,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { api } from "@/utils/api";

export default function ExaminationReportsPage() {
  const [selectedExamConfig, setSelectedExamConfig] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExamType, setSelectedExamType] = useState<string>("");

  // Fetch data
  const { data: examConfigs } = api.examination.getExamConfigurations.useQuery();
  const { data: classes } = api.class.getAll.useQuery();
  const { data: examTypes } = api.examination.getExamTypes.useQuery();
  
  // Fetch report data
  const { data: examReport } = api.examination.getExamReport.useQuery(
    { examConfigId: selectedExamConfig },
    { enabled: !!selectedExamConfig }
  );
  
  const { data: classPerformance } = api.examination.getClassPerformance.useQuery(
    { 
      classId: selectedClass,
      examTypeId: selectedExamType || undefined 
    },
    { enabled: !!selectedClass }
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "text-gray-900" }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50";
    if (percentage >= 80) return "text-blue-600 bg-blue-50";
    if (percentage >= 70) return "text-yellow-600 bg-yellow-50";
    if (percentage >= 60) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Examination Reports</h1>
        <p className="text-gray-600 mt-2">
          View detailed exam reports and analytics
        </p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Select criteria to generate reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="examConfig">Exam Configuration</Label>
              <Select value={selectedExamConfig} onValueChange={setSelectedExamConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam configuration" />
                </SelectTrigger>
                <SelectContent>
                  {examConfigs?.map((config: any) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name} - {config.class.name} {config.section?.name} - {config.subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Class Performance</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="examType">Exam Type Filter</Label>
              <Select value={selectedExamType || "ALL_EXAM_TYPES"} onValueChange={(value) => setSelectedExamType(value === "ALL_EXAM_TYPES" ? "" : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_EXAM_TYPES">All Exam Types</SelectItem>
                  {examTypes?.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="exam-report" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exam-report">Exam Report</TabsTrigger>
          <TabsTrigger value="class-performance">Class Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Exam Report Tab */}
        <TabsContent value="exam-report" className="space-y-6">
          {examReport ? (
            <>
              {/* Exam Details */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{examReport.examConfig.name}</CardTitle>
                      <CardDescription>
                        {examReport.examConfig.examType.name} - {examReport.examConfig.subject.name} - 
                        {examReport.examConfig.class.name}
                        {examReport.examConfig.section && ` ${examReport.examConfig.section.name}`}
                      </CardDescription>
                    </div>
                    <Button>
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Maximum Marks</p>
                      <p className="text-2xl font-bold">{examReport.examConfig.maxMarks}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Passing Marks</p>
                      <p className="text-2xl font-bold">{examReport.examConfig.passingMarks}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Weightage</p>
                      <p className="text-2xl font-bold">{examReport.examConfig.weightage}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pass Percentage</p>
                      <p className="text-2xl font-bold text-green-600">
                        {examReport.statistics.passPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard
                  title="Total Students"
                  value={examReport.statistics.totalStudents}
                  subtitle="Registered for exam"
                  icon={Users}
                />
                <StatCard
                  title="Students Appeared"
                  value={examReport.statistics.appeared}
                  subtitle={`${examReport.statistics.absent} absent`}
                  icon={CheckCircle}
                  color="text-green-600"
                />
                <StatCard
                  title="Students Passed"
                  value={examReport.statistics.passed}
                  subtitle={`${examReport.statistics.failed} failed`}
                  icon={Award}
                  color="text-blue-600"
                />
                <StatCard
                  title="Average Score"
                  value={examReport.statistics.average.toFixed(1)}
                  subtitle={`Highest: ${examReport.statistics.highest}, Lowest: ${examReport.statistics.lowest}`}
                  icon={Target}
                  color="text-purple-600"
                />
              </div>

              {/* Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                  <CardDescription>
                    Performance breakdown by grade ranges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { grade: "A+ (90-100%)", min: 90, max: 100, color: "bg-green-500" },
                      { grade: "A (80-89%)", min: 80, max: 89, color: "bg-blue-500" },
                      { grade: "B (70-79%)", min: 70, max: 79, color: "bg-yellow-500" },
                      { grade: "C (60-69%)", min: 60, max: 69, color: "bg-orange-500" },
                      { grade: "D (Below 60%)", min: 0, max: 59, color: "bg-red-500" },
                    ].map((gradeRange) => {
                      const count = examReport.examConfig.marksEntries.filter((entry: any) => {
                        if (entry.isAbsent || !entry.marksObtained) return false;
                        const percentage = (entry.marksObtained / examReport.examConfig.maxMarks) * 100;
                        return percentage >= gradeRange.min && percentage <= gradeRange.max;
                      }).length;
                      const percentage = examReport.statistics.appeared > 0 ? 
                        (count / examReport.statistics.appeared) * 100 : 0;

                      return (
                        <div key={gradeRange.grade} className="flex items-center space-x-4">
                          <div className="w-24 text-sm font-medium">{gradeRange.grade}</div>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-3" />
                          </div>
                          <div className="w-16 text-sm text-right">
                            {count} ({percentage.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Student Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Results</CardTitle>
                  <CardDescription>
                    Individual student performance details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Marks Obtained</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examReport.examConfig.marksEntries
                        .sort((a: any, b: any) => (b.marksObtained || 0) - (a.marksObtained || 0))
                        .map((entry: any) => {
                          const percentage = entry.marksObtained ? 
                            (entry.marksObtained / examReport.examConfig.maxMarks) * 100 : 0;
                          const isPassed = entry.marksObtained && 
                            entry.marksObtained >= examReport.examConfig.passingMarks;

                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">
                                {entry.student.firstName} {entry.student.lastName}
                              </TableCell>
                              <TableCell>{entry.student.admissionNumber}</TableCell>
                              <TableCell>
                                {entry.isAbsent ? "AB" : entry.marksObtained || "-"}
                                {!entry.isAbsent && ` / ${examReport.examConfig.maxMarks}`}
                              </TableCell>
                              <TableCell>
                                {entry.isAbsent ? "AB" : `${percentage.toFixed(1)}%`}
                              </TableCell>
                              <TableCell>
                                {entry.isAbsent ? (
                                  <Badge variant="secondary">Absent</Badge>
                                ) : (
                                  <Badge className={getGradeColor(percentage)}>
                                    {percentage >= 90 ? "A+" : 
                                     percentage >= 80 ? "A" :
                                     percentage >= 70 ? "B" :
                                     percentage >= 60 ? "C" : "D"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.isAbsent ? (
                                  <Badge variant="secondary">Absent</Badge>
                                ) : (
                                  <Badge variant={isPassed ? "default" : "destructive"}>
                                    {isPassed ? "Pass" : "Fail"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {entry.remarks || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Exam Configuration</h3>
                <p className="text-gray-600">
                  Choose an exam configuration to view detailed report.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Class Performance Tab */}
        <TabsContent value="class-performance" className="space-y-6">
          {classPerformance && classPerformance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Class Performance Summary</CardTitle>
                <CardDescription>
                  Subject-wise performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Highest</TableHead>
                      <TableHead>Lowest</TableHead>
                      <TableHead>Pass Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classPerformance.map((performance: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{performance.subject}</TableCell>
                        <TableCell>{performance.examType}</TableCell>
                        <TableCell>{performance.maxMarks}</TableCell>
                        <TableCell>{performance.totalStudents}</TableCell>
                        <TableCell>{performance.average.toFixed(1)}</TableCell>
                        <TableCell>{performance.highest}</TableCell>
                        <TableCell>{performance.lowest}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={performance.passPercentage} className="h-2 w-16" />
                            <span className="text-sm">{performance.passPercentage.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class</h3>
                <p className="text-gray-600">
                  Choose a class to view performance analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Exam Configurations</span>
                    <span className="font-semibold">{examConfigs?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Exam Types</span>
                    <span className="font-semibold">{examTypes?.filter((t: any) => t.isActive).length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Classes</span>
                    <span className="font-semibold">{classes?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Database Connection</span>
                    </div>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">API Status</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Report Generation</span>
                    </div>
                    <Badge variant="default">Ready</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 