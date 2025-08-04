"use client";

import { Suspense } from "react";

// TODO: Migrate from test-upload.tsx

function TestUploadContent() {
  return (
    <div>
      <h1>This page needs to be migrated from Pages Router</h1>
      <p>Original file: test-upload.tsx</p>
    </div>
  );
}

export default function TestUploadPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <TestUploadContent />
    </Suspense>
  );
}
