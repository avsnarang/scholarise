"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Phone, Mail, MapPin, Loader2, ArrowRight, CheckCircle2, Calendar } from "lucide-react";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BranchSessionSelectionPage() {
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");

  // Fetch branches (excluding headquarters)
  const { data: allBranches, isLoading: isBranchesLoading } = api.branch.getAll.useQuery();
  const branches = allBranches?.filter(branch => branch.id !== 'headquarters' && branch.code !== 'HQ');
  
  // Fetch academic sessions (only active ones)
  const { data: allSessions, isLoading: isSessionsLoading } = api.academicSession.getAll.useQuery();
  const sessions = allSessions?.filter(session => session.isActive);

  const handleProceed = () => {
    if (selectedBranch && selectedSession) {
      router.push(`/register/${selectedBranch}/${selectedSession}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-16 w-16 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
              The Scholars' Home
            </h1>
            <p className="text-lg text-gray-600">
              Excellence in Education • Student Admission Registration
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Select your Campus & Academic Session
            </CardTitle>
            <p className="text-lg text-gray-600">
              Choose your preferred campus and academic session to begin the registration process
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Branch Selection */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Your Campus</h3>
                <p className="text-gray-600">Choose from our campuses across different locations</p>
              </div>
              
              {isBranchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
                  <span className="ml-3 text-gray-600 text-lg">Loading campuses...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches?.map((branch) => (
                    <div
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch.id)}
                      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                        selectedBranch === branch.id
                          ? 'border-[#00501B] bg-gradient-to-r from-[#00501B]/5 to-[#007B2D]/5 shadow-md'
                          : 'border-gray-200 hover:border-[#00501B]/50'
                      }`}
                    >
                      {selectedBranch === branch.id && (
                        <div className="absolute top-4 right-4">
                          <div className="h-6 w-6 bg-[#00501B] rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">The Scholars' Home</h4>
                            <p className="text-[#00501B] font-medium">{branch.name}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          {branch.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#00501B]" />
                              <span>{branch.city}{branch.state && `, ${branch.state}`}</span>
                            </div>
                          )}
                          {branch.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[#00501B]" />
                              <span>{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-[#00501B]" />
                              <span>{branch.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session Selection */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Academic Session</h3>
                <p className="text-gray-600">Choose the academic year for your admission</p>
              </div>
              
              {isSessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
                  <span className="ml-3 text-gray-600 text-lg">Loading academic sessions...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${
                        selectedSession === session.id
                          ? 'border-[#00501B] bg-gradient-to-r from-[#00501B]/5 to-[#007B2D]/5 shadow-sm'
                          : 'border-gray-200 hover:border-[#00501B]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">{session.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-green-600 font-medium">Active Academic Session</span>
                            </div>
                            {session.startDate && session.endDate && (
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {selectedSession === session.id && (
                          <div className="h-6 w-6 bg-[#00501B] rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proceed Button */}
            <div className="pt-6">
              <Button
                onClick={handleProceed}
                disabled={!selectedBranch || !selectedSession}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-[#00501B] to-[#007B2D] hover:from-[#007B2D] hover:to-[#00501B] transition-all duration-300"
              >
                {!selectedBranch || !selectedSession ? (
                  "Please select campus and session"
                ) : (
                  <>
                    Proceed to Registration
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white/60 backdrop-blur-sm border-0">
            <CardContent className="p-6 text-center">
              <Phone className="h-12 w-12 text-[#00501B] mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-3">Call us for assistance</p>
              <p className="font-medium text-gray-900">+91 98765 43210</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-0">
            <CardContent className="p-6 text-center">
              <Mail className="h-12 w-12 text-[#00501B] mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 mb-3">Get support via email</p>
              <p className="font-medium text-gray-900">admissions@thescholars.edu</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-0">
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 text-[#00501B] mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Visit Campus</h3>
              <p className="text-sm text-gray-600 mb-3">Schedule a campus tour</p>
              <p className="font-medium text-gray-900">Multiple Locations</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-8 w-8 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">The Scholars' Home</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Empowering minds, shaping futures through quality education and holistic development.
            </p>
            <p className="text-sm text-gray-400">
              © 2025 The Scholars' Home Educational Institution. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 