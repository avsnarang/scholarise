import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types for our popup
type PopupType = "alert" | "confirm" | "prompt";

interface PopupOptions {
  title: string;
  message: string;
  type?: PopupType;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  onConfirm?: () => void;
  onCancel?: () => void;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
}

interface PopupContextType {
  showPopup: (options: PopupOptions) => void;
  alert: (title: string, message: string, onConfirm?: () => void) => void;
  confirm: (title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => void;
  prompt: (title: string, message: string, onConfirm?: (value: string) => void, options?: Partial<PopupOptions>) => void;
}

// Create context
const PopupContext = createContext<PopupContextType | undefined>(undefined);

// Custom hook to use the popup
export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
};

// Popup Provider component
export const PopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PopupOptions | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Close popup when Escape key is pressed
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  // Handle confirm action
  const handleConfirm = () => {
    if (options?.type === "prompt" && options.onConfirm) {
      (options.onConfirm as (value: string) => void)(inputValue);
    } else if (options?.onConfirm) {
      options.onConfirm();
    }
    setIsOpen(false);
  };

  // Handle cancel action
  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    setIsOpen(false);
  };

  // Show popup with options
  const showPopup = (popupOptions: PopupOptions) => {
    setOptions({
      ...popupOptions,
      type: popupOptions.type || "alert",
      confirmText: popupOptions.confirmText || "OK",
      cancelText: popupOptions.cancelText || "Cancel",
      variant: popupOptions.variant || "default",
    });
    setInputValue(popupOptions.inputDefaultValue || "");
    setIsOpen(true);
  };

  // Helper for alert popup
  const alert = (title: string, message: string, onConfirm?: () => void) => {
    showPopup({
      title,
      message,
      type: "alert",
      confirmText: "OK",
      onConfirm,
    });
  };

  // Helper for confirm popup
  const confirm = (
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    showPopup({
      title,
      message,
      type: "confirm",
      confirmText: "Yes",
      cancelText: "No",
      onConfirm,
      onCancel,
    });
  };

  // Helper for prompt popup
  const prompt = (
    title: string,
    message: string,
    onConfirm?: (value: string) => void,
    options?: Partial<PopupOptions>
  ) => {
    showPopup({
      title,
      message,
      type: "prompt",
      confirmText: options?.confirmText || "Submit",
      cancelText: options?.cancelText || "Cancel",
      inputPlaceholder: options?.inputPlaceholder || "",
      inputDefaultValue: options?.inputDefaultValue || "",
      onConfirm: onConfirm as any,
      onCancel: options?.onCancel,
    });
  };

  // Get button variant based on popup variant
  const getButtonVariant = (isConfirm: boolean) => {
    if (!options) return "default";
    
    if (isConfirm) {
      switch (options.variant) {
        case "destructive": return "destructive";
        case "success": return "default";
        case "warning": return "outline";
        default: return "default";
      }
    } else {
      return "outline";
    }
  };

  // Get background color based on variant
  const getHeaderClass = () => {
    if (!options) return "";
    
    switch (options.variant) {
      case "destructive": return "bg-red-50 text-red-700";
      case "success": return "bg-green-50 text-green-700";
      case "warning": return "bg-amber-50 text-amber-700";
      default: return "bg-[#00501B]/5 text-[#00501B]";
    }
  };

  return (
    <PopupContext.Provider value={{ showPopup, alert, confirm, prompt }}>
      {children}

      {/* Popup overlay */}
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
            onClick={handleCancel}
          />

          {/* Popup content */}
          <div className="z-50 w-full max-w-md rounded-lg bg-white shadow-xl transition-all">
            {/* Header */}
            <div className={cn("flex items-center justify-between rounded-t-lg p-4", getHeaderClass())}>
              <h3 className="text-lg font-semibold">{options.title}</h3>
              <button
                onClick={handleCancel}
                className="rounded-full p-1 hover:bg-black/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="mb-4 text-gray-700">{options.message}</p>

              {/* Input field for prompt */}
              {options.type === "prompt" && (
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-[#00501B] focus:outline-none focus:ring-1 focus:ring-[#00501B]"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={options.inputPlaceholder}
                  autoFocus
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 rounded-b-lg border-t border-gray-100 bg-gray-50 p-4">
              {(options.type === "confirm" || options.type === "prompt") && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="border-gray-200 hover:bg-gray-100 hover:text-gray-700"
                >
                  {options.cancelText}
                </Button>
              )}
              <Button
                variant={getButtonVariant(true)}
                onClick={handleConfirm}
                className={cn(
                  options.variant === "destructive" 
                    ? "bg-red-600 hover:bg-red-700" 
                    : options.variant === "success"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : options.variant === "warning"
                    ? "border-amber-500 text-amber-700 hover:bg-amber-50"
                    : "bg-[#00501B] hover:bg-[#00501B]/90 text-white"
                )}
              >
                {options.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
};
