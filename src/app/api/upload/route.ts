import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server"; 
import { createClient } from '@supabase/supabase-js';
import formidable from "formidable";
import fs from "fs";
import { join } from "path";
import os from "os";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Use Clerk's auth helper for App Router
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We need to manually handle the multipart form-data in App Router
    // Create a unique temp directory for this upload
    const tempDir = join(os.tmpdir(), `upload-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Parse the form using formidable
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      multiples: false,
    });

    // We need to convert the NextRequest to a Node.js IncomingMessage-like object
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      const req = new NodeNextRequest(request);
      // @ts-expect-error - Formidable types are incompatible with Next.js Request
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Get the file and bucket from the form
    const file = files.file as unknown as { filepath: string; originalFilename?: string; mimetype?: string };
    const bucket = (fields.bucket?.[0] as string) ?? 'avatars'; // Default to avatars bucket

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate a unique path for the file
    const filePath = `${userId}/${Date.now()}-${file.originalFilename ?? 'file'}`;

    // Upload the file to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype ?? 'application/octet-stream',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Clean up temp file and directory
    fs.unlinkSync(file.filepath);
    fs.rmdirSync(tempDir, { recursive: true });

    // Return the file path and URL
    return NextResponse.json({
      path: filePath,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

// Helper class to convert NextRequest to a Node.js IncomingMessage-like object
class NodeNextRequest {
  private request: NextRequest;
  
  constructor(request: NextRequest) {
    this.request = request;
  }
  
  get headers() {
    return Object.fromEntries(this.request.headers.entries());
  }
  
  get method() {
    return this.request.method;
  }
  
  get url() {
    return this.request.url;
  }
  
  pipe(destination: any) {
    // Use the NextRequest body stream
    if (this.request.body) {
      const reader = this.request.body.getReader();
      const writer = destination.getWriter();
      
      reader.read().then(function process({ done, value }): Promise<void> | undefined {
        if (done) {
          writer.close();
          return;
        }
        
        writer.write(value);
        return reader.read().then(process);
      });
    }
    
    return destination;
  }
} 