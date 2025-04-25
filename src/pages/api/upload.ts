import { type NextApiRequest, type NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
// @ts-ignore - Ignore formidable type issues 
import formidable from "formidable";
import fs from "fs";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the authenticated user
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Parse the form data
    const form = new formidable.IncomingForm();

    // Parse the request
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err: any, fields: any, files: any) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get the file and bucket from the form
    const file = files.file as any;
    const bucket = (fields.bucket as string) || 'avatars'; // Default to avatars bucket

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate a unique path for the file
    const filePath = `${userId}/${Date.now()}-${file.originalFilename || 'file'}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
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

    // Return the file path and URL
    return res.status(200).json({
      path: filePath,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
}
