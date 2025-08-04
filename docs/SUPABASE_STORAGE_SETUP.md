# Supabase Storage Setup Guide

This guide explains how to set up and manage Supabase Storage buckets for the ScholaRise application.

## 📦 Storage Buckets

The application uses the following storage buckets:

### 1. `avatars` (Public)
- **Purpose**: User profile pictures and avatars
- **Access**: Public read, authenticated users can upload their own
- **File Types**: Images (JPEG, PNG, GIF, WebP)
- **Size Limit**: 5MB
- **Structure**: `/{userId}/{timestamp}-{filename}`

### 2. `whatsapp-media` (Public)
- **Purpose**: WhatsApp communication media files
- **Access**: Public read, authenticated users can upload
- **File Types**: Images, videos, audio, documents
- **Size Limit**: 16MB (WhatsApp limit)
- **Structure**: `/{userId}/{timestamp}-{filename}`

### 3. `textbooks` (Private)
- **Purpose**: AI textbook processing and storage
- **Access**: Service role only
- **File Types**: PDFs, text files
- **Size Limit**: 100MB
- **Structure**: `/{userId}/{timestamp}-{filename}`

### 4. `branch-logos` (Public)
- **Purpose**: Branch logos and branding assets
- **Access**: Public read, authenticated users can upload/update
- **File Types**: Images (JPEG, PNG, SVG, WebP)
- **Size Limit**: 2MB
- **Structure**: `/{userId}/{timestamp}-{filename}`

## 🚀 Automatic Setup

### Using the Setup Script

Run the automated setup script to create all buckets and configure RLS policies:

```bash
npm run setup:storage
```

This script will:
1. ✅ Test Supabase connection
2. 📦 Create all required storage buckets
3. 🔒 Set up Row Level Security (RLS) policies
4. 📋 Provide a summary of created resources

### Manual Setup (Alternative)

If you prefer to set up buckets manually:

1. **Open Supabase Dashboard**
   - Go to your project → Storage → Buckets

2. **Create Buckets**
   - Create each bucket with the configurations listed above

3. **Configure RLS Policies**
   - Go to Authentication → Policies
   - Add the policies defined in the setup script

## 🔒 Security Policies

### Avatar Policies
```sql
-- Users can upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatars
CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars are publicly readable
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### WhatsApp Media Policies
```sql
-- Authenticated users can upload WhatsApp media
CREATE POLICY "Authenticated users can upload WhatsApp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');

-- WhatsApp media is publicly readable
CREATE POLICY "WhatsApp media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');
```

### Branch Logo Policies
```sql
-- Authenticated users can upload branch logos
CREATE POLICY "Authenticated users can upload branch logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-logos' AND auth.role() = 'authenticated');

-- Authenticated users can update branch logos
CREATE POLICY "Authenticated users can update branch logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-logos' AND auth.role() = 'authenticated');

-- Branch logos are publicly readable
CREATE POLICY "Branch logos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-logos');
```

### Textbooks Policies
```sql
-- Only service role can manage textbooks
CREATE POLICY "Only service role can manage textbooks"
ON storage.objects FOR ALL
USING (bucket_id = 'textbooks' AND auth.jwt() ->> 'role' = 'service_role');
```

## 🔧 Usage in Code

### File Upload Component
```typescript
import { FileUpload } from "@/components/ui/file-upload";

// Upload to specific bucket
<FileUpload
  onUpload={handleUpload}
  bucket="branch-logos"
  accept="image/*"
  maxSize={2}
  buttonText="Upload Logo"
/>
```

### Direct API Usage
```typescript
import { uploadFile, getPublicUrl } from "@/utils/supabase-storage";

// Upload file
const data = await uploadFile(file, 'avatars', filePath);

// Get public URL
const url = getPublicUrl('avatars', filePath);
```

### Upload API Route
```typescript
// POST /api/upload
const formData = new FormData();
formData.append('file', file);
formData.append('bucket', 'branch-logos');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

## 📊 Monitoring

### Check Bucket Usage
```sql
-- View storage usage by bucket
SELECT 
  bucket_id,
  count(*) as file_count,
  sum(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects 
GROUP BY bucket_id;
```

### View Recent Uploads
```sql
-- Recent uploads in last 24 hours
SELECT 
  bucket_id,
  name,
  created_at,
  updated_at,
  metadata->>'size' as size_bytes
FROM storage.objects 
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

## 🔍 Troubleshooting

### Common Issues

1. **"Bucket does not exist" error**
   ```bash
   # Run the setup script
   npm run setup:storage
   ```

2. **"Access denied" error**
   - Check RLS policies are correctly applied
   - Verify user authentication status
   - Ensure user has proper permissions

3. **File size exceeded**
   - Check bucket configuration limits
   - Verify file size before upload

4. **Invalid file type**
   - Check allowed MIME types for the bucket
   - Ensure file extension matches content type

### Testing Connection
```bash
# Test Supabase connection
npm run test:supabase
```

## 📚 Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [File Upload Component Guide](../src/components/ui/file-upload.tsx)
- [Storage Utilities](../src/utils/supabase-storage.ts)

## 🔄 Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```