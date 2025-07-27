"use client";

import { useState } from 'react';
import { uploadFile, getPublicUrl } from './supabase-storage';

// WhatsApp Media Types
export type WhatsAppMediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';

// WhatsApp Media Limits
export const WHATSAPP_MEDIA_LIMITS = {
  IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
  },
  VIDEO: {
    maxSize: 16 * 1024 * 1024, // 16MB
    supportedFormats: ['video/mp4', 'video/3gpp', 'video/quicktime'] as const,
  },
  AUDIO: {
    maxSize: 16 * 1024 * 1024, // 16MB
    supportedFormats: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'] as const,
  },
  DOCUMENT: {
    maxSize: 100 * 1024 * 1024, // 100MB
    supportedFormats: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ] as const,
  },
} as const;

// Media Upload Result
export interface MediaUploadResult {
  id: string;
  type: WhatsAppMediaType;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  supabasePath: string;
  bucket: string;
}

// Media Validation Result
export interface MediaValidationResult {
  isValid: boolean;
  errors: string[];
  type?: WhatsAppMediaType;
}

// Determine media type from MIME type
function getMediaType(mimeType: string): WhatsAppMediaType | null {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'DOCUMENT';
  return null;
}

// Validate WhatsApp Media
export function validateWhatsAppMedia(file: File): MediaValidationResult {
  const errors: string[] = [];
  const mediaType = getMediaType(file.type);

  if (!mediaType) {
    errors.push('Unsupported file type');
    return { isValid: false, errors };
  }

  const limits = WHATSAPP_MEDIA_LIMITS[mediaType];

  // Check file size
  if (file.size > limits.maxSize) {
    const maxSizeMB = Math.round(limits.maxSize / (1024 * 1024));
    errors.push(`File too large. Maximum size for ${mediaType}: ${maxSizeMB}MB`);
  }

  // Check file format
  const supportedFormats = limits.supportedFormats as readonly string[];
  if (!supportedFormats.includes(file.type)) {
    errors.push(`Unsupported format for ${mediaType}. Supported: ${supportedFormats.join(', ')}`);
  }

  // Additional validations
  if (mediaType === 'IMAGE') {
    // Additional image validations can be added here
  } else if (mediaType === 'VIDEO') {
    // Additional video validations can be added here
  }

  return {
    isValid: errors.length === 0,
    errors,
    type: mediaType,
  };
}

// Upload WhatsApp Media to Supabase
export async function uploadWhatsAppMedia(
  file: File,
  userId: string,
  folder = 'whatsapp-media'
): Promise<MediaUploadResult> {
  // Validate file first
  const validation = validateWhatsAppMedia(file);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || '';
    const filename = `${folder}/${userId}/${timestamp}-${crypto.randomUUID()}.${extension}`;

    // Upload to Supabase
    const uploadResult = await uploadFile(file, filename, 'whatsapp-media');
    const url = typeof uploadResult === 'string' ? uploadResult : uploadResult.fullPath;

    return {
      id: crypto.randomUUID(),
      type: validation.type!,
      url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      supabasePath: typeof uploadResult === 'string' ? filename : uploadResult.path,
      bucket: 'whatsapp-media',
    };
  } catch (error) {
    console.error('Media upload failed:', error);
    throw new Error('Failed to upload media file');
  }
}

// Generate thumbnail for video files (placeholder - would need actual implementation)
export async function generateThumbnail(file: File): Promise<string | null> {
  if (!file.type.startsWith('video/')) {
    return null;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = 1; // Seek to 1 second
    };

    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      } else {
        resolve(null);
      }
    };

    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

// React Hook for WhatsApp Media Upload
export function useWhatsAppMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadMultipleFiles = async (
    files: File[],
    userId: string,
    onProgress?: (filename: string, progress: number) => void
  ): Promise<MediaUploadResult[]> => {
    setUploading(true);
    const results: MediaUploadResult[] = [];

    try {
      for (const file of files) {
        if (!file) continue;
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const result = await uploadWhatsAppMedia(file, userId);
        results.push(result);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        if (onProgress) {
          onProgress(file.name, 100);
        }
      }

      return results;
    } catch (error) {
      console.error('Batch upload failed:', error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  return {
    uploading,
    uploadProgress,
    uploadMultipleFiles,
  };
}

// Delete WhatsApp Media (placeholder - implement based on your storage setup)
export async function deleteWhatsAppMedia(path: string, bucket = 'whatsapp-media'): Promise<void> {
  // Implement deletion logic based on your Supabase storage setup
  console.log(`Delete media: ${path} from bucket: ${bucket}`);
  // This is a placeholder - implement actual deletion
} 