"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, Phone, Mail, MapPin, Calendar, FileText, Clock } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useEffect } from "react";

export default function BranchSessionRegistrationSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const branchId = params?.branchId as string;
  const sessionId = params?.sessionId as string;
  const registrationId = searchParams?.get("registrationId");

  // Fetch branch details
  const { data: branch } = api.branch.getById.useQuery({
    id: branchId
  });

  // Fetch session details
  const { data: sessions } = api.academicSession.getAll.useQuery();
  const currentSession = sessions?.find(session => session.id === sessionId);

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
              {branch ? `The Scholars' Home, ${branch.name}` : "The Scholars' Home"}
            </h1>
            <p className="text-lg text-gray-600">
              Excellence in Education • Registration Confirmation
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm mb-8">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="h-20 w-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Registration Successful! 🎉
            </CardTitle>
            <p className="text-lg text-gray-600">
              Thank you for registering with {branch ? `The Scholars' Home, ${branch.name}` : "The Scholars' Home"}
            </p>
            {currentSession && (
              <p className="text-base text-gray-600 mt-2">
                Academic Session: <strong>{currentSession.name}</strong>
              </p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Registration Details */}
            {registrationId && (
              <div className="bg-gradient-to-r from-[#00501B]/10 to-[#007B2D]/10 rounded-lg p-6 border border-[#00501B]/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Registration Details</h3>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Your Registration ID</p>
                  <p className="text-2xl font-bold text-[#00501B] font-mono tracking-wider">
                    {registrationId}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Please save this ID for future reference
                  </p>
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 text-center">What Happens Next?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">We'll Contact You</h4>
                      <p className="text-sm text-gray-600">
                        Our admissions team will reach out within 24 hours to guide you through the next steps.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Schedule Campus Visit</h4>
                      <p className="text-sm text-gray-600">
                        We'll help you schedule a convenient time to visit our campus and meet our team.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Document Preparation</h4>
                      <p className="text-sm text-gray-600">
                        Prepare the required documents. We'll provide a detailed checklist during our call.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Assessment & Decision</h4>
                      <p className="text-sm text-gray-600">
                        Complete a simple assessment and receive your admission decision promptly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Need Immediate Assistance?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Call Us</h4>
                  <p className="text-sm text-gray-600 mb-2">Mon-Sat: 9 AM - 6 PM</p>
                                     <p className="font-medium text-[#00501B]">{branch?.phone || "+91 98765 43210"}</p>
                </div>

                <div className="text-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Email Us</h4>
                  <p className="text-sm text-gray-600 mb-2">Response within 2 hours</p>
                                     <p className="font-medium text-[#00501B]">{branch?.email || "admissions@thescholars.edu"}</p>
                </div>

                <div className="text-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Visit Campus</h4>
                  <p className="text-sm text-gray-600 mb-2">Schedule a tour</p>
                                     <div className="font-medium text-[#00501B]">
                     <p>{branch ? `${branch.name} Campus` : "Contact for location"}</p>
                     {branch?.address && (
                       <p className="text-sm mt-1">
                         {branch.address}
                         {(branch.city || branch.state) && (
                           <>, {branch.city}{branch.city && branch.state && ", "}{branch.state}</>
                         )}
                       </p>
                     )}
                   </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Return to Home
              </Button>
              <Button
                onClick={() => window.print()}
                size="lg"
                className="flex-1 bg-gradient-to-r from-[#00501B] to-[#007B2D] hover:from-[#007B2D] hover:to-[#00501B]"
              >
                Print Confirmation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-8 w-8 bg-gradient-to-br from-[#00501B] to-[#007B2D] rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">
                {branch ? `The Scholars' Home, ${branch.name}` : "The Scholars' Home"}
              </h3>
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