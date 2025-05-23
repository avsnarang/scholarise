"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PermissionsHelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 ml-2">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Help with permissions</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Understanding Role Permissions</AlertDialogTitle>
          <AlertDialogDescription>
            The permission system allows you to control what users can access and do in the system based on their role.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 mt-4">
          <h3 className="font-medium text-lg">Permission Types</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-20 text-blue-600 font-medium">View</div>
              <div>Allows users to see information but not modify it. This is the basic permission needed to access any module.</div>
            </div>
            <div className="flex items-center">
              <div className="w-20 text-green-600 font-medium">Create</div>
              <div>Allows users to add new records or items.</div>
            </div>
            <div className="flex items-center">
              <div className="w-20 text-amber-600 font-medium">Edit</div>
              <div>Allows users to modify existing records or items.</div>
            </div>
            <div className="flex items-center">
              <div className="w-20 text-red-600 font-medium">Delete</div>
              <div>Allows users to remove records or items.</div>
            </div>
            <div className="flex items-center">
              <div className="w-20 text-gray-700 font-medium">Manage</div>
              <div>Special permissions that provide additional functionality beyond basic CRUD operations.</div>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Module Permissions</h3>
          <p>Each module has its own set of permissions that control different aspects of functionality:</p>
          
          <div className="space-y-4 mt-2">
            <div className="border rounded-md p-4">
              <h4 className="font-medium text-[#00501B] mb-2">Classes Module</h4>
              <ul className="space-y-2 ml-6 list-disc">
                <li><span className="text-blue-600">View Classes</span>: See the list of classes and their details</li>
                <li><span className="text-green-600">Create Class</span>: Add new classes to the system</li>
                <li><span className="text-amber-600">Edit Class</span>: Modify existing class details</li>
                <li><span className="text-red-600">Delete Class</span>: Remove classes from the system</li>
                <li><span className="text-gray-700">Manage Class Students</span>: Assign/remove students from classes</li>
              </ul>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-medium text-[#00501B] mb-2">Students Module</h4>
              <ul className="space-y-2 ml-6 list-disc">
                <li><span className="text-blue-600">View Students</span>: See student records and information</li>
                <li><span className="text-green-600">Create Student</span>: Add new students to the system</li>
                <li><span className="text-amber-600">Edit Student</span>: Update existing student information</li>
                <li><span className="text-red-600">Delete Student</span>: Remove student records</li>
                <li><span className="text-gray-700">Manage Admissions</span>: Process student admissions</li>
                <li><span className="text-gray-700">Manage Transfer Certificates</span>: Handle student transfers</li>
              </ul>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-medium text-[#00501B] mb-2">UI Element Visibility</h4>
              <p className="mb-2">Permissions control what users can see and do in the interface:</p>
              <ul className="space-y-2 ml-6 list-disc">
                <li>Without <span className="text-blue-600">View</span> permission, users can't access the module at all</li>
                <li>Without <span className="text-green-600">Create</span> permission, "Add" buttons are hidden</li>
                <li>Without <span className="text-amber-600">Edit</span> permission, edit options are hidden from menus</li>
                <li>Without <span className="text-red-600">Delete</span> permission, delete options are hidden from menus</li>
              </ul>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Best Practices</h3>
          <ul className="space-y-2 ml-6 list-disc">
            <li>Start with pre-defined roles for common staff positions</li>
            <li>Create custom roles for specific responsibilities</li>
            <li>Always test new roles with a test user before assigning to staff</li>
            <li>Be cautious with delete permissions - only assign to trusted users</li>
            <li>Review role permissions periodically as system functionality evolves</li>
          </ul>
        </div>
        
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 