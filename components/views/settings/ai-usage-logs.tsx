
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAll, ObjectStores, LLMUsageLog, get, LLMUsageStats } from "@/lib/db"
import { format } from "date-fns"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AIUsageLogs() {
  const [logs, setLogs] = useState<LLMUsageLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCost, setTotalCost] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const [allLogs, stats] = await Promise.all([
        getAll<LLMUsageLog>(ObjectStores.LLM_USAGE_LOGS),
        get<LLMUsageStats>(ObjectStores.LLM_USAGE_STATS, 'global').catch(() => null)
      ])
      
      // Sort by date descending
      const sortedLogs = allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setLogs(sortedLogs)
      
      if (stats) {
        setTotalCost(stats.totalCost)
        setTotalCount(stats.totalCount)
      } else {
        // Fallback or initial state if no stats yet (though backend should handle creation)
        // If stats store is empty but logs exist (migration case), we might want to calculate from logs, 
        // but since we prune logs, this would be inaccurate for historical totals. 
        // For now, start from 0 or what's available.
        setTotalCost(0)
        setTotalCount(0)
      }
    } catch (error) {
      console.error("Failed to load LLM usage logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-medium">调用记录</h3>
                <p className="text-sm text-muted-foreground">查看 LLM 接口的调用历史和费用统计。</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                刷新
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">累计费用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总调用次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>历史记录</CardTitle>
          <CardDescription>最近的 API 调用详情</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无调用记录</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>Tokens (Prompt/Completion)</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead className="text-right">费用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell>{log.model}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                            <span>总计: {log.tokens.total}</span>
                            <span className="text-muted-foreground">({log.tokens.prompt} / {log.tokens.completion})</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.duration}ms</TableCell>
                      <TableCell className="text-right">¥{log.cost.toFixed(6)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
