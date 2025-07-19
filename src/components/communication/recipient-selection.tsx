"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Briefcase, 
  Search,
  Filter,
  X,
  School,
  Building,
  Check,
  Plus,
  Minus,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: string;
  additional?: any;
}

interface RecipientSelectionComponentProps {
  onRecipientsChange: (recipients: Recipient[]) => void;
  recipientType: string;
  onRecipientTypeChange: (type: string) => void;
}

export function RecipientSelectionComponent({
  onRecipientsChange,
  recipientType,
  onRecipientTypeChange,
}: RecipientSelectionComponentProps) {
  const { currentBranchId, isLoading: branchLoading } = useBranchContext();
  const { currentSessionId, isLoading: sessionLoading } = useAcademicSessionContext();
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  // Fetch classes for filtering
  const { data: classes, isLoading: classesLoading, error: classesError } = api.class.getAll.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId || undefined,
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
  });

  // Fetch sections for filtering
  const { data: sections, isLoading: sectionsLoading } = api.section.getAll.useQuery({
    classId: selectedClassIds.length > 0 ? selectedClassIds[0] : undefined,
    branchId: currentBranchId!,
    sessionId: currentSessionId || undefined,
  }, {
    enabled: selectedClassIds.length > 0 && !!currentBranchId && !!currentSessionId,
  });

  // Fetch recipients based on type and filters
  const { data: recipients, isLoading: recipientsLoading } = api.communication.getRecipients.useQuery({
    recipientType: recipientType as any,
    branchId: currentBranchId!,
    classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
    sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
  }, {
    enabled: !!currentBranchId && !!recipientType,
  });

  // Update selected recipients when they change
  useEffect(() => {
    onRecipientsChange(selectedRecipients);
  }, [selectedRecipients]); // Remove onRecipientsChange from dependencies to prevent infinite loop

  // Clear selections when recipient type changes
  useEffect(() => {
    setSelectedRecipients([]);
    setSelectedClassIds([]);
    setSelectedSectionIds([]);
    setSearchTerm("");
  }, [recipientType]);

  const recipientTypes = [
    { 
      value: "ALL_STUDENTS", 
      label: "All Students", 
      icon: <GraduationCap className="w-5 h-5" />,
      description: "Send to all students in the school",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
    },
    { 
      value: "ENTIRE_CLASS", 
      label: "Entire Class", 
      icon: <School className="w-5 h-5" />,
      description: "Send to all students in specific classes",
      color: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
    },
    { 
      value: "SPECIFIC_SECTION", 
      label: "Specific Section", 
      icon: <Building className="w-5 h-5" />,
      description: "Send to students in specific sections",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
    },
    { 
      value: "ALL_TEACHERS", 
      label: "All Teachers", 
      icon: <UserCheck className="w-5 h-5" />,
      description: "Send to all teaching staff",
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
    },
    { 
      value: "ALL_EMPLOYEES", 
      label: "All Employees", 
      icon: <Briefcase className="w-5 h-5" />,
      description: "Send to all non-teaching staff",
      color: "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
    },
    { 
      value: "PARENTS", 
      label: "All Parents", 
      icon: <Users className="w-5 h-5" />,
      description: "Send to all parents/guardians",
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
    },
  ];

  const filteredRecipients = recipients?.filter(recipient =>
    recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipient.phone.includes(searchTerm)
  ) || [];

  const isRecipientSelected = (recipient: Recipient) => {
    return selectedRecipients.some(r => r.id === recipient.id);
  };

  const toggleRecipient = (recipient: Recipient) => {
    setSelectedRecipients(prev => {
      const isSelected = prev.some(r => r.id === recipient.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recipient.id);
      } else {
        return [...prev, recipient];
      }
    });
  };

  const selectAllFilteredRecipients = () => {
    const newSelections = filteredRecipients.filter(
      recipient => !isRecipientSelected(recipient)
    );
    setSelectedRecipients(prev => [...prev, ...newSelections]);
  };

  const deselectAllFilteredRecipients = () => {
    const filteredIds = new Set(filteredRecipients.map(r => r.id));
    setSelectedRecipients(prev => prev.filter(r => !filteredIds.has(r.id)));
  };

  const clearAllSelections = () => {
    setSelectedRecipients([]);
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case "student":
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case "teacher":
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case "employee":
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case "parent":
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const requiresClassFilter = ["ENTIRE_CLASS", "SPECIFIC_SECTION"].includes(recipientType);
  const requiresSectionFilter = recipientType === "SPECIFIC_SECTION";

  // Debug logging
  console.log("RecipientSelection Debug:", {
    currentBranchId,
    currentSessionId,
    branchLoading,
    sessionLoading,
    classesLoading,
    classesError: classesError?.message,
    classes: classes?.length || 0,
    requiresClassFilter,
    queryEnabled: !!currentBranchId && !!currentSessionId,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="space-y-6">
      {/* Recipient Type Selection - Card Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Choose Recipients
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipientTypes.map((type) => (
            <Card
              key={type.value}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105",
                recipientType === type.value 
                  ? `ring-2 ring-blue-500 ${type.color}` 
                  : "hover:shadow-md border-gray-200"
              )}
              onClick={() => onRecipientTypeChange(type.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    recipientType === type.value ? "bg-white/50" : "bg-gray-100"
                  )}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{type.label}</h4>
                    <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                  </div>
                  {recipientType === type.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      {(requiresClassFilter || requiresSectionFilter) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
            <CardDescription>
              Select specific classes or sections to target your message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="classes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="sections" disabled={!requiresSectionFilter}>Sections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="classes" className="mt-4">
                {classesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading classes...</span>
                  </div>
                ) : classesError ? (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium">Error loading classes</p>
                    <p className="mt-1">{classesError.message}</p>
                  </div>
                ) : !classes || classes.length === 0 ? (
                  <div className="text-center py-8">
                    <School className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No classes found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Branch: {currentBranchId || "Not selected"} | Session: {currentSessionId || "Not selected"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classes.map((classItem) => (
                      <Card
                        key={classItem.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          selectedClassIds.includes(classItem.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:shadow-md"
                        )}
                        onClick={() => {
                          if (selectedClassIds.includes(classItem.id)) {
                            setSelectedClassIds(prev => prev.filter(id => id !== classItem.id));
                          } else {
                            setSelectedClassIds(prev => [...prev, classItem.id]);
                          }
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <School className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm">{classItem.name}</span>
                            </div>
                                                         <Checkbox
                               checked={selectedClassIds.includes(classItem.id)}
                             />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sections" className="mt-4">
                {selectedClassIds.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Select a class first</p>
                    <p className="text-sm text-gray-400">Choose classes to see their sections</p>
                  </div>
                ) : sectionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading sections...</span>
                  </div>
                ) : !sections || sections.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No sections found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sections.map((section) => (
                      <Card
                        key={section.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          selectedSectionIds.includes(section.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:shadow-md"
                        )}
                        onClick={() => {
                          if (selectedSectionIds.includes(section.id)) {
                            setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                          } else {
                            setSelectedSectionIds(prev => [...prev, section.id]);
                          }
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-sm">{section.name}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{section.class?.name}</p>
                            </div>
                                                         <Checkbox
                               checked={selectedSectionIds.includes(section.id)}
                             />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Recipients Section */}
      {recipients && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Select Recipients
                </CardTitle>
                <CardDescription>
                  {recipientsLoading 
                    ? "Loading recipients..." 
                    : `${filteredRecipients.length} recipients available`
                  }
                </CardDescription>
              </div>
              {selectedRecipients.length > 0 && (
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedRecipients.length} selected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {filteredRecipients.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllFilteredRecipients}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Select All ({filteredRecipients.length})
                  </Button>
                  {selectedRecipients.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                      className="flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear ({selectedRecipients.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Recipients List */}
            {recipientsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recipients found</h3>
                <p className="text-gray-500">
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "No recipients available for the selected criteria"
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredRecipients.map((recipient) => (
                  <Card
                    key={recipient.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105",
                      isRecipientSelected(recipient)
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : "hover:shadow-md"
                    )}
                    onClick={() => toggleRecipient(recipient)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {getInitials(recipient.name)}
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getRecipientIcon(recipient.type)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{recipient.name}</h4>
                            <Checkbox
                              checked={isRecipientSelected(recipient)}
                            />
                          </div>
                          <p className="text-xs text-gray-500 truncate">{recipient.phone}</p>
                          
                          {/* Additional Info */}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize">
                              {recipient.type}
                            </Badge>
                            {recipient.className && (
                              <span className="text-xs text-gray-500">
                                {recipient.className}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 