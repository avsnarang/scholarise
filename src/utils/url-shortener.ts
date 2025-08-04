import { customAlphabet } from 'nanoid';

// Create a URL-safe alphabet without ambiguous characters
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

/**
 * Generate a short, unique identifier for URLs
 */
export function generateShortId(): string {
  return nanoid();
}

/**
 * Create a shortened URL using a base domain
 * For now, this creates a simple short path - in production you'd want to store these in a database
 */
export function createShortUrl(originalUrl: string, baseUrl?: string): string {
  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.tsh.edu.in');
  const shortId = generateShortId();
  return `${domain}/s/${shortId}`;
}

/**
 * Simple in-memory storage for demo - in production use database
 * This is a temporary solution for the immediate requirement
 */
const urlMap = new Map<string, string>();

/**
 * Store and retrieve short URL mappings
 * In production, this should use a database table
 */
export function storeShortUrl(shortId: string, originalUrl: string): void {
  urlMap.set(shortId, originalUrl);
}

export function resolveShortUrl(shortId: string): string | null {
  return urlMap.get(shortId) || null;
}

/**
 * Create and store a short URL
 */
export function shortenUrl(originalUrl: string, baseUrl?: string): string {
  const shortUrl = createShortUrl(originalUrl, baseUrl);
  const shortId = shortUrl.split('/s/')[1];
  if (shortId) {
    storeShortUrl(shortId, originalUrl);
  }
  return shortUrl;
}

/**
 * For registration links specifically, create a more user-friendly short URL
 */
export function shortenRegistrationUrl(branchId: string, sessionId: string, baseUrl?: string): string {
  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.tsh.edu.in');
  const originalUrl = `${domain}/register/${branchId}/${sessionId}`;
  
  // For registration links, use a more descriptive format
  const shortId = generateShortId();
  const shortUrl = `${domain}/r/${shortId}`;
  
  storeShortUrl(shortId, originalUrl);
  return shortUrl;
}