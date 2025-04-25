import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TestUploadPage: NextPage = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);

  const handleUpload = (url: string, path: string) => {
    setFileUrl(url);
    setFileKey(path);
  };

  return (
    <>
      <Head>
        <title>Test File Upload | ScholaRise ERP</title>
        <meta name="description" content="Test Supabase Storage file uploads" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Test Supabase Storage File Upload</h1>

          <Card>
            <CardHeader>
              <CardTitle>Upload a File</CardTitle>
              <CardDescription>
                Test uploading files to Supabase Storage. Images, PDFs, and documents are supported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onUpload={handleUpload}
                bucket="test-uploads"
                accept="image/*,application/pdf,.doc,.docx"
                buttonText="Upload File"
              />

              {fileUrl && (
                <div className="mt-4 space-y-2 rounded-md border p-4">
                  <h3 className="font-medium">Uploaded File</h3>
                  <p className="text-sm text-muted-foreground break-all">
                    <strong>URL:</strong> {fileUrl}
                  </p>
                  <p className="text-sm text-muted-foreground break-all">
                    <strong>Key:</strong> {fileKey}
                  </p>

                  {fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="mt-2">
                      <img
                        src={fileUrl}
                        alt="Uploaded file"
                        className="max-h-60 rounded-md object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          View File
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
};

export default TestUploadPage;
