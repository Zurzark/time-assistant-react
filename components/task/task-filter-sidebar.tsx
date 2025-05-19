import React, { useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  CheckSquare, Clock, Flag, Tag, Calendar as CalendarIcon, Trash2, X, Search, 
  ChevronDown, ChevronUp, Check, Eye, FolderOpen, ArrowUpDown, Circle,
  Activity,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Project as DBProjectType, Tag as DBTagType } from "@/lib/db";
import type { TaskPriority } from "@/lib/task-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

export type DateFilterType = 'dueDate' | 'plannedDate' | 'createdAtDate';

interface TaskFilterSidebarProps {
  allProjects: DBProjectType[];
  allTags: DBTagType[]; 
  
  selectedView: string;
  onSelectedViewChange: (view: string) => void;
  
  selectedProjectIds: string[];
  onSelectedProjectIdsChange: (projectIds: string[]) => void;
  
  selectedTagNames: string[];
  onSelectedTagNamesChange: (tagNames: string[]) => void;
  
  activeDateFilter: "today" | "this-week" | "next-7-days" | "this-month" | "no-date" | "custom" | null;
  onActiveDateFilterChange: (dateFilter: "today" | "this-week" | "next-7-days" | "this-month" | "no-date" | "custom" | null) => void;
  
  customDateRange: DateRange | undefined;
  onCustomDateRangeChange: (range: DateRange | undefined) => void;
  
  selectedDateFilterType: DateFilterType;
  onSelectedDateFilterTypeChange: (type: DateFilterType) => void;

  selectedPriorities: TaskPriority[];
  onSelectedPrioritiesChange: (priorities: TaskPriority[]) => void;
  
  onClearAllAdvancedFilters: () => void;
  className?: string;
  getProjectNameById: (id: string | number | undefined) => string;
  tagCounts: Record<string, number>;
}

const ActiveFilterPill: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => {
  return (
    <Badge variant="secondary" className="flex items-center space-x-1 py-1 px-2 text-xs h-6 bg-primary/90 text-primary-foreground hover:bg-primary/80">
      <span>{label}</span>
      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-transparent" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
};

interface CapsuleButtonProps {
  label: string;
  onClick: () => void;
  isSelected: boolean;
  className?: string;
  icon?: React.ReactNode;
  color?: string;
  count?: number;
  dotColor?: string;
}

const CapsuleButton: React.FC<CapsuleButtonProps> = ({ label, onClick, isSelected, className, icon, color, count, dotColor }) => {
  const priorityColors = {
    "importantUrgent": {
      bg: "bg-red-500",
      text: "text-white",
      lightBg: "bg-red-50 dark:bg-red-900/30",
      lightText: "text-red-700 dark:text-red-300",
      lightBorder: "border-red-200 dark:border-red-700",
      hover: "hover:bg-red-100 dark:hover:bg-red-800/50",
    },
    "importantNotUrgent": {
      bg: "bg-amber-500",
      text: "text-black",
      lightBg: "bg-amber-50 dark:bg-amber-900/30",
      lightText: "text-amber-700 dark:text-amber-300",
      lightBorder: "border-amber-200 dark:border-amber-700",
      hover: "hover:bg-amber-100 dark:hover:bg-amber-800/50",
    },
    "notImportantUrgent": {
      bg: "bg-blue-500",
      text: "text-white",
      lightBg: "bg-blue-50 dark:bg-blue-900/30",
      lightText: "text-blue-700 dark:text-blue-300",
      lightBorder: "border-blue-200 dark:border-blue-700",
      hover: "hover:bg-blue-100 dark:hover:bg-blue-800/50",
    },
    "notImportantNotUrgent": {
      bg: "bg-green-500",
      text: "text-white",
      lightBg: "bg-green-50 dark:bg-green-900/30",
      lightText: "text-green-700 dark:text-green-300",
      lightBorder: "border-green-200 dark:border-green-700",
      hover: "hover:bg-green-100 dark:hover:bg-green-800/50",
    },
  };

  // 检查是否为优先级按钮
  const isPriorityButton = Object.keys(priorityColors).includes(color || '');
  
  const baseClasses = cn(
    "h-8 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 ease-in-out",
    "flex items-center justify-center border",
    "cursor-pointer"
  );
  
  // 常规按钮样式
  const regularButtonClasses = isSelected 
    ? "bg-primary text-primary-foreground border-primary shadow-sm"
    : "bg-[#EFF6FF] dark:bg-[#374151] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-primary/70 hover:bg-primary/5";
  
  // 优先级按钮样式
  const priorityButtonClasses = isPriorityButton && color ? (
    isSelected 
      ? `${priorityColors[color as keyof typeof priorityColors].bg} ${priorityColors[color as keyof typeof priorityColors].text} border-transparent`
      : `${priorityColors[color as keyof typeof priorityColors].lightBg} ${priorityColors[color as keyof typeof priorityColors].lightText} ${priorityColors[color as keyof typeof priorityColors].lightBorder} ${priorityColors[color as keyof typeof priorityColors].hover}`
  ) : '';

  const buttonClasses = isPriorityButton ? priorityButtonClasses : regularButtonClasses;
  
  return (
    <Button
      type="button" 
      variant="outline"
      size="sm"
      className={cn(
        baseClasses,
        buttonClasses,
        className
      )}
      onClick={onClick}
    >
      {dotColor && (
        <span className="mr-1.5 flex items-center">
          <Circle className="h-2 w-2 fill-current" style={{ color: dotColor }} />
        </span>
      )}
      {icon && <span className={cn("mr-1.5", !isSelected && !isPriorityButton && "text-muted-foreground")}>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn("ml-1 text-xs opacity-80", !isSelected && !isPriorityButton && "text-muted-foreground")}>
          ({count})
        </span>
      )}
      {isSelected && <Check className={cn("h-3 w-3 ml-1.5", isPriorityButton ? "text-current" : "")} />}
    </Button>
  );
};

