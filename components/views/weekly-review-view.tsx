"use client"

import { useState } from "react"
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface WeeklyReview {
  id: number
  weekStartDate: Date
  weekEndDate: Date
  completed: boolean
  achievements: string[]
  challenges: string[]
  nextWeekPlan: string[]
  reflection: string
  rating: 1 | 2 | 3 | 4 | 5
}

interface WeeklyTask {
  id: number
  title: string
  completed: boolean
  dueDate: Date
  priority: "high" | "medium" | "low"
}

export function WeeklyReviewView() {
  const today = new Date()
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }))
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // 模拟数据 - 周回顾
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([
    {
      id: 1,
      weekStartDate: subWeeks(currentWeekStart, 1),
      weekEndDate: subWeeks(currentWeekEnd, 1),
      completed: true,
      achievements: ["完成了项目提案的初稿", "与三位潜在客户进行了会面", "解决了系统中的关键bug", "完成了团队培训计划"],
      challenges: ["时间管理不够有效", "项目延期", "团队沟通不畅"],
      nextWeekPlan: ["完成项目提案最终版", "开始新项目的规划", "改进团队沟通机制"],
      reflection: "这周整体表现良好，但需要改进时间管理和团队沟通。",
      rating: 4,
    },
    {
      id: 2,
      weekStartDate: subWeeks(currentWeekStart, 2),
      weekEndDate: subWeeks(currentWeekEnd, 2),
      completed: true,
      achievements: ["完成了产品发布", "获得了新客户", "解决了技术难题"],
      challenges: ["资源不足", "技术挑战", "客户需求变更"],
      nextWeekPlan: ["跟进新客户", "开始下一个产品迭代", "团队建设活动"],
      reflection: "尽管面临挑战，但团队表现出色，成功完成了产品发布。",
      rating: 5,
    },
  ])

  // 模拟数据 - 本周任务
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([
    {
      id: 1,
      title: "完成项目提案",
      completed: true,
      dueDate: addDays(currentWeekStart, 2),
      priority: "high",
    },
    {
      id: 2,
      title: "客户会议",
      completed: true,
      dueDate: addDays(currentWeekStart, 3),
      priority: "medium",
    },
    {
      id: 3,
      title: "团队周会",
      completed: false,
      dueDate: addDays(currentWeekStart, 4),
      priority: "medium",
    },
    {
      id: 4,
      title: "准备演讲材料",
      completed: false,
      dueDate: addDays(currentWeekStart, 5),
      priority: "high",
    },
    {
      id: 5,
      title: "代码审查",
      completed: false,
      dueDate: addDays(currentWeekStart, 5),
      priority: "low",
    },
  ])

  // 当前周的回顾
  const currentWeekReview = weeklyReviews.find(
    (review) =>
      format(review.weekStartDate, "yyyy-MM-dd") === format(currentWeekStart, "yyyy-MM-dd") &&
      format(review.weekEndDate, "yyyy-MM-dd") === format(currentWeekEnd, "yyyy-MM-dd"),
  )

  // 新建周回顾
  const [newReview, setNewReview] = useState<Partial<WeeklyReview>>({
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    achievements: [],
    challenges: [],
    nextWeekPlan: [],
    reflection: "",
    rating: 3,
  })

  // 新成就、挑战和计划的输入
  const [newAchievement, setNewAchievement] = useState("")
  const [newChallenge, setNewChallenge] = useState("")
  const [newPlan, setNewPlan] = useState("")

  // 添加成就
  const addAchievement = () => {
    if (newAchievement.trim()) {
      setNewReview({
        ...newReview,
        achievements: [...(newReview.achievements || []), newAchievement.trim()],
      })
      setNewAchievement("")
    }
  }

  // 添加挑战
  const addChallenge = () => {
    if (newChallenge.trim()) {
      setNewReview({
        ...newReview,
        challenges: [...(newReview.challenges || []), newChallenge.trim()],
      })
      setNewChallenge("")
    }
  }

  // 添加计划
  const addPlan = () => {
    if (newPlan.trim()) {
      setNewReview({
        ...newReview,
        nextWeekPlan: [...(newReview.nextWeekPlan || []), newPlan.trim()],
      })
      setNewPlan("")
    }
  }

  // 保存周回顾
  const saveWeeklyReview = () => {
    const review: WeeklyReview = {
      id: Date.now(),
      weekStartDate: currentWeekStart,
      weekEndDate: currentWeekEnd,
      completed: true,
      achievements: newReview.achievements || [],
      challenges: newReview.challenges || [],
      nextWeekPlan: newReview.nextWeekPlan || [],
      reflection: newReview.reflection || "",
      rating: newReview.rating as 1 | 2 | 3 | 4 | 5,
    }
    setWeeklyReviews([...weeklyReviews, review])
    setNewReview({
      weekStartDate: currentWeekStart,
      weekEndDate: currentWeekEnd,
      achievements: [],
      challenges: [],
      nextWeekPlan: [],
      reflection: "",
      rating: 3,
    })
  }

  // 上一周/下一周
  const previousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const nextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  // 计算任务完成率
  const completedTasksCount = weeklyTasks.filter((task) => task.completed).length
  const completionRate = weeklyTasks.length > 0 ? Math.round((completedTasksCount / weeklyTasks.length) * 100) : 0

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">每周回顾</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {format(currentWeekStart, "yyyy年MM月dd日", { locale: zhCN })} -{" "}
              {format(currentWeekEnd, "yyyy年MM月dd日", { locale: zhCN })}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">回顾和反思您的一周，为下一周做好准备</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {currentWeekReview ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>周回顾</CardTitle>
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  >
                    已完成
                  </Badge>
                </div>
                <CardDescription>
                  {format(currentWeekReview.weekStartDate, "yyyy年MM月dd日", { locale: zhCN })} -{" "}
                  {format(currentWeekReview.weekEndDate, "yyyy年MM月dd日", { locale: zhCN })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">本周成就</h3>
                  <ul className="space-y-2">
                    {currentWeekReview.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">面临的挑战</h3>
                  <ul className="space-y-2">
                    {currentWeekReview.challenges.map((challenge, index) => (
                      <li key={index} className="flex items-start">
                        <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">下周计划</h3>
                  <ul className="space-y-2">
                    {currentWeekReview.nextWeekPlan.map((plan, index) => (
                      <li key={index} className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span>{plan}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">反思</h3>
                  <p className="text-muted-foreground">{currentWeekReview.reflection}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">本周评分</h3>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div
                        key={rating}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          rating <= currentWeekReview.rating
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {rating}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>创建周回顾</CardTitle>
                <CardDescription>
                  {format(currentWeekStart, "yyyy年MM月dd日", { locale: zhCN })} -{" "}
                  {format(currentWeekEnd, "yyyy年MM月dd日", { locale: zhCN })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">本周成就</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        placeholder="添加一项成就..."
                        value={newAchievement}
                        onChange={(e) => setNewAchievement(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addAchievement}>添加</Button>
                    </div>
                    <ul className="space-y-2">
                      {newReview.achievements?.map((achievement, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">面临的挑战</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        placeholder="添加一项挑战..."
                        value={newChallenge}
                        onChange={(e) => setNewChallenge(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addChallenge}>添加</Button>
                    </div>
                    <ul className="space-y-2">
                      {newReview.challenges?.map((challenge, index) => (
                        <li key={index} className="flex items-start">
                          <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <span>{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">下周计划</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        placeholder="添加一项计划..."
                        value={newPlan}
                        onChange={(e) => setNewPlan(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addPlan}>添加</Button>
                    </div>
                    <ul className="space-y-2">
                      {newReview.nextWeekPlan?.map((plan, index) => (
                        <li key={index} className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                          <span>{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">反思</h3>
                  <Textarea
                    placeholder="对本周的整体反思..."
                    value={newReview.reflection || ""}
                    onChange={(e) => setNewReview({ ...newReview, reflection: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">本周评分</h3>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant="outline"
                        className={cn(
                          "w-8 h-8 p-0 rounded-full",
                          rating <= (newReview.rating || 0)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                        onClick={() => setNewReview({ ...newReview, rating: rating as 1 | 2 | 3 | 4 | 5 })}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveWeeklyReview} className="ml-auto">
                  保存周回顾
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>本周任务</CardTitle>
              <CardDescription>本周任务完成情况</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">完成率</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              <div className="space-y-4">
                {weeklyTasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-2">
                    <div
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center",
                        task.completed ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground",
                      )}
                    >
                      {task.completed && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("font-medium", task.completed && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn({
                            "border-red-500 text-red-500": task.priority === "high",
                            "border-amber-500 text-amber-500": task.priority === "medium",
                            "border-green-500 text-green-500": task.priority === "low",
                          })}
                        >
                          {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        截止日期: {format(task.dueDate, "MM月dd日", { locale: zhCN })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>历史回顾</CardTitle>
              <CardDescription>查看过去的周回顾</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyReviews
                  .filter(
                    (review) => format(review.weekStartDate, "yyyy-MM-dd") !== format(currentWeekStart, "yyyy-MM-dd"),
                  )
                  .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())
                  .map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setCurrentWeekStart(review.weekStartDate)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {format(review.weekStartDate, "MM月dd日", { locale: zhCN })} -{" "}
                          {format(review.weekEndDate, "MM月dd日", { locale: zhCN })}
                        </div>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={cn("w-2 h-2 rounded-full", i < review.rating ? "bg-primary" : "bg-muted")}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {review.achievements.length} 项成就, {review.challenges.length} 项挑战,{" "}
                        {review.nextWeekPlan.length} 项计划
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>周回顾提示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">记录成就</p>
                    <p className="text-sm text-muted-foreground">记录本周完成的任务和取得的进展</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">反思挑战</p>
                    <p className="text-sm text-muted-foreground">思考本周面临的困难和障碍</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">规划下周</p>
                    <p className="text-sm text-muted-foreground">为下周设定明确的目标和计划</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium">总结经验</p>
                    <p className="text-sm text-muted-foreground">从本周的经验中学习，不断改进</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
