"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  X, 
  Plus
} from "lucide-react"
import { api } from "@/utils/api"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { cn } from "@/lib/utils"

export interface StudentFilters {
  search?: string
  classId?: string
  sectionId?: string
  gender?: string
  isActive?: string
  ageRange?: {
    min?: number
    max?: number
  }
}

interface StudentFiltersProps {
  filters: StudentFilters
  onFiltersChange: (filters: StudentFilters) => void
  onSearchChange: (search: string) => void
  searchTerm: string
  totalCount?: number
  className?: string
}

export function StudentFilters({
  filters,
  onFiltersChange,
  onSearchChange,
  searchTerm,
  totalCount = 0,
  className
}: StudentFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { getBranchFilterParam } = useGlobalBranchFilter()
  const { currentSessionId } = useAcademicSessionContext()

  // Fetch classes for the current branch
  const { data: classesData } = api.class.getAll.useQuery({
    branchId: getBranchFilterParam() || undefined,
    sessionId: currentSessionId || undefined,
  })

  // Fetch sections based on selected class
  const { data: sectionsData } = api.section.getAll.useQuery({
    branchId: getBranchFilterParam() || undefined,
    classId: filters.classId || undefined,
  }, {
    enabled: !!filters.classId
  })

  const handleFilterChange = (key: keyof StudentFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    
    // Clear section when class changes
    if (key === 'classId') {
      newFilters.sectionId = undefined
    }
    
    onFiltersChange(newFilters)
  }

  const clearFilter = (key: keyof StudentFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
    onSearchChange("")
  }

  const getActiveFilters = () => {
    const active = []
    
    if (filters.classId && classesData) {
      const className = classesData.find(c => c.id === filters.classId)?.name
      if (className) active.push({ key: 'classId', label: `Class: ${className}` })
    }
    
    if (filters.sectionId && sectionsData) {
      const sectionName = sectionsData.find(s => s.id === filters.sectionId)?.name
      if (sectionName) active.push({ key: 'sectionId', label: `Section: ${sectionName}` })
    }
    
    if (filters.gender) {
      active.push({ key: 'gender', label: `Gender: ${filters.gender}` })
    }
    
    if (filters.isActive && filters.isActive !== 'all') {
      const statusLabel = filters.isActive === 'true' ? 'Active' : 'Inactive'
      active.push({ key: 'isActive', label: `Status: ${statusLabel}` })
    }
    
    return active
  }

  const activeFilters = getActiveFilters()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Button */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {activeFilters.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Class Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select
                value={filters.classId || "all"}
                onValueChange={(value) => handleFilterChange('classId', value === "all" ? undefined : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classesData?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Filter */}
            {filters.classId && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Section</label>
                <Select
                  value={filters.sectionId || "all"}
                  onValueChange={(value) => handleFilterChange('sectionId', value === "all" ? undefined : value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sectionsData?.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Gender Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Gender</label>
              <Select
                value={filters.gender || "all"}
                onValueChange={(value) => handleFilterChange('gender', value === "all" ? undefined : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={filters.isActive || "all"}
                onValueChange={(value) => handleFilterChange('isActive', value === "all" ? undefined : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              {filter.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter(filter.key as keyof StudentFilters)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count */}
      {totalCount > 0 && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {totalCount} {totalCount === 1 ? 'student' : 'students'}
        </span>
      )}
    </div>
  )
}
