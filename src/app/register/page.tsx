"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Phone, Mail, MapPin, Loader2, ArrowRight, CheckCircle2, Calendar } from "lucide-react";
import Image from "next/image";
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
    <div className="min-h-screen bg-white dark:bg-[#181818]">
      {/* Header */}
      <div className="border-b bg-white/95 shadow-sm backdrop-blur-sm dark:bg-[#101010]">
        <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Image
                src="/mobile_logo.png"
                alt="The Scholars' Home Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              The Scholars' Home
            </h1>
            <p className="text-lg text-gray-600 dark:text-white">
              Shaping the Future • Student Admission Registration
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-[#252525]">
          <CardHeader className="pb-8 text-center">
            <CardTitle className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
              Select your Campus & Academic Session
            </CardTitle>
            <p className="text-lg text-gray-600 dark:text-white">
              Choose your preferred campus and academic session to begin the
              registration process
            </p>
          </CardHeader>

          <CardContent className="space-y-8 dark:bg-[#252525]">
            {/* Branch Selection */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  Select Your Campus
                </h3>
                <p className="text-gray-600 dark:text-white">
                  Choose from our campuses across different locations
                </p>
              </div>

              {isBranchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-white" />
                  <span className="ml-3 text-lg text-gray-600 dark:text-white">
                    Loading campuses...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {branches?.map((branch) => (
                    <div
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch.id)}
                      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg dark:border-[#606060] ${
                        selectedBranch === branch.id
                          ? "border-[#00501B] bg-[#00501B]/5 shadow-md dark:border-[#909090] dark:bg-[#353535]"
                          : "border-gray-200 hover:border-[#00501B]/50 dark:border-[#101010] dark:hover:border-[#909090]"
                      }`}
                    >
                      {selectedBranch === branch.id && (
                        <div className="absolute top-4 right-4">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00501B] dark:border-2 dark:border-[#909090] dark:bg-[#202020]">
                            <CheckCircle2 className="h-4 w-4 text-white dark:text-white" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={branch.logoUrl || "/mobile_logo.png"}
                            alt={`The Scholars' Home ${branch.name} Logo`}
                            width={45}
                            height={45}
                            className="object-contain"
                            onError={(e) => {
                              // Fallback to static logo if branch logo fails to load
                              const target = e.target as HTMLImageElement;
                              target.src = "/mobile_logo.png";
                            }}
                          />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              The Scholars' Home
                            </h4>
                            <p className="font-medium text-[#00501B] dark:text-white">
                              {branch.name}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-white">
                          {branch.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#00501B] dark:text-white" />
                              <span>
                                {branch.city}
                                {branch.state && `, ${branch.state}`}
                              </span>
                            </div>
                          )}
                          {branch.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[#00501B] dark:text-white" />
                              <span>{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-[#00501B] dark:text-white" />
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
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  Select Academic Session
                </h3>
                <p className="text-gray-600 dark:text-white">
                  Choose the academic year for your admission
                </p>
              </div>

              {isSessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-white" />
                  <span className="ml-3 text-lg text-gray-600 dark:text-white">
                    Loading academic sessions...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-300 hover:shadow-md dark:border-[#606060] ${
                        selectedSession === session.id
                          ? "border-[#00501B] bg-[#00501B]/5 dark:border-[#909090] dark:bg-[#353535]"
                          : "border-gray-200 hover:border-[#00501B]/50 dark:border-[#101010] dark:hover:border-[#909090]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                            <Calendar className="h-6 w-6 text-white dark:text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {session.name}
                            </h4>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-500"></div>
                              <span className="text-sm font-medium text-green-600 dark:text-white">
                                Active Academic Session
                              </span>
                            </div>
                            {session.startDate && session.endDate && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-white">
                                {new Date(
                                  session.startDate,
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(session.endDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {selectedSession === session.id && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00501B] dark:bg-[#101010]">
                            <CheckCircle2 className="h-4 w-4 text-white dark:text-white" />
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
                variant="default"
                onClick={handleProceed}
                disabled={!selectedBranch || !selectedSession}
                size="lg"
                className="h-14 w-full text-lg transition-all duration-300"
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
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-0 bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
            <CardContent className="p-6 text-center">
              <Phone className="mx-auto mb-4 h-12 w-12 text-[#00501B] dark:text-white" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Need Help?
              </h3>
              <p className="mb-3 text-sm text-gray-600 dark:text-white">
                Call us for assistance
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                +91 86288 00056
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
            <CardContent className="p-6 text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 text-[#00501B] dark:text-white" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Email Support
              </h3>
              <p className="mb-3 text-sm text-gray-600 dark:text-white">
                Get support via email
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                admissions@tsh.edu.in
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 backdrop-blur-sm dark:bg-[#101010]">
            <CardContent className="p-6 text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-[#00501B] dark:text-white" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Visit Campus
              </h3>
              <p className="mb-3 text-sm text-gray-600 dark:text-white">
                Schedule a campus tour
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                Multiple Locations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 bg-white text-white dark:bg-[#101010]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Image
                src="/mobile_logo.png"
                alt="The Scholars' Home Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                The Scholars' Home
              </h3>
            </div>
            <p className="mb-4 text-gray-600 dark:text-white">
              Empowering minds, shaping futures through quality education and
              holistic development.
            </p>
            <p className="text-sm text-gray-600 dark:text-white">
              © 2025 The Scholars' Home | Educational Institution. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 