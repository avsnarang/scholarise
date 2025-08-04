"use client";

import { RegistrationForm } from "@/components/admissions/registration-form";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Phone, Mail, MapPin, Clock, FileText, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center dark:bg-[#101010]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#00501B] dark:text-white" />
          <p className="text-gray-600 dark:text-white">Loading registration page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#A65A2008] dark:bg-[#202020]">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-white/95 shadow-sm backdrop-blur-sm dark:bg-[#101010]">
        <div className="mx-auto max-w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              {branch.logoUrl ? (
                <Image
                  src={branch.logoUrl}
                  alt={`The Scholars' Home ${branch.name} Logo`}
                  width={48}
                  height={48}
                  className="object-contain"
                  onError={(e) => {
                    // Fallback to static logo if branch logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = "/mobile_logo.png";
                  }}
                />
              ) : (
                <Image
                  src="/mobile_logo.png"
                  alt="The Scholars' Home Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                  The Scholars' Home, {branch.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-white">
                  Shaping the Future • Student Registration •{" "}
                  {currentSession.name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 sm:gap-6 dark:text-white">
              {branch?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#00501B] dark:text-white" />
                  <span className="font-medium">{branch.phone}</span>
                </div>
              )}
              {branch?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#00501B] dark:text-white" />
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
        <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-[#101010]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
                Welcome to your Educational Journey
              </h2>
              <p className="mx-auto mb-4 max-w-3xl text-lg text-gray-600 sm:text-xl dark:text-white">
                Begin your child's admission process at{" "}
                <strong>The Scholars' Home, {branch.name}</strong> for the
                academic session <strong>{currentSession.name}</strong>.
              </p>
              <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 dark:text-white">
                Our team will guide you through every step of the journey.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Form Section */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <RegistrationForm sessionData={currentSession} branchData={branch} />
        </div>

        {/* Information Section */}
        <div className="border-t bg-white/80 backdrop-blur-sm dark:bg-[#101010]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Admission Process */}
              <Card className="bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
                <CardContent className="p-6">
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-6 w-6 text-[#00501B] dark:text-white" />
                    Admission Process
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: "Submit Registration",
                        desc: "Complete and submit this form",
                      },
                      {
                        step: 2,
                        title: "School Contact",
                        desc: "We'll contact you within 24-48 hours",
                      },
                      {
                        step: 3,
                        title: "Schedule Visit",
                        desc: "Tour our facilities and meet our team",
                      },
                      {
                        step: 4,
                        title: "Assessment",
                        desc: "Simple assessment for appropriate placement",
                      },
                      {
                        step: 5,
                        title: "Admission Decision",
                        desc: "Receive your admission status",
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00501B] to-[#007B2D] text-sm font-bold text-white shadow-sm dark:bg-gradient-to-br dark:from-white dark:to-gray-200 dark:text-gray-900">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-white">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Documents Required */}
              <Card className="bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
                <CardContent className="p-6">
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                    <FileText className="h-6 w-6 text-[#00501B] dark:text-white" />
                    Documents Required
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Birth Certificate",
                      "Previous School Transfer Certificate",
                      "Previous Academic Records",
                      "Passport Size Photographs",
                      "Aadhar Card (Student & Parents)",
                      "Address Proof",
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-[#00501B] dark:bg-white"></div>
                        <span className="text-gray-700 dark:text-white">{doc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Documents can be submitted during
                      the school visit. You don't need them to complete this
                      registration.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
                <CardContent className="p-6">
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                    <Phone className="h-6 w-6 text-[#00501B] dark:text-white" />
                    Need Help?
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00501B] to-[#007B2D]">
                        <Phone className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Call Us</p>
                        <p className="font-medium text-gray-700 dark:text-white">
                          {branch?.phone || "+91 98765 43210"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-white">
                          Mon-Sat: 8 AM - 3 PM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00501B] to-[#007B2D]">
                        <Mail className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Email Us</p>
                        <p className="font-medium text-gray-700 dark:text-white">
                          {branch?.email || "admissions@thescholars.edu"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-white">
                          Response within 2-4 hours
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00501B] to-[#007B2D]">
                        <MapPin className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Visit Us</p>
                        <p className="text-gray-700 dark:text-white">
                          The Scholars' Home, {branch.name}
                        </p>
                        {branch?.address ? (
                          <div className="text-gray-700 dark:text-white">
                            <p>{branch.address}</p>
                            {(branch.city || branch.state) && (
                              <p>
                                {branch.city}
                                {branch.city && branch.state && ", "}
                                {branch.state}
                                {branch.country && ` - ${branch.country}`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-700 dark:text-white">
                            Contact us for address details
                          </p>
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
      <div className="bg-white text-white dark:bg-[#050505]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              {branch.logoUrl ? (
                <Image
                  src={branch.logoUrl}
                  alt={`The Scholars' Home ${branch.name} Logo`}
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    // Fallback to static logo if branch logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = "/mobile_logo.png";
                  }}
                />
              ) : (
                <Image
                  src="/mobile_logo.png"
                  alt="The Scholars' Home Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                The Scholars' Home, {branch.name}
              </h3>
            </div>
            <p className="mb-4 text-gray-600 dark:text-white">
              Empowering minds, shaping futures through quality education and
              holistic development.
            </p>
            <p className="text-sm text-gray-400 dark:text-white">
              © 2025 The Scholars' Home, {branch.name} | Educational
              Institution. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 