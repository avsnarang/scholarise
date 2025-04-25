import { useState, useEffect, useRef } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Search, Hash, Building, School, Home, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Branch {
  id: string;
  name: string;
  code: string;
}

export function EnhancedBranchSelector() {
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: branches = [], isLoading } = api.branch.getAll.useQuery<Branch[]>();

  const filteredBranches = branches.filter((branch: Branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle branch selection
  const handleBranchSelect = (branchId: string) => {
    if (branchId !== currentBranchId) {
      setCurrentBranchId(branchId);
    }
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get branch icon based on branch code
  const getBranchIcon = (code: string) => {
    switch (code) {
      case 'JUN':
        return <School className="h-4 w-4" />;
      case 'MAJ':
        return <Home className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  // Get branch color based on branch code
  const getBranchColor = (code: string) => {
    switch (code) {
      case 'PS':
        return '#00501B'; // Primary green
      case 'JUN':
        return '#A65A20'; // Orange accent
      case 'MAJ':
        return '#2563EB'; // Blue accent
      default:
        return '#00501B'; // Default green
    }
  };

  // Get current branch
  const currentBranch = currentBranchId
    ? branches.find((b: Branch) => b.id === currentBranchId)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Branch selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-lg border px-3 py-2",
          "text-sm font-medium shadow-sm transition-all duration-200",
          "relative", // Added for the badge
          isOpen
            ? "border-[#00501B] bg-[#F0F9F1] text-[#00501B]"
            : "border-gray-200 bg-white text-gray-700 hover:border-[#00501B]/30 hover:bg-[#F0F9F1]/50",
          "focus:outline-none focus:ring-2 focus:ring-[#00501B]/20"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          {/* Branch badge */}
          <div className="relative">
            <Building className="h-4 w-4 text-[#00501B]" />
          </div>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-normal text-gray-500">Branch</span>
            <span className="font-medium truncate max-w-[120px]">
              {isLoading ? "Loading..." : (currentBranch?.name || "Select Branch")}
            </span>
          </div>

          <ChevronDown
            className={cn(
              "ml-1 h-4 w-4 flex-shrink-0 opacity-70 transition-transform duration-200",
              isOpen && "rotate-180 text-[#00501B]"
            )}
          />
        </div>
      </button>

      {/* Dropdown menu with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-[100] mt-2 w-[300px] origin-top-right rounded-xl border border-gray-100 bg-white shadow-xl">

          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search branches..."
                className="pl-9 pr-4 h-9 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Branch list */}
          <div className="py-2 max-h-[300px] overflow-y-auto">
            <div className="px-3 py-1.5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Branches</h3>
            </div>

            {filteredBranches.map((branch: Branch, index: number) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                key={branch.id}
                role="option"
                aria-selected={branch.id === currentBranchId}
                className={cn(
                  "group flex items-center gap-3 mx-2 px-3 py-2.5 cursor-pointer rounded-lg",
                  "transition-all duration-150",
                  branch.id === currentBranchId
                    ? "bg-[#F0F9F1] text-[#00501B]"
                    : "hover:bg-gray-50"
                )}
                onClick={() => handleBranchSelect(branch.id)}
              >
                {/* Branch icon/avatar */}
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    branch.id === currentBranchId
                      ? "bg-[#00501B]/10"
                      : "bg-gray-100 group-hover:bg-[#00501B]/5"
                  )}
                  style={branch.id === currentBranchId ? { backgroundColor: `${getBranchColor(branch.code)}15` } : {}}
                >
                  <div
                    className={cn(
                      "text-base font-semibold",
                      branch.id === currentBranchId ? "text-[#00501B]" : "text-gray-500 group-hover:text-[#00501B]"
                    )}
                    style={branch.id === currentBranchId ? { color: getBranchColor(branch.code) } : {}}
                  >
                    {branch.code}
                  </div>
                </div>

                {/* Branch details */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-medium truncate",
                      branch.id === currentBranchId ? "text-[#00501B]" : "text-gray-900 group-hover:text-[#00501B]"
                    )}>
                      {branch.name}
                    </span>

                    {branch.id === currentBranchId && (
                      <Check className="h-4 w-4 text-[#00501B] flex-shrink-0" />
                    )}
                  </div>

                  {/* Branch code if available */}
                  {branch.code && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Hash className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 truncate">
                        {branch.code}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredBranches.length === 0 && (
              <div className="px-3 py-8 text-sm text-[#00501B]/70 text-center italic">
                No branches found
              </div>
            )}
          </div>

          {/* Footer with actions */}
          <div className="border-t border-gray-100 p-3">
            <div className="grid grid-cols-1 gap-2">
              <button
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
