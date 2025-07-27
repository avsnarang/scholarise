"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileIcon, Image, Video, Music, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  validateWhatsAppMedia, 
  uploadWhatsAppMedia, 
  type MediaUploadResult,
  type WhatsAppMediaType 
} from "@/utils/whatsapp-media";

interface WhatsAppMediaUploadProps {
  onUploadComplete?: (files: MediaUploadResult[]) => void;
  maxFiles?: number;
  acceptedTypes?: WhatsAppMediaType[];
  className?: string;
}

export function WhatsAppMediaUpload({
  onUploadComplete,
  maxFiles = 5,
  acceptedTypes = ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"],
  className = "",
}: WhatsAppMediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptString = () => {
    const mimeTypes: string[] = [];
    
    if (acceptedTypes.includes("IMAGE")) {
      mimeTypes.push("image/*");
    }
    if (acceptedTypes.includes("VIDEO")) {
      mimeTypes.push("video/*");
    }
    if (acceptedTypes.includes("AUDIO")) {
      mimeTypes.push("audio/*");
    }
    if (acceptedTypes.includes("DOCUMENT")) {
      mimeTypes.push(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx");
    }
    
    return mimeTypes.join(",");
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (file.type.startsWith("video/")) return <Video className="w-4 h-4" />;
    if (file.type.startsWith("audio/")) return <Music className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed`]);
      return;
    }

    // Validate files
    const errors: string[] = [];
    const validFiles: File[] = [];

    selectedFiles.forEach(file => {
      const validation = validateWhatsAppMedia(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(", ")}`);
      }
    });

    setValidationErrors(errors);
    setFiles(prev => [...prev, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({});
    
    try {
      const uploadResults: MediaUploadResult[] = [];

      for (const file of files) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        try {
          const result = await uploadWhatsAppMedia(file, "system"); // You may want to pass actual user ID
          uploadResults.push(result);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          setValidationErrors(prev => [...prev, `Failed to upload ${file.name}`]);
        }
      }

      if (uploadResults.length > 0 && onUploadComplete) {
        onUploadComplete(uploadResults);
        setFiles([]);
        setUploadProgress({});
      }
    } catch (error) {
      console.error("Upload error:", error);
      setValidationErrors(["Upload failed. Please try again."]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            
            <div>
              <h3 className="font-medium">Upload WhatsApp Media</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select images, videos, audio, or documents
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum {maxFiles} files • Images: 5MB • Videos: 16MB • Audio: 16MB • Documents: 100MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptString()}
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || files.length >= maxFiles}
            >
              <Upload className="w-4 h-4 mr-2" />
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Selected Files ({files.length})</h4>
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              size="sm"
            >
              {uploading ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {uploadProgress[file.name] !== undefined && (
                      <div className="w-20">
                        <Progress value={uploadProgress[file.name]} className="h-2" />
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 