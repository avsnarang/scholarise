import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";

export interface StudentFilters {
  sectionId?: string;
  gender?: string;
  isActive?: boolean;
}

interface StudentFiltersProps {
  filters: StudentFilters;
  onFilterChange: (filters: StudentFilters) => void;
}

export function StudentFilters({ filters, onFilterChange }: StudentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<StudentFilters>(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch sections from the API (since students belong to sections, not classes directly)
  const { data: sectionsData } = api.section.getAll.useQuery({
    includeClass: true,
    isActive: true,
  });
  const sections = sectionsData || [];

  const handleFilterChange = (key: keyof StudentFilters, value: any) => {
    // Handle special values for "All" options
    if (value === 'all_sections' || value === 'all_genders') {
      value = undefined;
    }

    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters: StudentFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter((value) => value !== undefined).length;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setIsOpen(true)}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {getActiveFilterCount() > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              {getActiveFilterCount()}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filter Students</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the student list
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sectionFilter" className="flex items-center gap-2">
              Section
              {localFilters.sectionId && (
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </Label>
            <Select
              value={localFilters.sectionId || "all_sections"}
              onValueChange={(value) => handleFilterChange("sectionId", value)}
            >
              <SelectTrigger id="sectionFilter">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_sections">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.class.name} - {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="genderFilter" className="flex items-center gap-2">
              Gender
              {localFilters.gender && (
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </Label>
            <Select
              value={localFilters.gender || "all_genders"}
              onValueChange={(value) => handleFilterChange("gender", value)}
            >
              <SelectTrigger id="genderFilter">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_genders">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="activeFilter" className="flex items-center gap-2">
              Active Students Only
              {localFilters.isActive !== undefined && (
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </Label>
            <Switch
              id="activeFilter"
              checked={localFilters.isActive === true}
              onCheckedChange={(checked) => handleFilterChange("isActive", checked || undefined)}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={resetFilters} className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
