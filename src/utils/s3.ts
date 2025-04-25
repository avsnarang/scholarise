import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file to S3
 * @param file The file buffer to upload
 * @param key The S3 object key (path)
 * @param contentType The file's content type
 */
export async function uploadFile(file: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    Body: file,
    ContentType: contentType,
  });
  
  return s3Client.send(command);
}

/**
 * Get a signed URL for an S3 object
 * @param key The S3 object key (path)
 * @param expiresIn Expiration time in seconds (default: 3600)
 */
export async function getSignedFileUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3
 * @param key The S3 object key (path)
 */
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });
  
  return s3Client.send(command);
}

/**
 * Generate a unique file key for S3
 * @param userId The user ID
 * @param fileName The original file name
 * @param folder Optional folder path
 */
export function generateFileKey(userId: string, fileName: string, folder?: string) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = fileName.split('.').pop();
  
  const key = folder
    ? `${folder}/${userId}/${timestamp}-${randomString}.${extension}`
    : `${userId}/${timestamp}-${randomString}.${extension}`;
    
  return key;
}
