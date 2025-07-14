"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  GraduationCap, 
  Building2, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { formatIndianNumber } from "@/lib/utils";

interface DashboardSummaryProps {
  data: {
    totalStudents: number;
    activeStudents: number;
    academicYearStudents: number;
    totalTeachers: number;
    activeTeachers: number;
    teachersInCurrentSession: number;
    totalEmployees: number;
    activeEmployees: number;
    totalBranches: number;
    studentsByBranch: Array<{
      branchId: string;
      branchName: string;
      totalStudents: number;
      activeStudents: number;
      academicYearStudents: number;
      percentage: number;
    }>;
    staffByBranch: Array<{
      branchId: string;
      branchName: string;
      teacherCount: number;
      teachersInCurrentSession: number;
      employeeCount: number;
      totalStaff: number;
      percentage: number;
    }>;
    enrollmentTrends: Array<{
      year: number;
      count: number;
    }>;
    classDistribution: Array<{
      className: string;
      count: number;
      studentCount: number;
    }>;
  };
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  // Calculate insights and recommendations
  const insights = useMemo(() => {
    const studentRetentionRate = data.totalStudents > 0 ? (data.activeStudents / data.totalStudents) * 100 : 0;
    const teacherUtilizationRate = data.totalTeachers > 0 ? (data.teachersInCurrentSession / data.totalTeachers) * 100 : 0;
    const studentTeacherRatio = data.teachersInCurrentSession > 0 ? data.academicYearStudents / data.teachersInCurrentSession : 0;
    
    // Find branch with highest and lowest enrollment
    const highestEnrollmentBranch = data.studentsByBranch.reduce((prev, current) => 
      (current.academicYearStudents > prev.academicYearStudents) ? current : prev
    );
    const lowestEnrollmentBranch = data.studentsByBranch.reduce((prev, current) => 
      (current.academicYearStudents < prev.academicYearStudents) ? current : prev
    );
    
    // Calculate enrollment growth
    const enrollmentGrowth = data.enrollmentTrends.length >= 2 ? 
      ((data.enrollmentTrends[0]?.count || 0) - (data.enrollmentTrends[1]?.count || 0)) / (data.enrollmentTrends[1]?.count || 1) * 100 : 0;
    
    // Find largest class
    const largestClass = data.classDistribution.reduce((prev, current) => 
      (current.studentCount > prev.studentCount) ? current : prev
    );
    
    // Calculate alerts and recommendations
    const alerts = [];
    const recommendations = [];
    
    if (studentRetentionRate < 85) {
      alerts.push({
        type: "warning",
        message: `Student retention rate is ${studentRetentionRate.toFixed(1)}% - below recommended 85%`,
        action: "Review student satisfaction and support services"
      });
    }
    
    if (studentTeacherRatio > 30) {
      alerts.push({
        type: "error",
        message: `Student-teacher ratio is ${studentTeacherRatio.toFixed(1)}:1 - exceeds recommended 25:1`,
        action: "Consider hiring additional teachers"
      });
    }
    
    if (teacherUtilizationRate < 70) {
      recommendations.push({
        type: "info",
        message: `Teacher utilization is ${teacherUtilizationRate.toFixed(1)}% - room for optimization`,
        action: "Review class assignments and teaching loads"
      });
    }
    
    if (enrollmentGrowth > 15) {
      recommendations.push({
        type: "success",
        message: `Enrollment growth is ${enrollmentGrowth.toFixed(1)}% - excellent performance`,
        action: "Prepare for capacity expansion"
      });
    }
    
    return {
      studentRetentionRate,
      teacherUtilizationRate,
      studentTeacherRatio,
      highestEnrollmentBranch,
      lowestEnrollmentBranch,
      enrollmentGrowth,
      largestClass,
      alerts,
      recommendations
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Student Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {insights.studentRetentionRate.toFixed(1)}%
              </div>
              <div className={`flex items-center ${insights.studentRetentionRate >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                {insights.studentRetentionRate >= 85 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <Progress value={insights.studentRetentionRate} className="mt-2 h-2" />
            <div className="text-xs text-gray-500 mt-1">
              {formatIndianNumber(data.activeStudents)} of {formatIndianNumber(data.totalStudents)} students
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Teacher Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {insights.teacherUtilizationRate.toFixed(1)}%
              </div>
              <div className={`flex items-center ${insights.teacherUtilizationRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                {insights.teacherUtilizationRate >= 70 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <Progress value={insights.teacherUtilizationRate} className="mt-2 h-2" />
            <div className="text-xs text-gray-500 mt-1">
              {formatIndianNumber(data.teachersInCurrentSession)} of {formatIndianNumber(data.totalTeachers)} teachers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Student:Teacher Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {insights.studentTeacherRatio.toFixed(1)}:1
              </div>
              <div className={`flex items-center ${insights.studentTeacherRatio <= 25 ? 'text-green-600' : 'text-red-600'}`}>
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Recommended: 15:1 to 25:1
            </div>
            <div className="mt-2">
              <Badge variant={insights.studentTeacherRatio <= 25 ? "default" : "destructive"}>
                {insights.studentTeacherRatio <= 25 ? "Optimal" : "High"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Branch Performance Insights
          </CardTitle>
          <CardDescription>
            Comparative analysis of branch performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Highest Performing Branch</h4>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-900">
                      {insights.highestEnrollmentBranch.branchName}
                    </div>
                    <div className="text-sm text-green-700">
                      {formatIndianNumber(insights.highestEnrollmentBranch.academicYearStudents)} students
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    {insights.highestEnrollmentBranch.percentage}%
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Growth Opportunity</h4>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-900">
                      {insights.lowestEnrollmentBranch.branchName}
                    </div>
                    <div className="text-sm text-blue-700">
                      {formatIndianNumber(insights.lowestEnrollmentBranch.academicYearStudents)} students
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    {insights.lowestEnrollmentBranch.percentage}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Enrollment Trends
          </CardTitle>
          <CardDescription>
            Year-over-year enrollment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">
                {insights.enrollmentGrowth >= 0 ? '+' : ''}{insights.enrollmentGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Year-over-year growth</div>
            </div>
            <div className={`flex items-center ${insights.enrollmentGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {insights.enrollmentGrowth >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          </div>
          
          <div className="space-y-2">
            {data.enrollmentTrends.map((trend, index) => (
              <div key={trend.year} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="font-medium">{trend.year}</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{formatIndianNumber(trend.count)}</div>
                  {index < data.enrollmentTrends.length - 1 && (
                    <Badge variant="outline" className="text-xs">
                      {((trend.count - data.enrollmentTrends[index + 1]!.count) / data.enrollmentTrends[index + 1]!.count * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Distribution Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Class Distribution Analysis</CardTitle>
          <CardDescription>
            Student distribution across different grade levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Largest Class</div>
                <div className="text-sm text-gray-600">
                  Grade {insights.largestClass.className} - {formatIndianNumber(insights.largestClass.studentCount)} students
                </div>
              </div>
              <Badge variant="default">
                {insights.largestClass.count} sections
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            {data.classDistribution
              .sort((a, b) => b.studentCount - a.studentCount)
              .slice(0, 5)
              .map((classData, index) => (
                <div key={classData.className} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">Grade {classData.className}</div>
                    <Badge variant="outline" className="text-xs">
                      {classData.count} sections
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    {formatIndianNumber(classData.studentCount)} students
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Recommendations */}
      {(insights.alerts.length > 0 || insights.recommendations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alerts */}
          {insights.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.alerts.map((alert, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg">
                      <div className="font-medium text-red-900">{alert.message}</div>
                      <div className="text-sm text-red-700 mt-1">{alert.action}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <Info className="h-5 w-5 mr-2" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.recommendations.map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      rec.type === 'success' ? 'bg-green-50' : 'bg-blue-50'
                    }`}>
                      <div className={`font-medium ${
                        rec.type === 'success' ? 'text-green-900' : 'text-blue-900'
                      }`}>{rec.message}</div>
                      <div className={`text-sm mt-1 ${
                        rec.type === 'success' ? 'text-green-700' : 'text-blue-700'
                      }`}>{rec.action}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 