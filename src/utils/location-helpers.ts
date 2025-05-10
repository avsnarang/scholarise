import type { AttendanceLocation } from "@prisma/client";

// Type definition for location
export type Location = AttendanceLocation;

// Alias for AttendanceLocation to match usage in attendance-api.ts
export type AttendanceLocationAlias = Location;

// Type definition for attendance record
export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  isWithinAllowedArea: boolean;
  distance: number;
}

// Function to calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Function to calculate distance between two coordinate objects
export function getDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  return calculateDistance(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
}

// Function to convert meters to miles or kilometers
export function convertToMilesOrKm(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }
}

// Format date for display
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  }).format(date);
}

// Get current location with high accuracy
export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// Check if a position is within an allowed radius of a target location
export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusInMeters: number
): boolean {
  const distance = calculateDistance(
    currentLat,
    currentLon,
    targetLat,
    targetLon
  );
  return distance <= radiusInMeters;
}

// Save attendance records to local storage
export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  localStorage.setItem("attendanceRecords", JSON.stringify(records));
}

// Load attendance records from local storage
export function loadAttendanceRecords(): AttendanceRecord[] {
  const savedRecords = localStorage.getItem("attendanceRecords");
  if (savedRecords) {
    return JSON.parse(savedRecords);
  }
  return [];
}

// Save locations to local storage
export function saveLocations(locations: Location[]): void {
  localStorage.setItem("attendanceLocations", JSON.stringify(locations));
}

// Load locations from local storage
export function loadLocations(): Location[] {
  const savedLocations = localStorage.getItem("attendanceLocations");
  if (savedLocations) {
    return JSON.parse(savedLocations);
  }
  return [];
}

// Load only active locations
export function loadActiveLocations(): Location[] {
  return loadLocations().filter(loc => loc.isActive);
}

// Create a new attendance record
export function createAttendanceRecord(
  userId: string,
  userName: string,
  locationId: string,
  locationName: string,
  currentPosition: {
    latitude: number;
    longitude: number;
  },
  isWithinAllowedArea: boolean,
  distance: number
): AttendanceRecord {
  return {
    id: Date.now().toString(),
    userId,
    userName,
    locationId,
    locationName,
    timestamp: new Date().toISOString(),
    latitude: currentPosition.latitude,
    longitude: currentPosition.longitude,
    isWithinAllowedArea,
    distance,
  };
}