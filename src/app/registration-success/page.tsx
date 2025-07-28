"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, GraduationCap, Phone, Mail, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

function RegistrationSuccessContent() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("id");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success Card */}
        <Card className="text-center shadow-lg">
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h1>
            
            <p className="text-lg text-gray-600 mb-6">
              Thank you for registering with ScholaRise. Your application has been received successfully.
            </p>
            
            {registrationId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium">
                  Your Registration ID: <span className="font-mono font-bold">{registrationId}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Please save this ID for future reference
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#00501B]" />
              What Happens Next?
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-[#00501B] text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">We'll Contact You</h3>
                  <p className="text-sm text-gray-600">
                    Our admissions team will contact you within 24 hours to confirm your registration 
                    and schedule your school visit.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-[#00501B] text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">School Visit</h3>
                  <p className="text-sm text-gray-600">
                    Visit our campus to tour the facilities, meet our educators, and learn more 
                    about our programs.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-[#00501B] text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Assessment & Interview</h3>
                  <p className="text-sm text-gray-600">
                    A simple assessment to understand your child's learning level and ensure 
                    appropriate placement.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-[#00501B] text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Admission Decision</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive our admission decision within 3-5 working days after the assessment.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Have Questions?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#00501B]" />
                <div>
                  <p className="font-medium text-gray-900">Call Us</p>
                  <p className="text-sm text-gray-600">+91 98765 43210</p>
                  <p className="text-xs text-gray-500">Mon-Fri: 9 AM - 5 PM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#00501B]" />
                <div>
                  <p className="font-medium text-gray-900">Email Us</p>
                  <p className="text-sm text-gray-600">admissions@scholarise.edu</p>
                  <p className="text-xs text-gray-500">We reply within 2 hours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <GraduationCap className="mr-2 h-4 w-4" />
              Back to Homepage
            </Link>
          </Button>
          
          <Button asChild size="lg" className="bg-[#00501B] hover:bg-[#00501B]/90">
            <Link href="/register">
              Register Another Student
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Footer Message */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Thank you for choosing ScholaRise. We look forward to welcoming your child to our school community!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full space-y-6">
            <Card className="text-center shadow-lg">
              <CardContent className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Loading...
                </h1>
                <p className="text-lg text-gray-600">
                  Please wait while we load your registration details.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <RegistrationSuccessContent />
    </Suspense>
  );
} 