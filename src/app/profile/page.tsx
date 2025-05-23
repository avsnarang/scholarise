"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UploadCloud } from 'lucide-react'; // Icon for the button

export default function UserProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      // Set initial preview to user's current image or fallback
      setPreviewImage(user.imageUrl || null); 
    }
  }, [user]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsNameLoading(true);
    try {
      await user.update({
        firstName: firstName,
        lastName: lastName,
      });
      toast({
        title: "Success",
        description: "Your name has been updated.",
      });
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast({
        title: "Error updating name",
        description: error.errors?.[0]?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (!currentPassword || !newPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordLoading(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      toast({
        title: "Success",
        description: "Your password has been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error updating password",
        description: error.errors?.[0]?.message || "An unexpected error occurred. Make sure your current password is correct.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!user || !selectedFile) return;

    setIsImageLoading(true);
    try {
      await user.setProfileImage({ file: selectedFile });
      toast({
        title: "Success",
        description: "Profile picture updated.",
      });
      // Update previewImage with the new URL from Clerk after successful upload
      // This ensures the displayed image is the one stored by Clerk
      if (user.imageUrl) { // Check if imageUrl was updated
        setPreviewImage(user.imageUrl); 
      }
      setSelectedFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Error uploading image",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
       // Revert to the original image if upload fails
      setPreviewImage(user.imageUrl || null); 
    } finally {
      setIsImageLoading(false);
    }
  };

  if (!user) {
    // TODO: Add a proper loader component here
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details and profile picture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Upload Section */}
            <div className="space-y-4">
              <Label>Avatar</Label>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage src={previewImage || undefined} alt={user.fullName || "User"} />
                  <AvatarFallback className="text-2xl">
                    {user.firstName?.[0]?.toUpperCase() || ""}
                    {user.lastName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImageLoading}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Choose Picture
                  </Button>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="sr-only" // Hidden file input
                    ref={fileInputRef}
                    disabled={isImageLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 5MB.
                  </p>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">New: {selectedFile.name}</p>
                    <Button onClick={handleImageUpload} disabled={isImageLoading || !selectedFile} size="sm">
                      {isImageLoading ? "Uploading..." : "Upload & Save Picture"}
                    </Button>
                </div>
              )}
            </div>

            {/* Name Update Form */}
            <form onSubmit={handleNameUpdate} className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isNameLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isNameLoading}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isNameLoading}>
                {isNameLoading ? "Saving..." : "Save Name Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Password Management</CardTitle>
            <CardDescription>Change your account password. It's recommended to use a strong, unique password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isPasswordLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isPasswordLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isPasswordLoading}
                />
              </div>
              <Button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
