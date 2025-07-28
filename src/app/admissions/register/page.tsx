import { type Metadata } from "next"
import { RegistrationForm } from "@/components/admissions/registration-form"

export const metadata: Metadata = {
  title: "Student Registration",
  description: "Register your child for admission to our school",
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <RegistrationForm />
      </div>
    </div>
  )
} 