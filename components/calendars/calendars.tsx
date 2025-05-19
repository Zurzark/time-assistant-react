"use client"
import { CheckSquare, ChevronDown } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// 为日历数据定义基本类型
interface CalendarItem {
  // 假设 item 是一个字符串，如果它有更复杂的结构，需要调整
  // 例如: id: string; name: string; color?: string;
  [key: string]: any; // 允许其他属性，或者更具体地定义 item 的结构
}

interface CalendarGroup {
  name: string;
  items: CalendarItem[]; // 或 string[] 如果 item 只是字符串
  // 可以添加其他属性，如 id, color 等
}

interface CalendarsProps {
  calendars: CalendarGroup[];
}

export function Calendars({ calendars }: CalendarsProps) {
  return (
    <div className="space-y-2">
      {calendars.map((calendar: CalendarGroup) => (
        <Collapsible key={calendar.name} defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {calendar.name}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {calendar.items.map((item: CalendarItem, index: number) => ( // 假设 item 是对象，key应该是唯一的，比如 item.id。如果 item 是 string，则 key={item}
                    <SidebarMenuItem key={item.id || item.name || index}> 
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <CheckSquare className="h-4 w-4" />
                          {/* 假设 item 有一个可显示的属性，如 name 或直接是 item 本身（如果是字符串） */}
                          <span>{item.name || item}</span> 
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </div>
  )
}
