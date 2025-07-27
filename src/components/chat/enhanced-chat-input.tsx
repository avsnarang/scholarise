"use client";

import React, { useState, useRef, useCallback } from "react";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image as ImageIcon, 
  File, 
  Video, 
  Music, 
  MapPin,
  X,
  Loader2,
  FileText,
  Plus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { WhatsAppMediaUpload } from "@/components/ui/whatsapp-media-upload";
import { 
  validateWhatsAppMedia,
  generateThumbnail,
  type MediaUploadResult,
  type WhatsAppMediaType 
} from "@/utils/whatsapp-media";

interface EnhancedChatInputProps {
  onSendMessage: (content: string, media?: MediaUploadResult[], messageType?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowMedia?: boolean;
  allowEmojis?: boolean;
  maxLength?: number;
}

// Common emojis for quick access
const QUICK_EMOJIS = [
  "😊", "😂", "❤️", "👍", "👎", "😍", "😢", "😮", "😡", "🙄",
  "✅", "❌", "⚠️", "🎉", "🔥", "💯", "👏", "🤝", "💪", "🙏"
];

export function EnhancedChatInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Type a message...",
  className,
  allowMedia = true,
  allowEmojis = true,
  maxLength = 4096,
}: EnhancedChatInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<MediaUploadResult[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle message sending
  const handleSend = useCallback(() => {
    if ((!message.trim() && attachedMedia.length === 0) || isLoading || disabled) {
      return;
    }

    // Determine message type based on content
    let messageType = "TEXT";
    if (attachedMedia.length > 0) {
      if (attachedMedia.length === 1) {
        messageType = attachedMedia[0]?.type || "TEXT";
      } else {
        messageType = "MEDIA_GROUP";
      }
    }

    onSendMessage(message.trim(), attachedMedia, messageType);
    setMessage("");
    setAttachedMedia([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachedMedia, isLoading, disabled, onSendMessage]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      
      // Auto-resize
      const textarea = e.target;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px height
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Handle emoji insertion
  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      
      if (newMessage.length <= maxLength) {
        setMessage(newMessage);
        
        // Set cursor position after emoji
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
          }
        }, 0);
      }
    }
    setShowEmojiPicker(false);
  };

  // Handle file selection
  const handleFileSelect = async (files: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      const validation = validateWhatsAppMedia(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${validation.errors.join(', ')}`,
          variant: "destructive",
        });
      }
    }

    if (validFiles.length > 0) {
      // Convert files to MediaUploadResult format (mock implementation)
      const mediaResults: MediaUploadResult[] = await Promise.all(
        validFiles.map(async (file) => {
          const validation = validateWhatsAppMedia(file);
          return {
            id: crypto.randomUUID(),
            url: URL.createObjectURL(file), // Temporary URL for preview
            supabasePath: `temp/${file.name}`,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            type: validation.type!,
            bucket: 'whatsapp-media'
          };
        })
      );

      setAttachedMedia(prev => [...prev, ...mediaResults]);
    }
  };

  // Handle quick media selection
  const handleQuickMedia = (type: WhatsAppMediaType) => {
    if (fileInputRef.current) {
      const acceptTypes = {
        IMAGE: 'image/*',
        VIDEO: 'video/*',
        AUDIO: 'audio/*',
        DOCUMENT: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
        STICKER: 'image/webp'
      };
      
      fileInputRef.current.accept = acceptTypes[type];
      fileInputRef.current.click();
    }
  };

  // Remove attached media
  const removeMedia = (mediaId: string) => {
    setAttachedMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("relative", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(Array.from(e.target.files));
            e.target.value = ''; // Reset input
          }
        }}
      />

      {/* Attached Media Preview */}
      {attachedMedia.length > 0 && (
        <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Attached Media ({attachedMedia.length})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {attachedMedia.map((media) => (
              <div key={media.id} className="relative group">
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded border">
                  {/* Media preview */}
                  {media.type === 'IMAGE' && (
                    <img 
                      src={media.url} 
                      alt={media.filename}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  {media.type !== 'IMAGE' && (
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-600 rounded">
                      {media.type === 'VIDEO' && <Video className="w-4 h-4 text-gray-600" />}
                      {media.type === 'AUDIO' && <Music className="w-4 h-4 text-gray-600" />}
                      {media.type === 'DOCUMENT' && <FileText className="w-4 h-4 text-gray-600" />}
                    </div>
                  )}
                  
                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{media.filename}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(media.size)}</p>
                  </div>
                  
                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(media.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end gap-2 p-2 bg-white dark:bg-gray-900 border rounded-lg">
        {/* Media/Attachment Button */}
        {allowMedia && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <Paperclip className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onClick={() => handleQuickMedia('IMAGE')}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickMedia('VIDEO')}>
                <Video className="w-4 h-4 mr-2" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickMedia('AUDIO')}>
                <Music className="w-4 h-4 mr-2" />
                Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickMedia('DOCUMENT')}>
                <File className="w-4 h-4 mr-2" />
                Document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowMediaUpload(true)}>
                <Plus className="w-4 h-4 mr-2" />
                More Options
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Message Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="resize-none min-h-[40px] max-h-[120px] pr-12 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
          
          {/* Character count */}
          {message.length > maxLength * 0.8 && (
            <div className={cn(
              "absolute bottom-1 right-1 text-xs",
              message.length > maxLength * 0.95 ? "text-red-500" : "text-gray-400"
            )}>
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Emoji Button */}
        {allowEmojis && (
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-2">
              <div className="grid grid-cols-10 gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Send Button */}
        <Button 
          onClick={handleSend}
          disabled={(!message.trim() && attachedMedia.length === 0) || isLoading || disabled}
          size="sm"
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Advanced Media Upload Modal */}
      {showMediaUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Media</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMediaUpload(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <WhatsAppMediaUpload
              onUploadComplete={(media) => {
                setAttachedMedia(prev => [...prev, ...media]);
                setShowMediaUpload(false);
              }}
              acceptedTypes={['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO']}
              maxFiles={5}
            />
          </div>
        </div>
      )}
    </div>
  );
} 