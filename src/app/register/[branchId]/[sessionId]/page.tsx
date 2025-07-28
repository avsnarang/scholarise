"use client";

import { RegistrationForm } from "@/components/admissions/registration-form";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Phone, Mail, MapPin, Clock, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/utils/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function BranchSessionRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const branchId = params?.branchId as string;
  const sessionId = params?.sessionId as string;

  // Fetch branch details
  const { data: branch, isLoading: isBranchLoading, error: branchError } = api.branch.getById.useQuery({
    id: branchId
  });

  // Fetch session details
  const { data: sessions } = api.academicSession.getAll.useQuery();
  const currentSession = sessions?.find(session => session.id === sessionId);

  // Handle invalid branch or session
  useEffect(() => {
    if (branchError) {
      toast({
        title: "Invalid Branch",
        description: "The branch you're trying to access doesn't exist.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [branchError, router, toast]);

  useEffect(() => {
    if (sessions && !currentSession) {
      toast({
        title: "Invalid Academic Session",
        description: "The academic session you're trying to access doesn't exist.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [sessions, currentSession, router, toast]);

  if (isBranchLoading || !branch || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#00501B]" />
          <p className="text-gray-600">Loading registration page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  The Scholars' Home, {branch.name}
                </h1>
                <p className="text-sm text-gray-600">
                  Excellence in Education • Student Registration • {currentSession.name}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600">
              {branch?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#00501B]" />
                  <span className="font-medium">{branch.phone}</span>
                </div>
              )}
              {branch?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#00501B]" />
                  <span className="font-medium">{branch.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Hero Section */}
        <div className="bg-white/80 backdrop-blur-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Welcome to your Educational Journey
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-4">
                Begin your child's admission process at <strong>The Scholars' Home, {branch.name}</strong> for the <strong>{currentSession.name}</strong> academic session.
              </p>
              <p className="text-base text-gray-600 max-w-2xl mx-auto mb-8">
                Our team will guide you through every step of the journey.
              </p>
              
              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
                  <Clock className="h-8 w-8 text-[#00501B] mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Quick Process</h3>
                  <p className="text-sm text-gray-600">Complete in 5-10 minutes</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
                  <FileText className="h-8 w-8 text-[#00501B] mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Simple Form</h3>
                  <p className="text-sm text-gray-600">Easy to fill information</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
                  <CheckCircle2 className="h-8 w-8 text-[#00501B] mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Instant Confirmation</h3>
                  <p className="text-sm text-gray-600">Get registration ID immediately</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <RegistrationForm
            sessionData={currentSession}
            branchData={branch}
          />
        </div>

        {/* Information Section */}
        <div className="bg-white/80 backdrop-blur-sm border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Admission Process */}
              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-[#00501B]" />
                    Admission Process
                  </h3>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: "Submit Registration", desc: "Complete and submit this form" },
                      { step: 2, title: "School Contact", desc: "We'll contact you within 24 hours" },
                      { step: 3, title: "Schedule Visit", desc: "Tour our facilities and meet our team" },
                      { step: 4, title: "Assessment", desc: "Simple assessment for appropriate placement" },
                      { step: 5, title: "Admission Decision", desc: "Receive your admission status" }
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-[#00501B] to-[#007B2D] text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Documents Required */}
              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-[#00501B]" />
                    Documents Required
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Birth Certificate",
                      "Previous School Transfer Certificate",
                      "Previous Academic Records",
                      "Passport Size Photographs",
                      "Aadhar Card (Student & Parents)",
                      "Address Proof"
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-[#00501B] rounded-full"></div>
                        <span className="text-gray-700">{doc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Documents can be submitted during the school visit. 
                      You don't need them to complete this registration.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Phone className="h-6 w-6 text-[#00501B]" />
                    Need Help?
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                                          <div>
                      <p className="font-semibold text-gray-900">Call Us</p>
                      <p className="text-gray-700 font-medium">{branch?.phone || "+91 98765 43210"}</p>
                      <p className="text-sm text-gray-600">Mon-Sat: 9 AM - 6 PM</p>
                    </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                                          <div>
                      <p className="font-semibold text-gray-900">Email Us</p>
                      <p className="text-gray-700 font-medium">{branch?.email || "admissions@thescholars.edu"}</p>
                      <p className="text-sm text-gray-600">Response within 2 hours</p>
                    </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                                          <div>
                      <p className="font-semibold text-gray-900">Visit Us</p>
                      <p className="text-gray-700">{branch.name} Campus</p>
                      {branch?.address ? (
                        <div className="text-gray-700">
                          <p>{branch.address}</p>
                          {(branch.city || branch.state) && (
                            <p>
                              {branch.city}{branch.city && branch.state && ", "}{branch.state}
                              {branch.country && ` - ${branch.country}`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-700">Contact us for address details</p>
                      )}
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-8 w-8 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">The Scholars' Home, {branch.name}</h3>
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