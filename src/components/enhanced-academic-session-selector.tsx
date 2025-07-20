import { useState, useEffect, useRef } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatShortMonth } from "@/lib/date-utils";

export function EnhancedAcademicSessionSelector() {
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: sessions = [], isLoading } = api.academicSession.getAll.useQuery();

  // Get current session display data
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  const sessionName = currentSession?.name || "Select Session";

  // Filter sessions based on search
  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-full items-center gap-2 rounded-lg bg-muted/30 hover:bg-muted/50 px-3 py-1 transition-colors">
        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs font-medium truncate">{sessionName}</span>
          {currentSession?.isActive && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              Active
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[280px]">
        <div className="flex items-center border-b px-3 py-2">
          <Search size={14} className="mr-2 opacity-50" />
          <Input
            placeholder="Search sessions..."
            className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filteredSessions.map((session) => (
            <DropdownMenuItem
              key={session.id}
              onSelect={() => setCurrentSessionId(session.id)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{session.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatShortMonth(new Date(session.startDate))} - {formatShortMonth(new Date(session.endDate))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {session.isActive && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    Active
                  </span>
                )}
                {currentSessionId === session.id && (
                  <Check size={16} className="text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
