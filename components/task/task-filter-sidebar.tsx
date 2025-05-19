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
  CheckSquare, Clock, Flag, Tag, Calendar as CalendarIcon, Trash2, X, Search, ChevronDown, ChevronUp, Check
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
    <Badge variant="secondary" className="flex items-center space-x-1 py-1 px-2 text-xs h-6">
      <span>{label}</span>
      <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={onRemove}>
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
}

const CapsuleButton: React.FC<CapsuleButtonProps> = ({ label, onClick, isSelected, className, icon, color }) => {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-auto px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all duration-150 ease-in-out",
        isSelected && "shadow-md",
        color && isSelected ? `bg-[${color}] hover:bg-[${color}]/90 border-[${color}] text-white` : "",
        color && !isSelected ? `border-[${color}] text-[${color}] hover:bg-[${color}]/10` : "",
        className
      )}
      onClick={onClick}
    >
      {isSelected && icon && <span className="mr-1.5">{icon}</span>}
      {label}
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
    { label: "重要且紧急", value: "important-urgent", color: "hsl(var(--destructive))" },
    { label: "重要不紧急", value: "important-not-urgent", color: "hsl(var(--warning))" },
    { label: "不重要紧急", value: "not-important-urgent", color: "hsl(var(--info))" },
    { label: "不重要不紧急", value: "not-important-not-urgent", color: "hsl(var(--success))" },
  ];

  const viewOptions = [
    { label: "所有任务", value: "all" },
    { label: "下一步行动", value: "next-actions" },
    { label: "已完成任务", value: "completed" },
    { label: "将来/也许", value: "someday-maybe" },
    { label: "等待中", value: "waiting" },
    { label: "回收站", value: "trash" },
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
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold">
              高级筛选
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
           {/* Active Filters Pills Display */} 
          {(isAnyAdvancedFilterApplied || isTrashViewActive) && (
            <div className="mb-3 p-2 border rounded-md bg-muted/30">
              <h5 className="text-xs font-medium mb-1.5 text-muted-foreground">
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
                <Button variant="link" size="sm" onClick={onClearAllAdvancedFilters} className="w-full justify-start text-destructive hover:text-destructive/90 mt-2 px-0 h-auto py-1">
                  <X className="h-3.5 w-3.5 mr-1" /> 清除所有高级筛选
                </Button>
              )}
            </div>
          )}
          
          {/* View Filter */} 
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-1.5">视图</h4>
            <div className="flex flex-wrap gap-1.5">
              {viewOptions.map(opt => (
                <CapsuleButton
                  key={opt.value}
                  label={opt.label}
                  onClick={() => handleViewChange(opt.value)}
                  isSelected={selectedView === opt.value}
                />
              ))}
            </div>
          </div>
          
          {/* Filters below are disabled if trash view is active */} 
          <div className={cn(isTrashViewActive && "opacity-50 pointer-events-none")}>
            {/* Project Filter */} 
            <FilterSection title="项目" isExpanded={isProjectsExpanded} onToggle={() => setIsProjectsExpanded(!isProjectsExpanded)}>
              <Input 
                type="search" placeholder="搜索项目..." value={projectSearch} 
                onChange={(e) => setProjectSearch(e.target.value)} className="h-8 mb-2 text-xs"
              />
              <ScrollArea className="max-h-36">
                <div className="flex flex-wrap gap-1.5 pr-1">
                  {filteredProjects.length > 0 ? filteredProjects.map(proj => (
                    <CapsuleButton 
                      key={proj.id} 
                      label={proj.name} 
                      onClick={() => handleProjectSelection(String(proj.id))} 
                      isSelected={selectedProjectIds.includes(String(proj.id))}
                      icon={<Check className="h-3 w-3"/>}
                    />
                  )) : <p className="text-xs text-muted-foreground px-1">无匹配项目</p>}
                </div>
              </ScrollArea>
            </FilterSection>

            {/* Tag Filter */} 
            <FilterSection title="标签" isExpanded={isTagsExpanded} onToggle={() => setIsTagsExpanded(!isTagsExpanded)}>
              <Input 
                type="search" placeholder="搜索标签..." value={tagSearch} 
                onChange={(e) => setTagSearch(e.target.value)} className="h-8 mb-2 text-xs"
              />
              <ScrollArea className="max-h-36">
                <div className="flex flex-wrap gap-1.5 pr-1">
                  {tagsWithDisplayData.length > 0 ? tagsWithDisplayData.map(tag => (
                    <CapsuleButton 
                      key={tag.name} 
                      label={`${tag.name} (${tag.count})`}
                      onClick={() => handleTagSelection(tag.name)} 
                      isSelected={selectedTagNames.includes(tag.name)}
                      icon={<Check className="h-3 w-3"/>}
                    />
                  )) : <p className="text-xs text-muted-foreground px-1">无匹配标签</p>}
                </div>
              </ScrollArea>
            </FilterSection>

            {/* Priority Filter */} 
            <FilterSection title="优先级" isExpanded={isPrioritiesExpanded} onToggle={() => setIsPrioritiesExpanded(!isPrioritiesExpanded)}>
              <div className="flex flex-wrap gap-1.5">
                {priorityOptions.map(opt => (
                  <CapsuleButton 
                    key={opt.value} 
                    label={opt.label} 
                    onClick={() => handlePrioritySelection(opt.value)} 
                    isSelected={selectedPriorities.includes(opt.value)}
                    icon={<Check className="h-3 w-3"/>}
                    color={opt.color}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Date Filter */} 
            <FilterSection title="日期筛选" isExpanded={isDateFilterExpanded} onToggle={() => setIsDateFilterExpanded(!isDateFilterExpanded)}>
              <div className="space-y-2">
                <Select value={selectedDateFilterType} onValueChange={(value: DateFilterType) => onSelectedDateFilterTypeChange(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="选择日期类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate" className="text-xs">截止日期</SelectItem>
                    <SelectItem value="plannedDate" className="text-xs">计划日期</SelectItem>
                    <SelectItem value="createdAtDate" className="text-xs">创建日期</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5">
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
                      variant={activeDateFilter === 'custom' ? "default" : "outline"}
                      size="sm" 
                      className="w-full h-auto px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all duration-150 ease-in-out">
                      自定义范围...
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
        </CardContent>
      </Card>
    </div>
  );
};

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, isExpanded, onToggle, children }) => {
  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-1.5 cursor-pointer" onClick={onToggle}>
        <h4 className="text-sm font-medium">{title}</h4>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      {isExpanded && (
        <div className="transition-all duration-300 ease-in-out overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

import { format } from 'date-fns';