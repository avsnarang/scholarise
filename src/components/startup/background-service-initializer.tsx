"use client";

import { useEffect, useState } from 'react';

export function BackgroundServiceInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initializeServices = async () => {
      if (isInitialized || isInitializing) return;
      
      setIsInitializing(true);
      
      try {
        console.log('Initializing background services...');
        
        const response = await fetch('/api/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        
        if (mounted) {
          if (result.success) {
            console.log('Background services initialized successfully');
            setIsInitialized(true);
          } else {
            console.error('Failed to initialize background services:', result.error);
            // Retry after 5 seconds
            setTimeout(() => {
              if (mounted) {
                setIsInitializing(false);
                initializeServices();
              }
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Error initializing background services:', error);
        if (mounted) {
          // Retry after 5 seconds
          setTimeout(() => {
            if (mounted) {
              setIsInitializing(false);
              initializeServices();
            }
          }, 5000);
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    // Initialize services when component mounts
    initializeServices();

    return () => {
      mounted = false;
    };
  }, [isInitialized, isInitializing]);

  // This component doesn't render anything visible
  return null;
} 