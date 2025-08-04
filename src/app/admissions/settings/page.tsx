"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { SendRegistrationLinkModal } from "@/components/admissions/send-registration-link-modal";
import { 
  ExternalLink, Copy, QrCode, Share, Globe, 
  GraduationCap, Calendar, MapPin, Mail, Phone, Send 
} from "lucide-react";
import { AdmissionsPageGuard } from "@/components/auth/page-guard";

function SettingsPageContent() {
  const { currentBranchId, currentBranch } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  // Modal state for sending registration links
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedLinkData, setSelectedLinkData] = useState<{
    branchId: string;
    sessionId: string;
    branchName: string;
    sessionName: string;
    registrationUrl: string;
  } | null>(null);
  
  // Fetch active academic sessions for link generation
  const { data: allSessions } = api.academicSession.getAll.useQuery();
  const activeSessions = allSessions?.filter(session => session.isActive) || [];
  
  // Fetch all branches
  const { data: allBranches } = api.branch.getAll.useQuery();
  
  // Determine if current context is headquarters
  const isHeadquarters = currentBranchId === 'headquarters' || currentBranch?.code === 'HQ';
  
  // Filter branches based on context
  const branches = allBranches?.filter(branch => {
    // Exclude headquarters from the list in all cases
    if (branch.id === 'headquarters' || branch.code === 'HQ') {
      return false;
    }
    
    // If user is at headquarters, show all branches
    if (isHeadquarters) {
      return true;
    }
    
    // If user is at a specific branch, show only that branch
    return branch.id === currentBranchId;
  }) || [];
  
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "Registration link has been copied to clipboard",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Failed to Copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleSendLink = (branchId: string, sessionId: string, branchName: string, sessionName: string) => {
    const registrationUrl = generateRegistrationUrl(branchId, sessionId);
    setSelectedLinkData({
      branchId,
      sessionId,
      branchName,
      sessionName,
      registrationUrl
    });
    setSendModalOpen(true);
  };

  const generateRegistrationUrl = (branchId: string, sessionId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/register/${branchId}/${sessionId}`;
  };

  return (
    <div className="space-y-6">
      {/* Public Registration Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#00501B]" />
            Public Registration Links
          </CardTitle>
          <CardDescription>
            {isHeadquarters 
              ? "Share these links for direct public registration access to all branches and academic sessions"
              : `Share these links for direct public registration access to ${currentBranch?.name || 'your branch'} and academic sessions`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Branch & Session Link */}
          {currentBranchId && currentSessionId && currentBranch && (
            <div className="p-4 bg-gradient-to-r from-[#00501B]/5 to-[#007B2D]/5 rounded-lg border border-[#00501B]/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                                     <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                     <GraduationCap className="h-5 w-5 text-[#00501B]" />
                     Current Context Link
                   </h3>
                   <p className="text-sm text-gray-600 mt-1">
                     {isHeadquarters 
                       ? "You are at headquarters - you can manage all branch registration links below"
                       : "Direct registration link for your current branch and academic session"
                     }
                   </p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#00501B]" />
                    <span className="font-medium">Branch:</span>
                    <span>The Scholars' Home, {currentBranch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#00501B]" />
                    <span className="font-medium">Session:</span>
                    <span>{activeSessions.find(s => s.id === currentSessionId)?.name || "Current Session"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    value={generateRegistrationUrl(currentBranchId, currentSessionId)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(generateRegistrationUrl(currentBranchId, currentSessionId))}
                    className="shrink-0"
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(generateRegistrationUrl(currentBranchId, currentSessionId), '_blank')}
                    className="shrink-0"
                    title="Open link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendLink(
                      currentBranchId, 
                      currentSessionId, 
                      currentBranch?.name || 'Current Branch',
                      activeSessions.find(s => s.id === currentSessionId)?.name || "Current Session"
                    )}
                    className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Send via WhatsApp"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* All Branch & Session Combinations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {isHeadquarters ? "All Branch Registration Links" : `${currentBranch?.name || 'Branch'} Registration Links`}
              </h3>
              {!isHeadquarters && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Branch-specific view
                </div>
              )}
            </div>
                         <div className="space-y-4">
               {branches.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                   <p className="text-lg font-medium mb-2">No Registration Links Available</p>
                   <p className="text-sm">
                     {isHeadquarters 
                       ? "No operational branches are currently configured."
                       : "Please contact headquarters to set up registration links for your branch."
                     }
                   </p>
                 </div>
               ) : (
                 branches.map((branch) => (
                <div key={branch.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">The Scholars' Home, {branch.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {branch.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{branch.city}{branch.state && `, ${branch.state}`}</span>
                          </div>
                        )}
                        {branch.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{branch.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {branch.code}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#00501B]" />
                            <span className="font-medium text-sm">{session.name}</span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            value={generateRegistrationUrl(branch.id, session.id)}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(generateRegistrationUrl(branch.id, session.id))}
                            className="shrink-0"
                            title="Copy link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(generateRegistrationUrl(branch.id, session.id), '_blank')}
                            className="shrink-0"
                            title="Open link"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendLink(branch.id, session.id, branch.name, session.name)}
                            className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Send via WhatsApp"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                 ))
               )}
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How to Use Registration Links</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Copy and share links via email, SMS, or website</li>
              <li>• Each link is specific to a branch and academic session</li>
              <li>• Parents will see branch-specific contact details and information</li>
              <li>• All registrations will be automatically tagged with the correct branch and session</li>
              <li>• Links work on all devices - mobile, tablet, and desktop</li>
              {!isHeadquarters && (
                <li className="text-blue-700 font-medium">• You can only see registration links for your branch ({currentBranch?.name || 'current branch'})</li>
              )}
              {isHeadquarters && (
                <li className="text-blue-700 font-medium">• As headquarters, you can see registration links for all branches</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Admissions Settings</CardTitle>
          <CardDescription>
            Configure general admissions process settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Additional settings will be implemented here.</p>
        </CardContent>
      </Card>

      {/* Send Registration Link Modal */}
      {selectedLinkData && (
        <SendRegistrationLinkModal
          isOpen={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setSelectedLinkData(null);
          }}
          registrationUrl={selectedLinkData.registrationUrl}
          branchName={selectedLinkData.branchName}
          sessionName={selectedLinkData.sessionName}
          branchId={selectedLinkData.branchId}
          sessionId={selectedLinkData.sessionId}
        />
      )}
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicSettingsPageContent = dynamic(() => Promise.resolve(SettingsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function AdmissionsSettingsPage() {
  return <DynamicSettingsPageContent />;
}

 