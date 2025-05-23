import { type Metadata } from "next"
import { AdmissionsDashboard } from "@/components/admissions/admissions-dashboard"

export const metadata: Metadata = {
  title: "Admissions Management",
  description: "Manage student admissions, applications, and enrollment",
}

export default function AdmissionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admissions Management</h2>
      </div>
      <AdmissionsDashboard />
    </div>
  )
} 