"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Users, 
  User, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  UsersIcon,
  Plus,
  X,
  Search,
  ChevronDown,
  Check,
  UserCheck
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { cn } from "@/lib/utils";

interface ApprovalSettings {
  approvalType: '1_PERSON' | '2_PERSON';
  authorizationType: 'ROLE_BASED' | 'INDIVIDUAL_BASED';
  autoApproveBelow: number;
  requireDocumentVerification: boolean;
  allowSelfApproval: boolean;
  maxApprovalAmount: number;
  escalationThreshold: number;
  notificationEnabled: boolean;
  approvalTimeoutDays: number;
  requireReason: boolean;
  approvalRoles: string[];
  secondApprovalRoles?: string[];
  approvalIndividuals: string[];
  secondApprovalIndividuals?: string[];
}

interface ConcessionApprovalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ApprovalSettings) => Promise<void>;
  currentSettings?: ApprovalSettings;
  isLoading?: boolean;
}

interface Personnel {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  employeeCode?: string | null;
  type: 'employee' | 'teacher';
}

// Move PersonnelSearchComponent outside to prevent re-creation on renders
const PersonnelSearchComponent = React.memo(({ 
  searchQuery, 
  setSearchQuery, 
  searchOpen, 
  setSearchOpen,
  debouncedQuery,
  results,
  loading,
  error,
  onSelectPersonnel,
  placeholder = "Search employees/teachers by name or email..."
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  debouncedQuery: string;
  results: Personnel[];
  loading: boolean;
  error: any;
  onSelectPersonnel: (personnel: Personnel) => void;
  placeholder?: string;
}) => {
  console.log('PersonnelSearchComponent Debug:', {
    searchQuery,
    debouncedQuery,
    resultsCount: results.length,
    loading,
    error: error?.message,
    searchOpen
  });

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          console.log('Input onChange:', e.target.value);
          setSearchQuery(e.target.value);
          setSearchOpen(e.target.value.length >= 2);
        }}
        className="w-full"
      />
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      
      {/* Search Results Dropdown */}
      {searchOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="p-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
              <div className="text-xs text-muted-foreground mt-1">Searching...</div>
            </div>
          )}
          
          {error && (
            <div className="p-3 text-sm text-red-500">
              Error: {error.message}
            </div>
          )}
          
          {!loading && !error && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No employees or teachers found.
            </div>
          )}
          
          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((person) => (
                <div
                  key={person.id}
                  onClick={() => {
                    console.log('Selected person:', person);
                    onSelectPersonnel(person);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{person.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {person.email || 'No email address'} • {person.role}
                      </div>
                      {person.employeeCode && (
                        <div className="text-xs text-muted-foreground">
                          Code: {person.employeeCode}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {person.type}
                      </Badge>
                      {!person.email && (
                        <Badge variant="destructive" className="text-xs">
                          No Email
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PersonnelSearchComponent.displayName = 'PersonnelSearchComponent';

const defaultSettings: ApprovalSettings = {
  approvalType: '1_PERSON',
  authorizationType: 'ROLE_BASED',
  autoApproveBelow: 1000,
  requireDocumentVerification: true,
  allowSelfApproval: false,
  maxApprovalAmount: 50000,
  escalationThreshold: 25000,
  notificationEnabled: true,
  approvalTimeoutDays: 7,
  requireReason: true,
  approvalRoles: [],
  secondApprovalRoles: [],
  approvalIndividuals: [],
  secondApprovalIndividuals: [],
};

export function ConcessionApprovalSettings({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  isLoading = false,
}: ConcessionApprovalSettingsProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const [settings, setSettings] = useState<ApprovalSettings>(currentSettings || defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Personnel search state
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState('');
  const [personnelSearchOpen, setPersonnelSearchOpen] = useState(false);
  const [secondPersonnelSearchQuery, setSecondPersonnelSearchQuery] = useState('');
  const [secondPersonnelSearchOpen, setSecondPersonnelSearchOpen] = useState(false);

  // Debounced search queries
  const [debouncedPersonnelQuery, setDebouncedPersonnelQuery] = useState('');
  const [debouncedSecondPersonnelQuery, setDebouncedSecondPersonnelQuery] = useState('');

  // Debounce the search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPersonnelQuery(personnelSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [personnelSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSecondPersonnelQuery(secondPersonnelSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [secondPersonnelSearchQuery]);

  // Fetch available roles
  const {
    data: availableRoles = [],
    isLoading: rolesLoading
  } = api.finance.getAvailableRoles.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  // Search personnel (using debounced query)
  const {
    data: personnelResults = [],
    isLoading: personnelLoading,
    error: personnelError
  } = api.finance.searchApprovalPersonnel.useQuery(
    {
      branchId: currentBranchId!,
      search: debouncedPersonnelQuery,
      limit: 20,
    },
    {
      enabled: !!currentBranchId && debouncedPersonnelQuery.length >= 2,
      staleTime: 1000,
      retry: 1,
    }
  );

  // Search second approval personnel (using debounced query)
  const {
    data: secondPersonnelResults = [],
    isLoading: secondPersonnelLoading,
    error: secondPersonnelError
  } = api.finance.searchApprovalPersonnel.useQuery(
    {
      branchId: currentBranchId!,
      search: debouncedSecondPersonnelQuery,
      limit: 20,
    },
    {
      enabled: !!currentBranchId && debouncedSecondPersonnelQuery.length >= 2,
      staleTime: 1000,
      retry: 1,
    }
  );

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Enhanced debug logging
  useEffect(() => {
    console.log('Personnel Search Debug:', {
      currentBranchId,
      personnelSearchQuery,
      debouncedPersonnelQuery,
      personnelResults: personnelResults?.length || 0,
      personnelLoading,
      personnelError: personnelError?.message,
      queryEnabled: !!currentBranchId && debouncedPersonnelQuery.length >= 2,
      resultsData: personnelResults,
    });
  }, [currentBranchId, personnelSearchQuery, debouncedPersonnelQuery, personnelResults, personnelLoading, personnelError]);

  const handleSettingChange = (key: keyof ApprovalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleRoleToggle = (roleValue: string, isSecondApproval = false) => {
    const roleKey = isSecondApproval ? 'secondApprovalRoles' : 'approvalRoles';
    const currentRoles = settings[roleKey] || [];
    
    const updatedRoles = currentRoles.includes(roleValue)
      ? currentRoles.filter(role => role !== roleValue)
      : [...currentRoles, roleValue];
    
    handleSettingChange(roleKey, updatedRoles);
  };

  const handleAddPersonnel = (personnel: Personnel, isSecondApproval = false) => {
    // Check if personnel has an email address
    if (!personnel.email || personnel.email.trim() === '') {
      toast({
        title: "Warning",
        description: `${personnel.name} doesn't have an email address. They cannot receive notifications.`,
        variant: "destructive",
      });
      return;
    }
    
    const individualKey = isSecondApproval ? 'secondApprovalIndividuals' : 'approvalIndividuals';
    const currentIndividuals = settings[individualKey] || [];
    
    if (!currentIndividuals.includes(personnel.email)) {
      handleSettingChange(individualKey, [...currentIndividuals, personnel.email]);
      toast({
        title: "Personnel Added",
        description: `${personnel.name} has been added to the approval list.`,
      });
    } else {
      toast({
        title: "Already Added",
        description: `${personnel.name} is already in the approval list.`,
        variant: "destructive",
      });
    }
    
    if (isSecondApproval) {
      setSecondPersonnelSearchQuery('');
      setSecondPersonnelSearchOpen(false);
    } else {
      setPersonnelSearchQuery('');
      setPersonnelSearchOpen(false);
    }
  };

  const handleRemoveIndividual = (email: string, isSecondApproval = false) => {
    const individualKey = isSecondApproval ? 'secondApprovalIndividuals' : 'approvalIndividuals';
    const currentIndividuals = settings[individualKey] || [];
    
    handleSettingChange(individualKey, currentIndividuals.filter(ind => ind !== email));
  };

  const handleSave = async () => {
    try {
      // Validation based on authorization type
      if (settings.authorizationType === 'ROLE_BASED') {
        if (settings.approvalRoles.length === 0) {
          toast({
            title: "Validation Error",
            description: "At least one approval role must be selected",
            variant: "destructive",
          });
          return;
        }

        if (settings.approvalType === '2_PERSON' && (!settings.secondApprovalRoles || settings.secondApprovalRoles.length === 0)) {
          toast({
            title: "Validation Error", 
            description: "Second approval roles must be selected for 2-person approval",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (settings.approvalIndividuals.length === 0) {
          toast({
            title: "Validation Error",
            description: "At least one individual must be added for approval",
            variant: "destructive",
          });
          return;
        }

        if (settings.approvalType === '2_PERSON' && (!settings.secondApprovalIndividuals || settings.secondApprovalIndividuals.length === 0)) {
          toast({
            title: "Validation Error", 
            description: "Second approval individuals must be added for 2-person approval",
            variant: "destructive",
          });
          return;
        }
      }

      if (settings.autoApproveBelow >= settings.maxApprovalAmount) {
        toast({
          title: "Validation Error",
          description: "Auto-approve threshold must be less than maximum approval amount",
          variant: "destructive",
        });
        return;
      }

      await onSave(settings);
      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Concession approval settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save approval settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSettings(currentSettings || defaultSettings);
    setHasChanges(false);
    setPersonnelSearchQuery('');
    setSecondPersonnelSearchQuery('');
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmClose = confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmClose) return;
    }
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Concession Approval Settings
          </DialogTitle>
          <DialogDescription>
            Configure approval workflows and permissions for student concessions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Approval Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Approval Workflow
              </CardTitle>
              <CardDescription>
                Choose between single-person or dual-person approval process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.approvalType === '1_PERSON' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSettingChange('approvalType', '1_PERSON')}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">1-Person Approval</h3>
                      <p className="text-sm text-muted-foreground">
                        Single authorized person can approve concessions
                      </p>
                    </div>
                  </div>
                  {settings.approvalType === '1_PERSON' && (
                    <CheckCircle2 className="h-5 w-5 text-primary mt-2" />
                  )}
                </div>

                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.approvalType === '2_PERSON' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSettingChange('approvalType', '2_PERSON')}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">2-Person Approval</h3>
                      <p className="text-sm text-muted-foreground">
                        Requires approval from two different authorized persons
                      </p>
                    </div>
                  </div>
                  {settings.approvalType === '2_PERSON' && (
                    <CheckCircle2 className="h-5 w-5 text-primary mt-2" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorization Type & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authorization & Permissions</CardTitle>
              <CardDescription>
                Choose how approval permissions are granted and configure authorized personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Authorization Type Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Authorization Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      settings.authorizationType === 'ROLE_BASED' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSettingChange('authorizationType', 'ROLE_BASED')}
                  >
                    <div className="flex items-center gap-3">
                      <UsersIcon className="h-6 w-6 text-purple-600" />
                      <div>
                        <h4 className="font-medium">Role-Based</h4>
                        <p className="text-xs text-muted-foreground">
                          Grant permissions to entire roles
                        </p>
                      </div>
                    </div>
                    {settings.authorizationType === 'ROLE_BASED' && (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-2" />
                    )}
                  </div>

                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      settings.authorizationType === 'INDIVIDUAL_BASED' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSettingChange('authorizationType', 'INDIVIDUAL_BASED')}
                  >
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-6 w-6 text-orange-600" />
                      <div>
                        <h4 className="font-medium">Individual-Based</h4>
                        <p className="text-xs text-muted-foreground">
                          Grant permissions to specific individuals
                        </p>
                      </div>
                    </div>
                    {settings.authorizationType === 'INDIVIDUAL_BASED' && (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-2" />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Role-Based Authorization */}
              {settings.authorizationType === 'ROLE_BASED' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">First Approval Roles</Label>
                    {rolesLoading ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availableRoles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={settings.approvalRoles.includes(role.id)}
                              onCheckedChange={() => handleRoleToggle(role.id)}
                            />
                            <Label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">
                              {role.name}
                            </Label>
                          </div>
                        ))}
                        {availableRoles.length === 0 && (
                          <p className="text-sm text-muted-foreground col-span-2">No roles available</p>
                        )}
                      </div>
                    )}
                  </div>

                  {settings.approvalType === '2_PERSON' && (
                    <div>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">Second Approval Roles</Label>
                        {rolesLoading ? (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {[1, 2, 3, 4].map((i) => (
                              <Skeleton key={i} className="h-8 w-full" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {availableRoles.map((role) => (
                              <div key={`second-${role.id}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`second-role-${role.id}`}
                                  checked={(settings.secondApprovalRoles || []).includes(role.id)}
                                  onCheckedChange={() => handleRoleToggle(role.id, true)}
                                />
                                <Label htmlFor={`second-role-${role.id}`} className="text-sm cursor-pointer">
                                  {role.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Individual-Based Authorization */}
              {settings.authorizationType === 'INDIVIDUAL_BASED' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">First Approval Individuals</Label>
                    <div className="space-y-2 mt-2">
                      <PersonnelSearchComponent
                        searchQuery={personnelSearchQuery}
                        setSearchQuery={setPersonnelSearchQuery}
                        searchOpen={personnelSearchOpen}
                        setSearchOpen={setPersonnelSearchOpen}
                        debouncedQuery={debouncedPersonnelQuery}
                        results={personnelResults}
                        loading={personnelLoading}
                        error={personnelError}
                        onSelectPersonnel={(personnel) => handleAddPersonnel(personnel, false)}
                      />
                      
                      <div className="space-y-1">
                        {settings.approvalIndividuals.map((email, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <span className="text-sm">{email}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveIndividual(email, false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {settings.approvalIndividuals.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No individuals added yet</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {settings.approvalType === '2_PERSON' && (
                    <div>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">Second Approval Individuals</Label>
                        <div className="space-y-2 mt-2">
                          <PersonnelSearchComponent
                            searchQuery={secondPersonnelSearchQuery}
                            setSearchQuery={setSecondPersonnelSearchQuery}
                            searchOpen={secondPersonnelSearchOpen}
                            setSearchOpen={setSecondPersonnelSearchOpen}
                            debouncedQuery={debouncedSecondPersonnelQuery}
                            results={secondPersonnelResults}
                            loading={secondPersonnelLoading}
                            error={secondPersonnelError}
                            onSelectPersonnel={(personnel) => handleAddPersonnel(personnel, true)}
                            placeholder="Search for second approval personnel..."
                          />
                          
                          <div className="space-y-1">
                            {(settings.secondApprovalIndividuals || []).map((email, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <span className="text-sm">{email}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveIndividual(email, true)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {(settings.secondApprovalIndividuals || []).length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No individuals added yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approval Limits & Thresholds</CardTitle>
              <CardDescription>
                Set monetary limits and auto-approval thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoApprove">Auto-Approve Below (₹)</Label>
                  <Input
                    id="autoApprove"
                    type="number"
                    value={settings.autoApproveBelow}
                    onChange={(e) => handleSettingChange('autoApproveBelow', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Concessions below this amount will be auto-approved
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxApproval">Maximum Approval Amount (₹)</Label>
                  <Input
                    id="maxApproval"
                    type="number"
                    value={settings.maxApprovalAmount}
                    onChange={(e) => handleSettingChange('maxApprovalAmount', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum amount that can be approved at this level
                  </p>
                </div>

                {settings.approvalType === '2_PERSON' && (
                  <div className="space-y-2">
                    <Label htmlFor="escalation">2nd Approval Threshold (₹)</Label>
                    <Input
                      id="escalation"
                      type="number"
                      value={settings.escalationThreshold}
                      onChange={(e) => handleSettingChange('escalationThreshold', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="1000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Amounts above this require second approval
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="timeout">Approval Timeout (Days)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={settings.approvalTimeoutDays}
                    onChange={(e) => handleSettingChange('approvalTimeoutDays', parseInt(e.target.value) || 7)}
                    min="1"
                    max="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Days after which pending approvals expire
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Settings</CardTitle>
              <CardDescription>
                Configure additional approval requirements and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Require Document Verification</Label>
                    <p className="text-xs text-muted-foreground">
                      Mandate document upload for concession approval
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireDocumentVerification}
                    onCheckedChange={(checked) => handleSettingChange('requireDocumentVerification', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow Self-Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow concession creators to approve their own requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowSelfApproval}
                    onCheckedChange={(checked) => handleSettingChange('allowSelfApproval', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Require Approval Reason</Label>
                    <p className="text-xs text-muted-foreground">
                      Mandate reason when approving or rejecting concessions
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireReason}
                    onCheckedChange={(checked) => handleSettingChange('requireReason', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Send email notifications for approval requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationEnabled}
                    onCheckedChange={(checked) => handleSettingChange('notificationEnabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Approval Workflow Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Current Configuration:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Approval Type: <Badge variant="outline">{settings.approvalType.replace('_', '-')}</Badge></li>
                  <li>• Authorization: <Badge variant="outline">{settings.authorizationType.replace('_', ' ')}</Badge></li>
                  <li>• Auto-approve below: ₹{settings.autoApproveBelow.toLocaleString()}</li>
                  <li>• Maximum approval: ₹{settings.maxApprovalAmount.toLocaleString()}</li>
                  {settings.approvalType === '2_PERSON' && (
                    <li>• Second approval needed above: ₹{settings.escalationThreshold.toLocaleString()}</li>
                  )}
                  <li>• Approval timeout: {settings.approvalTimeoutDays} days</li>
                  <li>• Document verification: {settings.requireDocumentVerification ? 'Required' : 'Optional'}</li>
                  {settings.authorizationType === 'ROLE_BASED' && (
                    <li>• Authorized roles: {settings.approvalRoles.length} selected</li>
                  )}
                  {settings.authorizationType === 'INDIVIDUAL_BASED' && (
                    <li>• Authorized individuals: {settings.approvalIndividuals.length} added</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 