"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface LeaveBalance {
  id: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  policy: {
    id: string;
    name: string;
    isPaid: boolean;
  };
}

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const usedPercentage = (balance.usedDays / balance.totalDays) * 100;
  
  // Determine color based on remaining percentage
  const getColorClass = () => {
    const remainingPercentage = 100 - usedPercentage;
    if (remainingPercentage <= 20) return "text-red-600";
    if (remainingPercentage <= 40) return "text-amber-600";
    return "text-[#00501B]";
  };

  // Determine progress bar color
  const getProgressColorClass = () => {
    const remainingPercentage = 100 - usedPercentage;
    if (remainingPercentage <= 20) return "bg-red-600";
    if (remainingPercentage <= 40) return "bg-amber-600";
    return "bg-[#00501B]";
  };

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-semibold flex items-center">
            {balance.policy.isPaid ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00501B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {balance.policy.name}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${balance.policy.isPaid ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {balance.policy.isPaid ? "Paid" : "Unpaid"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="text-center">
              <span className="block text-xl font-bold">{balance.usedDays}</span>
              <span className="text-xs text-slate-500">Used</span>
            </div>
            <div className="text-center">
              <span className={`block text-xl font-bold ${getColorClass()}`}>{balance.remainingDays}</span>
              <span className="text-xs text-slate-500">Remaining</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold text-slate-700">{balance.totalDays}</span>
              <span className="text-xs text-slate-500">Total</span>
            </div>
          </div>
          
          <div className="relative pt-1">
            <div className="flex mb-1 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-slate-500">
                  {Math.round(usedPercentage)}% Used
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block text-slate-500">
                  {Math.round(100 - usedPercentage)}% Remaining
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-slate-200">
              <div
                style={{ width: `${usedPercentage}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getProgressColorClass()}`}
              ></div>
            </div>
          </div>
          
          <div className="text-xs text-center text-slate-500 pt-1">
            For {balance.year}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 