"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  format,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  formatISO,
} from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Briefcase, // Placeholder for Task icon
  Tag,      // Placeholder for Category icon
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select" // Keep for future filter or sort options if needed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog" // Keep for delete confirmation
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" // Potentially for a search/filter bar later
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" // For date picker if custom range is added for analytics
import { Calendar } from "@/components/ui/calendar" // For date picker
import { Textarea } from "@/components/ui/textarea" // If inline editing or quick notes were to be added beyond modal
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  TimeBlock,
  ActivityCategory,
  Task,
  Project,
  ObjectStores,
  getLoggedTimeBlocksByDate,
  getLoggedTimeBlocksByDateRange,
  getAll,
  remove as removeFromDB,
} from "@/lib/db" // Assuming db.ts is in lib

// 引入 TimeBlockEntryModal
import TimeBlockEntryModal, { TimeBlockModalMode } from "@/components/time/time-block-entry-modal";

interface EnrichedTimeBlock extends TimeBlock {
  durationDisplay: string; // e.g., "1小时 30分钟"
  categoryName?: string;
  categoryColor?: string;
  taskTitle?: string;
  projectName?: string;
}

// Default color for categories if not specified
const DEFAULT_CATEGORY_COLOR = "#71717A" // zinc-500

export function TimeLogView() {
  const today = new Date()
  const [currentDisplayDate, setCurrentDisplayDate] = useState(today) // For week navigation
  const [selectedDate, setSelectedDate] = useState(today) // For displaying single day's logs

  const [loggedEntries, setLoggedEntries] = useState<TimeBlock[]>([])
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalDisplayMode, setModalDisplayMode] = useState<TimeBlockModalMode>("log-create");
  const [modalInitialData, setModalInitialData] = useState<Partial<TimeBlock> | undefined>(undefined);

  const [editingEntry, setEditingEntry] = useState<TimeBlock | null>(null) // 可以考虑移除，如果 modalInitialData 足够

  // For delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<TimeBlock | null>(null)
  
  const [analysisTimeRange, setAnalysisTimeRange] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [customAnalysisRange, setCustomAnalysisRange] = useState<{ from?: Date; to?: Date }>({});


  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categories, dbTasks, dbProjects] = await Promise.all([
        getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
        getAll<Task>(ObjectStores.TASKS),
        getAll<Project>(ObjectStores.PROJECTS),
      ])
      setActivityCategories(categories)
      setTasks(dbTasks)
      setProjects(dbProjects)
    } catch (error) {
      console.error("Error fetching initial data:", error)
      // Handle error (e.g., show toast)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchLoggedEntriesForDate = useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const dateString = format(date, "yyyy-MM-dd")
      const entries = await getLoggedTimeBlocksByDate(dateString)
      setLoggedEntries(entries)
    } catch (error) {
      console.error("Error fetching logged entries for date:", error)
      setLoggedEntries([]) // Clear on error
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchLoggedEntriesForDate(selectedDate)
  }, [selectedDate, fetchLoggedEntriesForDate])

  const getCategoryDetails = useCallback(
    (categoryId: number | undefined) => {
      if (!categoryId) return { name: "未分类", color: DEFAULT_CATEGORY_COLOR }
      const found = activityCategories.find((cat) => cat.id === categoryId)
      return {
        name: found?.name || "未知分类",
        color: found?.color || DEFAULT_CATEGORY_COLOR,
        icon: found?.icon, // Assuming ActivityCategory has an icon field
      }
    },
    [activityCategories],
  )

  const getTaskDetails = useCallback(
    (taskId: number | string | undefined) => {
      if (!taskId) return undefined
      return tasks.find((task) => task.id === taskId)
    },
    [tasks],
  )

  const getProjectDetails = useCallback(
    (projectId: number | string | undefined) => {
      if (!projectId) return undefined
      return projects.find((proj) => proj.id === projectId)
    },
    [projects],
  )

  const calculateDuration = (entry: TimeBlock): number => {
    // 如果是已记录的条目（isLogged=1）且有明确设置的durationMinutes，优先使用
    if (entry.isLogged === 1 && entry.durationMinutes !== undefined) {
      return entry.durationMinutes;
    }
    
    // 其次，尝试从实际开始/结束时间计算
    if (entry.actualStartTime && entry.actualEndTime) {
      const start = typeof entry.actualStartTime === 'string' ? parseISO(entry.actualStartTime) : entry.actualStartTime;
      const end = typeof entry.actualEndTime === 'string' ? parseISO(entry.actualEndTime) : entry.actualEndTime;
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
    }
    
    // 最后使用durationMinutes字段（对于计划条目）或默认为0
    return entry.durationMinutes || 0
  }

  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes === 0) return "0分钟"
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    let result = ""
    if (hours > 0) result += `${hours}小时 `
    if (minutes > 0) result += `${minutes}分钟`
    return result.trim()
  }

  const enrichedEntriesForSelectedDate = useMemo(() => {
    return loggedEntries
      .map((entry) => {
        const duration = calculateDuration(entry)
        const category = getCategoryDetails(entry.activityCategoryId)
        const task = getTaskDetails(entry.taskId)
        const project = task ? getProjectDetails(task.projectId) : undefined

        return {
          ...entry,
          durationDisplay: formatDuration(duration),
          actualDurationMinutes: duration, // Store calculated minutes for aggregation
          categoryName: category.name,
          categoryColor: category.color,
          taskTitle: task?.title,
          projectName: project?.name,
        }
      })
      .sort((a, b) => {
        const aStartTime = a.actualStartTime ? (typeof a.actualStartTime === 'string' ? parseISO(a.actualStartTime) : a.actualStartTime).getTime() : 0;
        const bStartTime = b.actualStartTime ? (typeof b.actualStartTime === 'string' ? parseISO(b.actualStartTime) : b.actualStartTime).getTime() : 0;
        return aStartTime - bStartTime;
      })
  }, [loggedEntries, getCategoryDetails, getTaskDetails, getProjectDetails])

  const totalDurationForSelectedDate = useMemo(() => {
    return enrichedEntriesForSelectedDate.reduce((sum, entry) => sum + (entry.actualDurationMinutes || 0) , 0)
  }, [enrichedEntriesForSelectedDate])

  // Week navigation
  const startOfCurrentDisplayWeek = startOfWeek(currentDisplayDate, { weekStartsOn: 1 })
  const daysOfWeek = eachDayOfInterval({
    start: startOfCurrentDisplayWeek,
    end: addDays(startOfCurrentDisplayWeek, 6),
  })

  const previousWeek = () => setCurrentDisplayDate(addDays(currentDisplayDate, -7))
  const nextWeek = () => setCurrentDisplayDate(addDays(currentDisplayDate, 7))
  const goToToday = () => {
    setCurrentDisplayDate(today)
    setSelectedDate(today)
  }

  const handleOpenModal = (mode: TimeBlockModalMode, data?: Partial<TimeBlock & { originalPlan?: { startTime: Date; endTime: Date } }>) => {
    setModalDisplayMode(mode);
    setModalInitialData(data);
    setIsModalOpen(true);
  };

  const handleAddEntry = () => {
    // 当直接从时间日志页面添加时，我们总是创建一个新的"日志条目"
    // isLogged 将在模态框内部根据其 "log-create" 模式设置为 1
    handleOpenModal("log-create", { date: format(selectedDate, "yyyy-MM-dd") }); 
  };

  const handleEditEntry = (entry: TimeBlock) => {
    // 编辑现有日志条目
    handleOpenModal("log-edit", entry);
  };

  const handleDeleteConfirmation = (entry: TimeBlock) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  }
  
  const handleDeleteEntry = async () => {
    if (!entryToDelete || typeof entryToDelete.id === 'undefined') return;
    try {
      await removeFromDB(ObjectStores.TIME_BLOCKS, entryToDelete.id);
      fetchLoggedEntriesForDate(selectedDate); 
      fetchWeeklyTotals(daysOfWeek); // 刷新周视图的每日总计
    } catch (error) {
      console.error("Error deleting entry:", error);
      // Show error toast
    } finally {
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  }

  const handleModalSubmitSuccess = (updatedEntry: TimeBlock) => {
    setIsModalOpen(false);
    fetchLoggedEntriesForDate(selectedDate); // 刷新当前选定日期的日志列表
    fetchWeeklyTotals(daysOfWeek); // 刷新周视图的每日总计
    // 如果有更广泛的分析视图（例如月视图），也需要刷新
  };

  // Daily totals for week view
  const [weeklyTotals, setWeeklyTotals] = useState<Map<string, number>>(new Map());

  const fetchWeeklyTotals = useCallback(async (weekDays: Date[]) => {
    if (weekDays.length === 0) return;
    const startDate = format(weekDays[0], "yyyy-MM-dd");
    const endDate = format(weekDays[weekDays.length - 1], "yyyy-MM-dd");
    try {
      const entries = await getLoggedTimeBlocksByDateRange(startDate, endDate);
      const totals = new Map<string, number>();
      weekDays.forEach(day => totals.set(format(day, "yyyy-MM-dd"), 0));
      entries.forEach(entry => {
        const dayKey = entry.date; // Assumes entry.date is "yyyy-MM-dd"
        const duration = calculateDuration(entry);
        totals.set(dayKey, (totals.get(dayKey) || 0) + duration);
      });
      setWeeklyTotals(totals);
    } catch (error) {
      console.error("Error fetching weekly totals:", error);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyTotals(daysOfWeek);
  }, [daysOfWeek, fetchWeeklyTotals]);


  // --- Analysis Data Calculations ---
  const analysisData = useMemo(() => {
    // This would expand if 'analysisTimeRange' and 'customAnalysisRange' were fully implemented
    // For now, it's based on enrichedEntriesForSelectedDate (i.e., selected day)
    const dataToAnalyze = enrichedEntriesForSelectedDate;
    const totalDuration = dataToAnalyze.reduce((sum, e) => sum + (e.actualDurationMinutes || 0), 0);

    const byCategory = activityCategories
      .map(cat => {
        const entriesInCat = dataToAnalyze.filter(e => e.activityCategoryId === cat.id);
        const durationInCat = entriesInCat.reduce((sum, e) => sum + (e.actualDurationMinutes || 0), 0);
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color || DEFAULT_CATEGORY_COLOR,
          icon: cat.icon,
          totalDuration: durationInCat,
          percentage: totalDuration > 0 ? Math.round((durationInCat / totalDuration) * 100) : 0,
        };
      })
      .filter(c => c.totalDuration > 0)
      .sort((a,b) => b.totalDuration - a.totalDuration);

    const byProject = projects
      .map(proj => {
        const entriesInProj = dataToAnalyze.filter(e => {
          const task = getTaskDetails(e.taskId);
          return task?.projectId === proj.id;
        });
        const durationInProj = entriesInProj.reduce((sum, e) => sum + (e.actualDurationMinutes || 0), 0);
        return {
          id: proj.id,
          name: proj.name,
          color: proj.color, // Assuming project might have a color
          totalDuration: durationInProj,
          percentage: totalDuration > 0 ? Math.round((durationInProj / totalDuration) * 100) : 0,
        };
      })
      .filter(p => p.totalDuration > 0)
      .sort((a,b) => b.totalDuration - a.totalDuration);
      
    // Handle "Unassigned Project" time
    const unassignedProjectTime = dataToAnalyze
      .filter(e => !e.taskId || !getTaskDetails(e.taskId)?.projectId)
      .reduce((sum, e) => sum + (e.actualDurationMinutes || 0), 0);

    if (unassignedProjectTime > 0) {
        byProject.push({
            id: -1,
            name: '未分配项目',
            color: DEFAULT_CATEGORY_COLOR,
            totalDuration: unassignedProjectTime,
            percentage: totalDuration > 0 ? Math.round((unassignedProjectTime / totalDuration) * 100) : 0,
        });
    }

    return { byCategory, byProject, totalDurationForAnalysis: totalDuration };
  }, [enrichedEntriesForSelectedDate, activityCategories, projects, getTaskDetails]);

  // Weekly Summary Card Data
   const weeklySummaryData = useMemo(() => {
    let maxWeeklyDayTotal = 0;
    const summary = daysOfWeek.map(day => {
        const dayKey = format(day, "yyyy-MM-dd");
        const total = weeklyTotals.get(dayKey) || 0;
        if (total > maxWeeklyDayTotal) maxWeeklyDayTotal = total;
        return {
            date: day,
            totalDuration: total,
            formattedDuration: formatDuration(total),
        };
    });
    return summary.map(s => ({
        ...s,
        percentage: maxWeeklyDayTotal > 0 ? Math.round((s.totalDuration / maxWeeklyDayTotal) * 100) : 0,
    }));
  }, [daysOfWeek, weeklyTotals]);


  if (isLoading && loggedEntries.length === 0 && activityCategories.length === 0) {
    // Initial full page load
    return <div className="container py-6 text-center">加载中...</div>;
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">时间日志</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              今天
            </Button>
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleAddEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加时间记录
                </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          基于实际发生的时间条目，准确回顾与分析您的时间花费。
        </p>
      </div>

      {/* Week Day Picker */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-4">
        {daysOfWeek.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const dailyTotalMinutes = weeklyTotals.get(dayKey) || 0;

          return (
            <div
              key={day.toString()}
              className={cn(
                "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                isSelected ? "border-primary bg-primary/10 shadow-lg" : "hover:bg-muted/50",
                isToday && !isSelected && "border-foreground/50",
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-center mb-1">
                <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: zhCN })}</div>
                <div className={cn("text-2xl font-bold", isToday && "text-primary")}>{format(day, "d")}</div>
              </div>
              <div className="text-center text-xs h-8 flex items-center justify-center">
                {dailyTotalMinutes > 0 ? (
                  <span className="text-primary font-medium">{formatDuration(dailyTotalMinutes)}</span>
                ) : (
                  <span className="text-muted-foreground">无记录</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content: Log List and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {format(selectedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })}的时间记录
                </CardTitle>
                <div className="text-sm font-semibold text-primary">
                  总计: {formatDuration(totalDurationForSelectedDate)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && enrichedEntriesForSelectedDate.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">正在加载记录...</div>
              ) : enrichedEntriesForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {enrichedEntriesForSelectedDate.map((entry) => (
                    <div key={entry.id} className="flex items-start border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                      <div className="w-28 text-sm pr-3 shrink-0">
                        <div className="font-semibold text-foreground">
                          {entry.actualStartTime ? format(typeof entry.actualStartTime === 'string' ? parseISO(entry.actualStartTime) : entry.actualStartTime, "HH:mm") : "--:--"}
                          {" - "}
                          {entry.actualEndTime ? format(typeof entry.actualEndTime === 'string' ? parseISO(entry.actualEndTime) : entry.actualEndTime, "HH:mm") : "--:--"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{entry.durationDisplay}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-base truncate" title={entry.title}>{entry.title}</h4>
                          <div className="flex items-center space-x-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntry(entry)}>
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteConfirmation(entry)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-1.5 text-xs">
                          {entry.activityCategoryId && (
                            <span className="flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: `${entry.categoryColor}20` /* 20 for alpha */, color: entry.categoryColor }}>
                              <Tag className="h-3 w-3 mr-1" style={{ color: entry.categoryColor}}/>
                              {entry.categoryName}
                            </span>
                          )}
                          {entry.taskId && entry.taskTitle && (
                             <span className="flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                               <Briefcase className="h-3 w-3 mr-1" />
                               <span className="truncate max-w-[120px]" title={entry.taskTitle}>
                                {entry.projectName ? `${entry.projectName} / ${entry.taskTitle}` : entry.taskTitle}
                               </span>
                             </span>
                          )}
                        </div>
                        {entry.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">没有时间记录</h3>
                  <p className="text-muted-foreground mb-6">这一天没有记录任何时间花费。</p>
                  <Button size="sm" onClick={handleAddEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加第一条记录
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
              <CardTitle>时间分析</CardTitle>
                 {/* Optional: Add date range picker for analysis here */}
              </div>
              <p className="text-xs text-muted-foreground">基于 {format(selectedDate, "M月d日", { locale: zhCN })} 的数据</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="category" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="category">按类别</TabsTrigger>
                  <TabsTrigger value="project">按项目</TabsTrigger>
                </TabsList>
                <TabsContent value="category" className="mt-4">
                  {analysisData.byCategory.length > 0 ? (
                    <div className="space-y-3">
                      {analysisData.byCategory.map((cat) => (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                              <span className="font-medium">{cat.name}</span>
                            </div>
                            <div className="text-muted-foreground font-medium">{formatDuration(cat.totalDuration)}</div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">无足够数据进行分类别分析</p>}
                </TabsContent>
                <TabsContent value="project" className="mt-4">
                 {analysisData.byProject.length > 0 ? (
                    <div className="space-y-3">
                      {analysisData.byProject.map((proj) => (
                        <div key={proj.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                             <div className="flex items-center">
                                <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: proj.color || DEFAULT_CATEGORY_COLOR }} />
                                <span className="font-medium">{proj.name}</span>
                              </div>
                            <div className="text-muted-foreground font-medium">{formatDuration(proj.totalDuration)}</div>
                            </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ width: `${proj.percentage}%`, backgroundColor: proj.color || DEFAULT_CATEGORY_COLOR }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">无足够数据进行按项目分析</p>}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>本周总结</CardTitle>
               <p className="text-xs text-muted-foreground">
                {format(startOfCurrentDisplayWeek, "M月d日")} - {format(addDays(startOfCurrentDisplayWeek, 6), "M月d日")}
               </p>
            </CardHeader>
            <CardContent>
              {weeklySummaryData.length > 0 ? (
                <div className="space-y-3">
                  {weeklySummaryData.map((daySummary) => (
                    <div key={daySummary.date.toString()} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn("font-medium", isSameDay(daySummary.date, today) && "text-primary")}>
                          {format(daySummary.date, "EEE, M/d", { locale: zhCN })}
                        </span>
                        <div className="text-muted-foreground font-medium">{daySummary.formattedDuration}</div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className={cn("h-2.5 rounded-full", isSameDay(daySummary.date, selectedDate) ? "bg-primary" : "bg-primary/60")}
                          style={{ width: `${daySummary.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">本周尚无时间记录</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Implementation */}
      {isModalOpen && (
        <TimeBlockEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={handleModalSubmitSuccess}
          mode={modalDisplayMode}
          initialData={modalInitialData}
          selectedDate={selectedDate} // Pass the currently selected date from the view
          tasks={tasks} // Pass fetched tasks
          activityCategories={activityCategories} // Pass fetched categories
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除这条时间记录吗？此操作无法撤销。
              {entryToDelete && <span className="mt-2 font-medium block">"{entryToDelete.title}"</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteEntry}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
