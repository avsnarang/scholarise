import { useState, useEffect } from "react";
import { BranchSelect } from "@/components/common/branch-select";
import { api } from "@/utils/api";

interface BranchSelectorProps {
  onBranchSelect: (branchId: string) => void;
  defaultBranchId?: string;
}

export function BranchSelector({ onBranchSelect, defaultBranchId }: BranchSelectorProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranchId || "");

  // This is a real API call
  const { data: branches, isLoading } = api.branch.getAll.useQuery();

  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]?.id || "");
      onBranchSelect(branches[0]?.id || "");
    }
  }, [branches, selectedBranch, onBranchSelect]);

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    onBranchSelect(value);
  };

  return (
    <BranchSelect
      value={selectedBranch}
      onChange={handleBranchChange}
      disabled={isLoading}
      placeholder={isLoading ? "Loading branches..." : "Select branch"}
    />
  );
}
