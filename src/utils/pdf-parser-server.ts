// This file should only be imported and used on the server-side.
const isServer = typeof window === 'undefined';

async function downloadFile(url: string, httpsModule: any): Promise<Buffer> {
  if (!isServer) {
    console.error("downloadFile should only be called on the server.");
    throw new Error("File downloading is a server-only operation.");
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? httpsModule : null; // Determine client based on URL

    if (!client) {
      return reject(new Error('Unsupported protocol. Only HTTPS is supported.'));
    }

    const request = client.get(url, (response: any) => {
      if (response.statusCode !== 200) {
        // Consume response data to free up memory
        response.resume();
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', (err: Error) => {
      reject(new Error(`Request error: ${err.message}`));
    });
  });
}

export async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  if (!isServer) {
    console.error("extractTextFromPdf should only be called on the server.");
    throw new Error("PDF extraction is a server-only operation.");
  }

  let pdfParseModule;
  let httpsModule;

  try {
    // Dynamically import server-side modules ONLY when this function is called on the server.
    pdfParseModule = (await import('pdf-parse')).default;
    httpsModule = (await import('https')).default;
  } catch (error) {
    console.error("Failed to import server-side modules for PDF parsing:", error);
    throw new Error("Failed to load necessary modules for PDF parsing on the server.");
  }

  if (!pdfUrl) {
    throw new Error("PDF URL is required.");
  }

  try {
    const buffer = await downloadFile(pdfUrl, httpsModule);
    const data = await pdfParseModule(buffer);
    // Basic cleanup: trim whitespace and remove excessive newlines
    return data.text.trim().replace(/\n{3,}/g, '\n\n');
  } catch (error) {
    console.error(`Error extracting text from PDF at ${pdfUrl}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
    throw new Error("An unknown error occurred during PDF text extraction.");
  }
} 