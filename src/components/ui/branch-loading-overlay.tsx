import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BranchLoadingOverlayProps {
  isLoading: boolean;
}

export function BranchLoadingOverlay({ isLoading }: BranchLoadingOverlayProps) {
  // Add a small delay before showing the loading overlay to prevent flashing
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      // Show loading after a very small delay to prevent flashing for quick loads
      timeout = setTimeout(() => {
        setShowLoading(true);
      }, 150); // Reduced delay for faster feedback
    } else {
      setShowLoading(false);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {showLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }} // Faster animation
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow-lg">
            <div className="relative h-16 w-16">
              {/* Primary spinner */}
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>

              {/* Secondary spinner (accent color) */}
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-[#A65A20]/30 border-t-transparent" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <h3 className="text-lg font-medium text-[#00501B]">Changing Branch</h3>
              <p className="mt-1 text-sm text-gray-500">Loading data for the selected branch...</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
