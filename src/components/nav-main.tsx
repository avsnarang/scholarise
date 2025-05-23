"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <div key={item.title} className="relative">
            <SidebarMenuItem>
              <a href={item.url} className="flex-1">
                <SidebarMenuButton 
                  tooltip={item.title}
                  className={`${!isCollapsed && item.items && item.items.length > 0 ? 'pr-10' : ''}`}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </a>
              
              {!isCollapsed && item.items && item.items.length > 0 && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                  <button
                    onClick={(e) => toggleExpand(item.title, e)}
                    className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
                    aria-label={`Toggle ${item.title} submenu`}
                  >
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform duration-200 ${
                        expandedItems[item.title] ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                </div>
              )}
            </SidebarMenuItem>
            
            {!isCollapsed && item.items && item.items.length > 0 && (
              <div className={`overflow-hidden transition-all duration-200 ${
                expandedItems[item.title] ? 'max-h-96' : 'max-h-0'
              }`}>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </div>
            )}
          </div>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
