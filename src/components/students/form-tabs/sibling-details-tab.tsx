import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import type { StudentFormValues } from "../enhanced-student-form";
import { api } from "@/utils/api";
import { Search } from "lucide-react";

export function SiblingDetailsTab() {
  const { control, setValue } = useFormContext<StudentFormValues>();
  const [siblingInfo, setSiblingInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Get sibling admission number
  const siblingAdmissionNumber = useFormContext<StudentFormValues>().watch("siblingAdmissionNumber");

  // API query to search for sibling
  const { data: students } = api.student.getAll.useQuery({}, {
    enabled: false, // Don't fetch on component mount
  });

  // Function to search for sibling
  const searchSibling = async () => {
    if (!siblingAdmissionNumber) return;

    setIsSearching(true);
    try {
      // In a real implementation, you would use a specific API endpoint to search by admission number
      // For now, we'll simulate this by filtering the students data
      if (students?.items) {
        const sibling = students.items.find(
          (student: any) => student.admissionNumber === siblingAdmissionNumber
        );

        if (sibling) {
          setSiblingInfo({
            name: `${sibling.firstName} ${sibling.lastName}`,
            class: sibling.section?.class?.name || "Unknown",
            section: sibling.section?.name || "",
            admissionNumber: sibling.admissionNumber,
          });
        } else {
          setSiblingInfo(null);
        }
      }
    } catch (error) {
      console.error("Error searching for sibling:", error);
      setSiblingInfo(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-medium text-[#00501B] dark:text-[#7aad8c]">Sibling Details</h3>

      <div className="space-y-6">
        <div className="flex items-end gap-4">
          <FormField
            control={control}
            name="siblingAdmissionNumber"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="dark:text-[#e6e6e6]">Sibling's Admission Number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Enter sibling's admission number" className="dark:border-[#303030] dark:bg-[#252525] dark:text-[#e6e6e6] dark:placeholder:text-[#808080]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            onClick={searchSibling}
            disabled={!siblingAdmissionNumber || isSearching}
            className="mb-[2px] bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 gap-2"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </>
            ) : (
              <>
                Search
                <Search className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {siblingInfo && (
          <div className="rounded-md border border-[#E7F5E8] dark:border-[#7aad8c]/30 bg-[#F9FCFA] dark:bg-[#7aad8c]/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 6.15288 4.98124 7.54738 6.49373 7.98351C5.2997 8.12901 4.27557 8.55134 3.50407 9.31167C2.52216 10.2794 2.02502 11.72 2.02502 13.5999C2.02502 13.8623 2.23769 14.0749 2.50002 14.0749C2.76236 14.0749 2.97502 13.8623 2.97502 13.5999C2.97502 11.8799 3.42786 10.7206 4.17091 9.9883C4.91536 9.25463 6.02674 8.87499 7.49995 8.87499C8.97317 8.87499 10.0846 9.25463 10.8291 9.98831C11.5721 10.7206 12.025 11.8799 12.025 13.5999C12.025 13.8623 12.2376 14.0749 12.5 14.0749C12.7623 14.075 12.975 13.8623 12.975 13.6C12.975 11.72 12.4779 10.2794 11.496 9.31166C10.7245 8.55135 9.70025 8.12903 8.50625 7.98352C10.0187 7.5474 11.125 6.15289 11.125 4.5C11.125 2.49797 9.50203 0.875 7.5 0.875ZM4.825 4.5C4.825 3.02264 6.02264 1.825 7.5 1.825C8.97736 1.825 10.175 3.02264 10.175 4.5C10.175 5.97736 8.97736 7.175 7.5 7.175C6.02264 7.175 4.825 5.97736 4.825 4.5Z" fill="currentColor" className="text-[#00501B] dark:text-[#7aad8c]" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </div>
              <h4 className="font-medium text-[#00501B] dark:text-[#7aad8c]">Sibling Information</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md bg-white dark:bg-[#303030] p-3 border border-gray-100 dark:border-[#404040]">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium mt-1 dark:text-[#e6e6e6]">{siblingInfo.name}</p>
              </div>
              <div className="rounded-md bg-white dark:bg-[#303030] p-3 border border-gray-100 dark:border-[#404040]">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Class</p>
                <p className="font-medium mt-1 dark:text-[#e6e6e6]">{siblingInfo.class} {siblingInfo.section}</p>
              </div>
              <div className="rounded-md bg-white dark:bg-[#303030] p-3 border border-gray-100 dark:border-[#404040]">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Admission Number</p>
                <p className="font-medium mt-1 dark:text-[#e6e6e6]">{siblingInfo.admissionNumber}</p>
              </div>
            </div>
          </div>
        )}

        {siblingAdmissionNumber && !siblingInfo && !isSearching && (
          <div className="rounded-md border border-amber-200 dark:border-[#e2bd8c]/30 p-4 bg-amber-50 dark:bg-[#e2bd8c]/10">
            <div className="flex gap-2">
              <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.55509 0.608766L0.161178 11.3368C-0.275824 12.07 0.252503 13 1.10608 13H13.8939C14.7475 13 15.2758 12.07 14.8388 11.3368L8.4449 0.608765ZM7.4141 1.12073C7.45288 1.05566 7.54712 1.05566 7.5859 1.12073L13.9798 11.8488C14.0196 11.9154 13.9715 12 13.8939 12H1.10608C1.02849 12 0.980454 11.9154 1.02018 11.8488L7.4141 1.12073ZM6.8269 4.48611C6.81221 4.10423 7.11783 3.78663 7.5 3.78663C7.88217 3.78663 8.18778 4.10423 8.1731 4.48612L8.01921 8.48701C8.00848 8.766 7.7792 8.98664 7.5 8.98664C7.2208 8.98664 6.99151 8.766 6.98078 8.48701L6.8269 4.48611ZM8.24989 10.476C8.24989 10.8902 7.9141 11.226 7.49989 11.226C7.08567 11.226 6.74989 10.8902 6.74989 10.476C6.74989 10.0618 7.08567 9.72599 7.49989 9.72599C7.9141 9.72599 8.24989 10.0618 8.24989 10.476Z" fill="currentColor" className="text-amber-800 dark:text-[#e2bd8c]" fillRule="evenodd" clipRule="evenodd"></path></svg>
              <div>
                <p className="font-medium text-amber-800 dark:text-[#e2bd8c]">No sibling found</p>
                <p className="text-amber-700 dark:text-[#e2bd8c]/80 text-sm">No student with the provided admission number was found in the system.</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border border-[#E7F5E8] dark:border-[#7aad8c]/30 p-4 bg-[#F9FCFA] dark:bg-[#7aad8c]/10">
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM7.50003 4.49997C7.77617 4.49997 8.00003 4.27611 8.00003 3.99997C8.00003 3.72383 7.77617 3.49997 7.50003 3.49997C7.22389 3.49997 7.00003 3.72383 7.00003 3.99997C7.00003 4.27611 7.22389 4.49997 7.50003 4.49997ZM6.74373 5.79834C6.74373 6.1268 7.00834 6.39141 7.3368 6.39141H7.66756C7.99602 6.39141 8.26063 6.1268 8.26063 5.79834C8.26063 5.46988 7.99602 5.20527 7.66756 5.20527H7.3368C7.00834 5.20527 6.74373 5.46988 6.74373 5.79834ZM6.42498 8.90377C6.42498 9.56143 6.95717 10.0936 7.61483 10.0936C8.27249 10.0936 8.80468 9.56143 8.80468 8.90377C8.80468 8.24611 8.27249 7.71392 7.61483 7.71392C6.95717 7.71392 6.42498 8.24611 6.42498 8.90377Z" fill="currentColor" className="text-[#00501B] dark:text-[#7aad8c]" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </div>
            <div>
              <p className="font-medium text-[#00501B] dark:text-[#7aad8c]">Why add sibling information?</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Adding sibling information helps us link family members in our system.
                This enables better communication and coordination for families with multiple children in the school.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
