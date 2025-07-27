"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Play, 
  Pause,
  Volume2,
  FileText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
}

interface MediaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaArray: MediaItem[];
  initialIndex?: number;
}

export function MediaViewer({ 
  open, 
  onOpenChange, 
  mediaArray, 
  initialIndex = 0 
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentMedia = mediaArray[currentIndex];

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [open, initialIndex]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateMedia('previous');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateMedia('next');
          break;
        case ' ':
          e.preventDefault();
          if (currentMedia && (currentMedia.type === 'VIDEO' || currentMedia.type === 'AUDIO')) {
            togglePlayPause();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, mediaArray.length, currentMedia?.type]);

  // Media controls
  const togglePlayPause = () => {
    if (!currentMedia) return;
    
    const mediaElement = currentMedia.type === 'VIDEO' ? videoRef.current : audioRef.current;
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause();
        setIsPlaying(false);
      } else {
        mediaElement.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!currentMedia || newVolume[0] === undefined) return;
    
    setVolume(newVolume);
    const mediaElement = currentMedia.type === 'VIDEO' ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.volume = newVolume[0] / 100;
    }
  };

  const handleTimeChange = (newTime: number[]) => {
    if (!currentMedia || newTime[0] === undefined) return;
    
    setCurrentTime(newTime[0]);
    const mediaElement = currentMedia.type === 'VIDEO' ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = newTime[0];
    }
  };

  const navigateMedia = (direction: 'previous' | 'next') => {
    if (direction === 'previous' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < mediaArray.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const downloadMedia = async () => {
    if (!currentMedia) return;
    
    try {
      const response = await fetch(currentMedia.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentMedia.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMedia = () => {
    if (!currentMedia) return null;

    switch (currentMedia.type) {
      case 'IMAGE':
        return (
          <div className="flex items-center justify-center max-h-[80vh]">
            <img
              src={currentMedia.url}
              alt={currentMedia.filename}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '80vh' }}
            />
          </div>
        );

      case 'VIDEO':
        return (
          <div className="space-y-4">
            <video
              ref={videoRef}
              src={currentMedia.url}
              className="w-full max-h-[60vh] object-contain"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          </div>
        );

      case 'AUDIO':
        return (
          <div className="space-y-6 p-8">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Volume2 className="w-12 h-12 text-primary" />
              </div>
              <h3 className="font-medium text-lg">{currentMedia.filename}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatFileSize(currentMedia.size)}
              </p>
            </div>

            <audio
              ref={audioRef}
              src={currentMedia.url}
              className="w-full"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          </div>
        );

      case 'DOCUMENT':
        return (
          <div className="text-center p-8 space-y-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            
            <div>
              <h3 className="font-medium mb-1">{currentMedia.filename}</h3>
              <p className="text-sm text-muted-foreground">
                {currentMedia.mimeType}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(currentMedia.size)}
              </p>
            </div>

            {currentMedia.mimeType?.includes('pdf') && (
              <Button
                variant="outline"
                onClick={() => window.open(currentMedia.url, '_blank')}
              >
                Open PDF
              </Button>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center p-8">
            <p className="text-muted-foreground">
              {currentMedia.filename}
            </p>
            <Badge variant="secondary" className="mt-2">
              {currentMedia.type}
            </Badge>
          </div>
        );
    }
  };

  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{currentMedia.type}</Badge>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {mediaArray.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={downloadMedia}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Media Content */}
          <div className="p-4">
            {renderMedia()}
          </div>

          {/* Navigation */}
          {mediaArray.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={() => navigateMedia('previous')}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => navigateMedia('next')}
                disabled={currentIndex === mediaArray.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 