"use client";

import { GraduationCap, Briefcase, Users, ChevronRight, ChevronsUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CategoryCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  actions: {
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
  stats?: {
    total: number;
    active: number;
  };
}

interface StaffCategoryCardsProps {
  teacherStats: {
    total: number;
    active: number;
  };
  employeeStats: {
    total: number;
    active: number;
  };
}

export function StaffCategoryCards({ teacherStats, employeeStats }: StaffCategoryCardsProps) {
  const cards: CategoryCard[] = [
    {
      title: "Teachers",
      description: "Manage academic teaching staff",
      icon: <GraduationCap className="h-6 w-6 text-primary" />,
      href: "/teachers",
      actions: {
        primary: { label: "View All Teachers", href: "/teachers" },
        secondary: { label: "Add Teacher", href: "/teachers/create" },
      },
      stats: teacherStats,
    },
    {
      title: "Employees",
      description: "Manage non-teaching staff",
      icon: <Briefcase className="h-6 w-6 text-primary" />,
      href: "/employees",
      actions: {
        primary: { label: "View All Employees", href: "/employees" },
        secondary: { label: "Add Employee", href: "/employees/create" },
      },
      stats: employeeStats,
    },
    {
      title: "Salary Management",
      description: "Manage staff salaries and payments",
      icon: <ChevronsUp className="h-6 w-6 text-primary" />,
      href: "/salary",
      actions: {
        primary: { label: "View Salary Overview", href: "/salary" },
        secondary: { label: "Process Payments", href: "/salary/payments" },
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="bg-primary/10 p-2 rounded-lg">
                {card.icon}
              </div>
              {card.stats && (
                <div className="text-right">
                  <p className="text-2xl font-bold">{card.stats.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.stats.active} active
                  </p>
                </div>
              )}
            </div>
            <CardTitle className="mt-3">{card.title}</CardTitle>
            <CardDescription>{card.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-2">
              <Link href={card.actions.primary.href} className="inline-block">
                <Button variant="default" className="w-full flex justify-between">
                  {card.actions.primary.label}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href={card.actions.secondary.href} className="inline-block">
                <Button variant="outline" className="w-full">
                  {card.actions.secondary.label}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 