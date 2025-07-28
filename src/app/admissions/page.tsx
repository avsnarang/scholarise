import { type Metadata } from "next"
import { AdmissionsDashboard } from "@/components/admissions/admissions-dashboard"

export const metadata: Metadata = {
  title: "Admissions Dashboard",
  description: "Overview of admission inquiries, registrations, and analytics",
}

export default function AdmissionsDashboardPage() {
  return (
    <div className="flex-1">
      <AdmissionsDashboard />
    </div>
  )
} 