import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FileUploadProps {
  onUpload: (url: string, path: string) => void;
  bucket?: string;
  accept?: string;
  maxSize?: number; // in MB
  buttonText?: string;
  className?: string;
}

export function FileUpload({
  onUpload,
  bucket = "avatars",
  accept = "image/*",
  maxSize = 5, // 5MB default
  buttonText = "Upload File",
  className = "",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      setUploadProgress("Preparing file...");

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0]!;
      console.log(`📁 Selected file: ${file.name}, ${(file.size / 1024).toFixed(1)}KB`);

      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSize}MB.`);
      }

      setUploadProgress("Creating preview...");

      // Create a preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }

      setUploadProgress("Uploading to server...");

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);

      const uploadStartTime = Date.now();

      // Upload file
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include', // This ensures cookies are sent with the request
      });

      const uploadTime = Date.now() - uploadStartTime;
      console.log(`⏱️ Upload completed in ${uploadTime}ms`);
      
      setUploadProgress("Processing response...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      console.log('📦 Upload API response:', data);

      // Validate response structure
      if (!data.url || !data.path) {
        console.error('❌ Invalid upload response:', data);
        throw new Error('Upload API returned invalid response - missing URL or path');
      }

      console.log('✅ Calling onUpload with:', { url: data.url, path: data.path });

      // Call the onUpload callback with the file URL and path
      onUpload(data.url, data.path);

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      // Clear preview on error
      setPreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress || "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearPreview}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {preview && (
        <div className="relative mt-2 rounded-md border border-gray-200">
          <img
            src={preview}
            alt="Preview"
            className="max-h-40 rounded-md object-contain"
          />
        </div>
      )}
    </div>
  );
}
