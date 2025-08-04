import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DESCRIPTIONS } from '@/utils/student-status';
import type { StudentStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

interface StudentStatusBadgeProps {
  status: StudentStatus;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StudentStatusBadge({ 
  status, 
  showDescription = false, 
  size = 'md',
  className 
}: StudentStatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const description = STATUS_DESCRIPTIONS[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        variant="outline"
        className={cn(
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size],
          'font-medium border',
          className
        )}
        title={showDescription ? description : undefined}
      >
        {label}
      </Badge>
      {showDescription && (
        <p className="text-xs text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}

interface StudentStatusFilterProps {
  currentStatus?: string;
  onStatusChange: (status: string) => void;
  className?: string;
}

export function StudentStatusFilter({ 
  currentStatus, 
  onStatusChange, 
  className 
}: StudentStatusFilterProps) {
  const statusOptions = [
    { value: '', label: 'All Students' },
    { value: 'active_enrolled', label: 'Active & Enrolled' },
    { value: 'active_only', label: 'Active Only' },
    { value: 'inactive_all', label: 'All Inactive' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'REPEAT', label: 'Repeating' },
    { value: 'EXPELLED', label: 'Expelled' },
    { value: 'WITHDRAWN', label: 'Withdrawn' },
    { value: 'TRANSFERRED', label: 'Transferred' },
    { value: 'GRADUATED', label: 'Graduated' },
  ];

  return (
    <select
      value={currentStatus || ''}
      onChange={(e) => onStatusChange(e.target.value)}
      className={cn(
        'px-3 py-2 border border-gray-300 rounded-md text-sm bg-white',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        className
      )}
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface StudentStatusStatsProps {
  stats: Record<StudentStatus, number>;
  totalStudents: number;
  className?: string;
}

export function StudentStatusStats({ 
  stats, 
  totalStudents, 
  className 
}: StudentStatusStatsProps) {
  const statusEntries = Object.entries(stats) as [StudentStatus, number][];
  
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {totalStudents}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400">
          Total Students
        </div>
      </div>

      {statusEntries
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([status, count]) => {
          const colors = STATUS_COLORS[status];
          const percentage = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) : '0';
          
          return (
            <div
              key={status}
              className={cn(
                'p-4 rounded-lg border',
                colors.bg.replace('100', '50').replace('text-', 'bg-'),
                colors.border
              )}
            >
              <div className={cn('text-2xl font-bold', colors.text)}>
                {count}
              </div>
              <div className={cn('text-sm', colors.text)}>
                {STATUS_LABELS[status]}
              </div>
              <div className="text-xs text-muted-foreground">
                {percentage}% of total
              </div>
            </div>
          );
        })}
    </div>
  );
}