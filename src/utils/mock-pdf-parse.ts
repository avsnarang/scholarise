/**
 * Mock implementation of pdf-parse that doesn't depend on Node.js built-in modules
 * This is used to allow the application to build correctly, while the real implementation
 * is only used on the server side via dynamic imports.
 */

// Create a mock interface that matches the real pdf-parse return type
interface PDFData {
  numpages: number;
  numrender: number;
  info: Record<string, any>;
  metadata: Record<string, any> | null;
  text: string;
  version: string;
}

// Mock implementation that just returns empty data
export default function mockPdfParse(dataBuffer: Buffer | Uint8Array): Promise<PDFData> {
  return Promise.resolve({
    numpages: 0,
    numrender: 0,
    info: {},
    metadata: null,
    text: '',
    version: '0.0.0'
  });
} 