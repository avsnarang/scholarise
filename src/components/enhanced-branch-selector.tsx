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
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

export function EnhancedBranchSelector() {
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = api.branch.getAll.useQuery();

  // Safely convert data to array
  const branches: Branch[] = Array.isArray(data) ? data : [];

  useEffect(() => {
    // Debug logging
    console.log("EnhancedBranchSelector rendered");
    console.log("Current branch ID:", currentBranchId);
    console.log("Branches data type:", data ? typeof data : "undefined");
    console.log("Branches data isArray:", data ? Array.isArray(data) : "undefined");
    console.log("Branches count:", branches.length);
    console.log("Is loading branches:", isLoading);
    
    if (error) {
      console.error("Error loading branches:", error);
    }
  }, [currentBranchId, data, branches.length, isLoading, error]);

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset search when dropdown opens
      setSearchQuery("");
    }
  }, [isOpen]);

  // Get current branch display data
  const currentBranch = branches.find((branch) => branch.id === currentBranchId);
  const branchName = currentBranch?.name || "Select Branch";
  const branchCode = currentBranch?.code || "";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Branch Selector Button */}
      <div
        className={cn(
          "flex h-10 items-center gap-1 rounded-md border px-3 py-2",
          "text-sm text-muted-foreground cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "transition-colors"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Building size={16} className="shrink-0" />
        <div className="flex items-center gap-1 truncate">
          <span className="truncate font-medium">{branchName}</span>
          {branchCode && <span className="text-xs text-muted-foreground">({branchCode})</span>}
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-50" />
      </div>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 top-11 z-50 w-[280px] overflow-hidden rounded-md border bg-popover shadow-md",
            )}
          >
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search size={14} className="mr-2 opacity-50" />
              <Input
                placeholder="Search branches..."
                className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Branch List */}
            <div className="max-h-[280px] overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  Loading branches...
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  {searchQuery ? "No branches found" : "No branches available"}
                </div>
              ) : (
                filteredBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      branch.id === currentBranchId
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={() => {
                      setCurrentBranchId(branch.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{branch.name}</span>
                        <span className="text-xs opacity-80">({branch.code})</span>
                      </div>
                      {branch.city && (
                        <div className="flex items-center gap-1 text-xs">
                          <Home size={10} className="shrink-0 opacity-70" />
                          <span className="truncate opacity-70">{branch.city}</span>
                        </div>
                      )}
                    </div>
                    {branch.id === currentBranchId && (
                      <Check size={16} className="shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
