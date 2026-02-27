"use client"

import { useState, useEffect } from "react"
import { 
  format, 
  subDays, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay,
  differenceInDays,
  differenceInMinutes
} from "date-fns"
import { 
  getAll, 
  ObjectStores, 
  Task, 
  Session, 
  Project, 
  Goal, 
  ActivityCategory,
  TimeBlock
} from "@/lib/db"

export type DateRangeType = "7days" | "30days" | "90days" | "year"

export function useAnalyticsData(dateRange: DateRangeType) {
  const [productivityData, setProductivityData] = useState<any[]>([])
  const [timeAllocationData, setTimeAllocationData] = useState<any[]>([])
  const [goalsProgressData, setGoalsProgressData] = useState<any[]>([])
  const [projectsProgressData, setProjectsProgressData] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [goalTrendData, setGoalTrendData] = useState<any[]>([])
  const [stats, setStats] = useState({
    completionRate: 0,
    totalFocusTime: 0,
    avgDailyFocusTime: 0,
    completedPomodoros: 0,
    productivityScore: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let startDate = subDays(now, 30) // Default
        
        if (dateRange === "7days") startDate = subDays(now, 7)
        if (dateRange === "90days") startDate = subDays(now, 90)
        if (dateRange === "year") startDate = subMonths(now, 12)

        // Adjust start date to beginning of day, end date to end of day
        const start = startOfDay(startDate)
        const end = endOfDay(now)

        // Fetch Data
        const [tasks, sessions, goals, projects, categories, timeBlocks] = await Promise.all([
          getAll<Task>(ObjectStores.TASKS),
          getAll<Session>(ObjectStores.SESSIONS),
          getAll<Goal>(ObjectStores.GOALS),
          getAll<Project>(ObjectStores.PROJECTS),
          getAll<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES),
          getAll<TimeBlock>(ObjectStores.TIME_BLOCKS)
        ])

        // Filter logged time blocks (actual time spent)
        const loggedBlocks = timeBlocks.filter(tb => tb.isLogged === 1)

        // Helper to check if date is in range
        const isInRange = (date: Date | string | undefined) => {
          if (!date) return false
          const d = typeof date === 'string' ? parseISO(date) : date
          return isWithinInterval(d, { start, end })
        }

        // Helper to calculate duration in hours for a block
        const getBlockDurationHours = (block: TimeBlock) => {
            if (block.durationMinutes) return block.durationMinutes / 60
            const start = new Date(block.startTime)
            const end = new Date(block.endTime)
            const diff = differenceInMinutes(end, start)
            return diff > 0 ? diff / 60 : 0
        }

        // Helper to calculate duration in milliseconds for a block (for consistency with old session logic if needed, but we use hours mostly)
        const getBlockDurationMs = (block: TimeBlock) => {
            return getBlockDurationHours(block) * 60 * 60 * 1000
        }

        // --- 1. Productivity Data ---
        // Generate array of days
        const days = eachDayOfInterval({ start, end })
        const prodData = days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd")
          const displayDate = dateRange === "year" ? format(day, "yyyy-MM") : format(day, "MM-dd")
          
          // Filter tasks completed on this day
          const completedTasks = tasks.filter(t => 
            t.completed === 1 && 
            t.completedAt && 
            isSameDay(new Date(t.completedAt), day)
          ).length

          // Filter logged blocks on this day
          const dayBlocks = loggedBlocks.filter(b => 
            isSameDay(new Date(b.startTime), day)
          )
          const focusTimeHours = dayBlocks.reduce((acc, b) => acc + getBlockDurationHours(b), 0)

          return {
            date: displayDate,
            fullDate: dateStr,
            "完成任务数": completedTasks,
            "专注时间": parseFloat(focusTimeHours.toFixed(1))
          }
        })

        // Group by month if year view (to reduce data points)
        if (dateRange === "year") {
           // Simple aggregation by month
           const monthlyData: Record<string, { date: string, "完成任务数": number, "专注时间": number, count: number }> = {}
           prodData.forEach(d => {
             if (!monthlyData[d.date]) {
               monthlyData[d.date] = { date: d.date, "完成任务数": 0, "专注时间": 0, count: 0 }
             }
             monthlyData[d.date]["完成任务数"] += d["完成任务数"]
             monthlyData[d.date]["专注时间"] += d["专注时间"]
             monthlyData[d.date].count++
           })
           setProductivityData(Object.values(monthlyData))
        } else {
           setProductivityData(prodData)
        }

        // --- 2. Stats ---
        const blocksInRange = loggedBlocks.filter(b => isInRange(b.startTime))
        const totalFocusTimeHours = blocksInRange.reduce((acc, b) => acc + getBlockDurationHours(b), 0)
        
        const daysCount = differenceInDays(end, start) + 1
        const avgDailyFocusTime = totalFocusTimeHours / daysCount

        const sessionsInRange = sessions.filter(s => isInRange(s.startTime))
        const completedPomodoros = sessionsInRange.length // Keep using sessions for accurate Pomodoro count

        const completedTasksInRange = tasks.filter(t => t.completed === 1 && isInRange(t.completedAt)).length
        const createdTasksInRange = tasks.filter(t => isInRange(t.createdAt)).length
        const completionRate = createdTasksInRange > 0 ? Math.round((completedTasksInRange / createdTasksInRange) * 100) : 0
        
        // Simple score: (completionRate * 0.5) + (focusTime * 5 per hour capped at 50)
        const score = Math.min(100, Math.round((completionRate * 0.5) + (Math.min(50, avgDailyFocusTime * 10))))

        setStats({
          completionRate,
          totalFocusTime: Math.round(totalFocusTimeHours),
          avgDailyFocusTime: parseFloat(avgDailyFocusTime.toFixed(1)),
          completedPomodoros,
          productivityScore: score
        })

        // --- 3. Time Allocation ---
        const categoryDuration: Record<string, number> = {}
        blocksInRange.forEach(b => {
          let categoryName = "其他"
          
          // 1. Try direct activityCategoryId from TimeBlock
          if (b.activityCategoryId) {
              const cat = categories.find(c => c.id === b.activityCategoryId)
              if (cat) categoryName = cat.name
          } 
          // 2. Try associated Task
          else if (b.taskId) {
            const task = tasks.find(t => t.id === b.taskId)
            if (task) {
                if (task.category) categoryName = task.category
                else if (task.defaultActivityCategoryId) {
                    const cat = categories.find(c => c.id === task.defaultActivityCategoryId)
                    if (cat) categoryName = cat.name
                }
            }
          }

          categoryDuration[categoryName] = (categoryDuration[categoryName] || 0) + getBlockDurationHours(b)
        })

        const totalDuration = Object.values(categoryDuration).reduce((a, b) => a + b, 0)
        const timeAlloc = Object.entries(categoryDuration).map(([name, duration]) => ({
          name,
          value: totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0,
          rawValue: duration // keep for debugging
        })).sort((a, b) => b.value - a.value)
        
        setTimeAllocationData(timeAlloc)

        // --- 4. Heatmap (Always current month, independent of selected range) ---
        const heatmapStart = startOfMonth(now)
        const heatmapEnd = endOfMonth(now)
        const heatmapDays = eachDayOfInterval({ start: heatmapStart, end: heatmapEnd })
        
        const hmData = heatmapDays.map(day => {
          const dayBlocks = loggedBlocks.filter(b => isSameDay(new Date(b.startTime), day))
          const hours = dayBlocks.reduce((acc, b) => acc + getBlockDurationHours(b), 0)
          return {
            date: format(day, "yyyy-MM-dd"),
            value: Math.round(hours) // Round to nearest hour for intensity
          }
        })
        setHeatmapData(hmData)

        // --- 5. Goals Progress & Time Spent ---
        const goalsData = goals.map(g => {
            // Calculate time spent on this goal in the selected range
            const timeSpent = blocksInRange.filter(b => {
                if (b.taskId) {
                    const t = tasks.find(task => task.id === b.taskId)
                    return t?.goalId === g.id
                }
                return false
            }).reduce((acc, b) => acc + getBlockDurationHours(b), 0)

            return {
                name: g.name,
                "已完成": g.progress || 0,
                "总进度": 100,
                timeSpent: Math.round(timeSpent * 10) / 10 // Round to 1 decimal
            }
        })
        setGoalsProgressData(goalsData)

        // --- Goal Trend (Completed tasks linked to goals within range) ---
        let trendData: any[] = []
        
        if (dateRange === "year" || dateRange === "90days") {
             // Monthly view for longer ranges
             const trendMap: Record<string, number> = {}
             // Generate all months in range to ensure continuity
             let current = startOfMonth(start)
             const endMonth = endOfMonth(end)
             
             while (current <= endMonth) {
                 trendMap[format(current, "yyyy-MM")] = 0
                 current = subMonths(current, -1) // add 1 month
             }

             tasks.filter(t => t.goalId && t.completed === 1 && t.completedAt && isInRange(t.completedAt)).forEach(t => {
                const key = format(new Date(t.completedAt!), "yyyy-MM")
                if (trendMap[key] !== undefined) {
                    trendMap[key]++
                }
             })

             trendData = Object.entries(trendMap).map(([date, count]) => ({
                date, 
                "进度": count 
             })).sort((a, b) => a.date.localeCompare(b.date))

        } else {
            // Daily view for shorter ranges (7days, 30days)
             const trendMap: Record<string, number> = {}
             days.forEach(day => {
                 trendMap[format(day, "yyyy-MM-dd")] = 0
             })

             tasks.filter(t => t.goalId && t.completed === 1 && t.completedAt && isInRange(t.completedAt)).forEach(t => {
                const key = format(new Date(t.completedAt!), "yyyy-MM-dd")
                if (trendMap[key] !== undefined) {
                    trendMap[key]++
                }
             })

             trendData = Object.entries(trendMap).map(([date, count]) => ({
                date: dateRange === "7days" ? format(parseISO(date), "MM-dd") : format(parseISO(date), "MM-dd"), 
                "进度": count
             })).sort((a, b) => a.date.localeCompare(b.date)) // Note: MM-dd sort works for same year
        }
        
        setGoalTrendData(trendData)

        // --- 6. Projects Progress & Task Stats ---
        const projectsData = projects.map(p => {
          // Calculate time spent on project using blocksInRange
          const timeSpentMs = blocksInRange.filter(b => {
            if (b.taskId) {
                const t = tasks.find(task => task.id === b.taskId)
                return t?.projectId === p.id
            }
            return false
          }).reduce((acc, b) => acc + getBlockDurationMs(b), 0)

          // Calculate task stats for this project
          const projectTasks = tasks.filter(t => t.projectId === p.id)
          const totalTasks = projectTasks.length
          const completedTasks = projectTasks.filter(t => t.completed === 1).length
          const pendingTasks = totalTasks - completedTasks

          return {
            name: p.name,
            "已完成": p.progress || 0,
            "总进度": 100,
            timeSpent: timeSpentMs,
            totalTasks,
            completedTasks,
            pendingTasks
          }
        })
        setProjectsProgressData(projectsData)

        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch analytics data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  return {
    productivityData,
    timeAllocationData,
    goalsProgressData,
    goalTrendData,
    projectsProgressData,
    heatmapData,
    stats,
    loading
  }
}