"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Calendar, Users, ClipboardList, FileText } from 'lucide-react';

export default function TraditionalExamsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Traditional Exams</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Exam
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="types" className="space-y-4">
        <TabsList>
          <TabsTrigger value="types">Exam Types</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="marks">Marks Entry</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Features</TabsTrigger>
        </TabsList>
        
        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unit Tests</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Active exam types</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Term Exams</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">Scheduled this term</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Exams</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">Per academic year</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Exam Types Management</CardTitle>
              <CardDescription>
                Configure different types of examinations (Unit Tests, Mid-term, Final, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This section allows you to manage traditional exam types that don't use the new assessment schema system.
                  For modern assessment-based evaluations, use the Assessment Schemas section instead.
                </p>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Exam Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Configuration</CardTitle>
              <CardDescription>
                Set up examination parameters, duration, and general settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure exam parameters such as duration, passing criteria, and general examination rules.
                  This is separate from the Assessment Schema configuration which provides more advanced evaluation frameworks.
                </p>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Exams
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="marks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traditional Marks Entry</CardTitle>
              <CardDescription>
                Enter marks for traditional examinations (simple subject-wise scoring)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This is for simple, traditional marks entry where each subject has a single score.
                  For comprehensive assessment with multiple components and criteria, use the Score Entry section instead.
                </p>
                <Button variant="outline">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Enter Marks
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="legacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Features</CardTitle>
              <CardDescription>
                Access to older examination system features for backward compatibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Assessment Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Legacy assessment categorization system
                      </p>
                      <Button variant="outline" size="sm">
                        Manage Categories
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Assessment Marks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Legacy marks entry for older assessment system
                      </p>
                      <Button variant="outline" size="sm">
                        Legacy Marks Entry
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> These legacy features are maintained for backward compatibility. 
                    For new evaluations, we recommend using the modern Assessment Schemas system which provides 
                    more flexibility and advanced features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 