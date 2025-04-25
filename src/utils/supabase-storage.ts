import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file to Supabase Storage
 * @param file The file to upload
 * @param bucket The storage bucket
 * @param path The file path within the bucket
 */
export async function uploadFile(file: File, bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a public URL for a file
 * @param bucket The storage bucket
 * @param path The file path within the bucket
 */
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get a signed URL for a file (for private buckets)
 * @param bucket The storage bucket
 * @param path The file path within the bucket
 * @param expiresIn Expiration time in seconds (default: 3600)
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param bucket The storage bucket
 * @param path The file path within the bucket
 */
export async function deleteFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Generate a unique file path
 * @param userId The user ID
 * @param fileName The original file name
 * @param folder Optional folder path
 */
export function generateFilePath(userId: string, fileName: string, folder?: string) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = fileName.split('.').pop();
  
  const path = folder
    ? `${folder}/${userId}/${timestamp}-${randomString}.${extension}`
    : `${userId}/${timestamp}-${randomString}.${extension}`;
    
  return path;
}