export const TaskFilterSidebar: React.FC<TaskFilterSidebarProps> = ({
  allProjects,
  allTags,
  selectedView,
  onSelectedViewChange,
  selectedProjectIds,
  onSelectedProjectIdsChange,
  selectedTagNames,
  onSelectedTagNamesChange,
  activeDateFilter,
  onActiveDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  selectedDateFilterType,
  onSelectedDateFilterTypeChange,
  selectedPriorities,
  onSelectedPrioritiesChange,
  onClearAllAdvancedFilters,
  className,
  getProjectNameById,
  tagCounts,
}) => {
  const [projectSearch, setProjectSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isPrioritiesExpanded, setIsPrioritiesExpanded] = useState(true);
  const [isDateFilterExpanded, setIsDateFilterExpanded] = useState(true);

  const handleProjectSelection = (projectId: string) => {
    const newSelectedProjectIds = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter(id => id !== projectId)
      : [...selectedProjectIds, projectId];
    onSelectedProjectIdsChange(newSelectedProjectIds);
  };

  const handleTagSelection = (tagName: string) => {
    const newSelectedTagNames = selectedTagNames.includes(tagName)
      ? selectedTagNames.filter(name => name !== tagName)
      : [...selectedTagNames, tagName];
    onSelectedTagNamesChange(newSelectedTagNames);
  };

  const handlePrioritySelection = (priority: TaskPriority) => {
    const newSelectedPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority];
    onSelectedPrioritiesChange(newSelectedPriorities);
  };

  const filteredProjects = useMemo(() => 
    allProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())),
    [allProjects, projectSearch]
  );

  const tagsWithDisplayData = useMemo(() => {
    return allTags
      .map(tag => ({
        name: tag.name,
        count: tagCounts[tag.name] || 0,
        color: tag.color,
      }))
      .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch, tagCounts]);

  const priorityOptions: { label: string; value: TaskPriority; color?: string }[] = [
    { label: "重要且紧急", value: "importantUrgent", color: "importantUrgent" },
    { label: "重要不紧急", value: "importantNotUrgent", color: "importantNotUrgent" },
    { label: "不重要紧急", value: "notImportantUrgent", color: "notImportantUrgent" },
    { label: "不重要不紧急", value: "notImportantNotUrgent", color: "notImportantNotUrgent" },
  ];

  const viewOptions = [
    { label: "所有任务", value: "all", icon: <CheckSquare className="h-3.5 w-3.5" /> },
    { label: "进行中", value: "in-progress", icon: <Activity className="h-3.5 w-3.5" /> },
    { label: "已过期", value: "overdue", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { label: "已完成", value: "completed", icon: <Check className="h-3.5 w-3.5" /> },
    { label: "下一步行动", value: "next-actions", icon: <Flag className="h-3.5 w-3.5" /> },
    { label: "等待中", value: "waiting", icon: <Clock className="h-3.5 w-3.5" /> },
    { label: "将来/也许", value: "someday-maybe", icon: <Clock className="h-3.5 w-3.5" /> },
    { label: "回收站", value: "trash", icon: <Trash2 className="h-3.5 w-3.5" /> },
  ];

  const dateFilterPresetOptions: {label: string; value: "today" | "this-week" | "next-7-days" | "this-month" | "no-date"}[] = [
    { label: "今日", value: "today" },
    { label: "本周", value: "this-week" },
    { label: "未来7天", value: "next-7-days" },
    { label: "本月", value: "this-month" },
    { label: "无日期", value: "no-date" },
  ];

  const handleViewChange = (newView: string) => {
    onSelectedViewChange(newView);
    if (newView === 'trash') {
      onClearAllAdvancedFilters();
    }
  };
  
  const handleDatePresetChange = (preset: "today" | "this-week" | "next-7-days" | "this-month" | "no-date" | null) => {
    if (activeDateFilter === preset && preset !== null) {
        onActiveDateFilterChange(null);
        onCustomDateRangeChange(undefined);
    } else {
        onActiveDateFilterChange(preset);
        onCustomDateRangeChange(undefined);
    }
  };

  const handleCustomDateRangeClick = () => {
    onActiveDateFilterChange("custom");
  };

  const isAnyAdvancedFilterApplied = 
    selectedProjectIds.length > 0 ||
    selectedTagNames.length > 0 ||
    activeDateFilter !== null ||
    selectedPriorities.length > 0;

  const isTrashViewActive = selectedView === 'trash';

  const getPillLabelForDateFilter = () => {
    if (activeDateFilter === 'custom' && customDateRange) {
      const start = customDateRange.from ? format(customDateRange.from, "MM/dd") : "...";
      const end = customDateRange.to ? format(customDateRange.to, "MM/dd") : "...";
      return `自定义: ${start} - ${end}`;
    }
    const preset = dateFilterPresetOptions.find(opt => opt.value === activeDateFilter);
    if (preset) return preset.label;
    return activeDateFilter;
  };

  return (
    <div className={cn("space-y-3 md:col-span-1", className)}>
      <div className="bg-[#F9FAFB] dark:bg-gray-800/50 rounded-lg p-5 shadow-sm border-r border-gray-200 dark:border-gray-700 h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold tracking-tight">
            高级筛选
          </h3>
        </div>
          
        {/* Active Filters Pills Display */} 
        {(isAnyAdvancedFilterApplied || isTrashViewActive) && (
          <div className="mb-5 p-3 border border-border/50 rounded-md bg-white dark:bg-gray-800 shadow-sm">
            <h5 className="text-xs font-medium mb-2 text-muted-foreground">
              {isTrashViewActive ? "当前视图:" : "已选筛选:"}
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {isTrashViewActive && (
                <ActiveFilterPill label="回收站" onRemove={() => handleViewChange("all")} />
              )}
              {!isTrashViewActive && selectedProjectIds.map(id => (
                <ActiveFilterPill 
                  key={`active-proj-${id}`}
                  label={getProjectNameById(id) || `项目ID: ${id}`}
                  onRemove={() => onSelectedProjectIdsChange(selectedProjectIds.filter(pId => pId !== id))}
                />
              ))}
              {!isTrashViewActive && selectedTagNames.map(name => (
                <ActiveFilterPill 
                  key={`active-tag-${name}`}
                  label={name}
                  onRemove={() => onSelectedTagNamesChange(selectedTagNames.filter(tName => tName !== name))}
                />
              ))}
              {!isTrashViewActive && activeDateFilter && (
                <ActiveFilterPill 
                  label={getPillLabelForDateFilter()!}
                  onRemove={() => { onActiveDateFilterChange(null); onCustomDateRangeChange(undefined); }}
                />
              )}
              {!isTrashViewActive && selectedPriorities.map(priority => (
                <ActiveFilterPill 
                  key={`active-prio-${priority}`}
                  label={priorityOptions.find(p=>p.value === priority)?.label || priority}
                  onRemove={() => onSelectedPrioritiesChange(selectedPriorities.filter(pName => pName !== priority))}
                />
              ))}
            </div>
            {isAnyAdvancedFilterApplied && !isTrashViewActive && (
              <Button variant="link" size="sm" onClick={onClearAllAdvancedFilters} className="w-full justify-start text-destructive hover:text-destructive/90 mt-2 px-0 h-auto py-1 transition-colors duration-200">
                <X className="h-3.5 w-3.5 mr-1" /> 清除所有高级筛选
              </Button>
            )}
          </div>
        )}
        
        {/* View Filter */} 
        <FilterSection 
          title="视图" 
          icon={<Eye className="h-4 w-4" />} 
          isExpanded={true} 
          onToggle={() => {}} 
          disableToggle={true}
        >
          <div className="flex flex-wrap gap-2">
            {viewOptions.map(opt => (
              <CapsuleButton
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                onClick={() => handleViewChange(opt.value)}
                isSelected={selectedView === opt.value}
              />
            ))}
          </div>
        </FilterSection>
        
        <Separator className="my-3 opacity-70" />
        
        {/* Filters below are disabled if trash view is active */} 
        <div className={cn(isTrashViewActive && "opacity-50 pointer-events-none")}>
          {/* Project Filter */} 
          <FilterSection 
            title="项目" 
            icon={<FolderOpen className="h-4 w-4" />} 
            isExpanded={isProjectsExpanded} 
            onToggle={() => setIsProjectsExpanded(!isProjectsExpanded)}
          >
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="搜索项目..." 
                value={projectSearch} 
                onChange={(e) => setProjectSearch(e.target.value)} 
                className="h-8 pl-8 text-xs focus-visible:ring-primary focus-visible:ring-offset-0 border-gray-200 dark:border-gray-700"
              />
            </div>
            <ScrollArea className="max-h-36">
              <div className="flex flex-wrap gap-2 pr-1">
                {filteredProjects.length > 0 ? filteredProjects.map(proj => (
                  <CapsuleButton 
                    key={proj.id} 
                    label={proj.name} 
                    onClick={() => handleProjectSelection(String(proj.id))} 
                    isSelected={selectedProjectIds.includes(String(proj.id))}
                    dotColor={proj.color}
                  />
                )) : <p className="text-xs text-muted-foreground px-1">无匹配项目</p>}
              </div>
            </ScrollArea>
          </FilterSection>

          <Separator className="my-3 opacity-70" />

          {/* Tag Filter */} 
          <FilterSection 
            title="标签" 
            icon={<Tag className="h-4 w-4" />} 
            isExpanded={isTagsExpanded} 
            onToggle={() => setIsTagsExpanded(!isTagsExpanded)}
          >
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="搜索标签..." 
                value={tagSearch} 
                onChange={(e) => setTagSearch(e.target.value)} 
                className="h-8 pl-8 text-xs focus-visible:ring-primary focus-visible:ring-offset-0 border-gray-200 dark:border-gray-700"
              />
            </div>
            <ScrollArea className="max-h-36">
              <div className="flex flex-wrap gap-2 pr-1">
                {tagsWithDisplayData.length > 0 ? tagsWithDisplayData.map(tag => (
                  <CapsuleButton 
                    key={tag.name} 
                    label={tag.name}
                    count={tag.count}
                    onClick={() => handleTagSelection(tag.name)} 
                    isSelected={selectedTagNames.includes(tag.name)}
                    dotColor={tag.color}
                  />
                )) : <p className="text-xs text-muted-foreground px-1">无匹配标签</p>}
              </div>
            </ScrollArea>
          </FilterSection>

          <Separator className="my-3 opacity-70" />

          {/* Priority Filter */} 
          <FilterSection 
            title="优先级" 
            icon={<ArrowUpDown className="h-4 w-4" />} 
            isExpanded={isPrioritiesExpanded} 
            onToggle={() => setIsPrioritiesExpanded(!isPrioritiesExpanded)}
          >
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map(opt => (
                <CapsuleButton 
                  key={opt.value} 
                  label={opt.label} 
                  onClick={() => handlePrioritySelection(opt.value)} 
                  isSelected={selectedPriorities.includes(opt.value)}
                  color={opt.color}
                />
              ))}
            </div>
          </FilterSection>

          <Separator className="my-3 opacity-70" />

          {/* Date Filter */} 
          <FilterSection 
            title="日期筛选" 
            icon={<CalendarIcon className="h-4 w-4" />} 
            isExpanded={isDateFilterExpanded} 
            onToggle={() => setIsDateFilterExpanded(!isDateFilterExpanded)}
          >
            <div className="space-y-3">
              <Select value={selectedDateFilterType} onValueChange={(value: DateFilterType) => onSelectedDateFilterTypeChange(value)}>
                <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 focus:ring-primary focus-visible:ring-offset-0">
                  <SelectValue placeholder="选择日期类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate" className="text-xs">截止日期</SelectItem>
                  <SelectItem value="plannedDate" className="text-xs">计划日期</SelectItem>
                  <SelectItem value="createdAtDate" className="text-xs">创建日期</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {dateFilterPresetOptions.map(opt => (
                  <CapsuleButton
                    key={opt.value}
                    label={opt.label}
                    onClick={() => handleDatePresetChange(opt.value)}
                    isSelected={activeDateFilter === opt.value}
                  />
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    type="button"
                    variant={activeDateFilter === 'custom' ? "default" : "outline"}
                    size="sm" 
                    className={cn(
                      "w-full h-8 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 ease-in-out flex items-center justify-center",
                      activeDateFilter !== 'custom' && "bg-[#EFF6FF] dark:bg-[#374151] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-primary/70 hover:bg-primary/5"
                    )}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                    自定义范围...
                    {activeDateFilter === 'custom' && <Check className="h-3 w-3 ml-1.5" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={(range) => { 
                      onCustomDateRangeChange(range); 
                      if(range) { onActiveDateFilterChange('custom'); } 
                    }}
                    numberOfMonths={2}
                    className="border rounded-md shadow-md"
                  />
                </PopoverContent>
              </Popover>
              {activeDateFilter === 'custom' && customDateRange && (
                <div className="text-xs text-muted-foreground pt-1 px-1">
                  已选: {customDateRange.from ? format(customDateRange.from, "yyyy/MM/dd") : "未设置开始"} - {customDateRange.to ? format(customDateRange.to, "yyyy/MM/dd") : "未设置结束"}
                </div>
              )}
            </div>
          </FilterSection>
        </div>
      </div>
    </div>
  );
};

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disableToggle?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, isExpanded, onToggle, children, icon, disableToggle = false }) => {
  return (
    <div className="py-2">
      <div 
        className={cn(
          "flex justify-between items-center mb-3",
          !disableToggle && "cursor-pointer hover:text-primary transition-colors duration-200"
        )}
        onClick={disableToggle ? undefined : onToggle}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2 text-muted-foreground">{icon}</span>}
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        {!disableToggle && (
          isExpanded ? 
            <ChevronUp className="h-4 w-4 transition-transform duration-300 ease-in-out" /> : 
            <ChevronDown className="h-4 w-4 transition-transform duration-300 ease-in-out" />
        )}
      </div>
      {isExpanded && (
        <div className="transition-all duration-300 ease-in-out overflow-hidden animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

import { format } from 'date-fns';