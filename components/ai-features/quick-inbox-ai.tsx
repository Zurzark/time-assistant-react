
import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { InboxItem } from "@/lib/db"
import { formatRelativeTime } from "@/lib/date-utils"
import { Trash2, Zap } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InboxAIItemProps {
  item: InboxItem
  isSelected: boolean
  onToggle: (id: number, checked: boolean) => void
  onDelete: (id: number) => void
}

export function InboxAIItem({ item, isSelected, onToggle, onDelete }: InboxAIItemProps) {
  return (
    <div className="flex justify-between items-start py-2 px-3 hover:bg-muted/50 rounded-md group relative">
      <div className="flex items-start gap-3 flex-1 min-w-0">
         {/* Checkbox: Visible on hover or if selected */}
         <div className={`mt-0.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
            <Checkbox 
                checked={isSelected}
                onCheckedChange={(checked) => onToggle(item.id!, checked as boolean)}
            />
         </div>
         
         <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2">{item.content}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(item.createdAt))}</p>
         </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={() => onDelete(item.id!)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

interface InboxAIToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: (checked: boolean) => void
  onAnalyze: () => void
}

export function InboxAIToolbar({ selectedCount, totalCount, onSelectAll, onAnalyze }: InboxAIToolbarProps) {
    const isAllSelected = totalCount > 0 && selectedCount === totalCount
    
    // If partial selection, we treat the checkbox as unchecked but clicking it selects all
    // Or we could implement indeterminate state if the Checkbox component supported it easily
    
    const handleCheckedChange = (checked: boolean) => {
        onSelectAll(checked)
    }

    return (
        <div className="flex items-center gap-1 mr-2 animate-in fade-in slide-in-from-right-4 duration-300">
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAnalyze}>
                            <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>AI解析</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <div className="flex items-center justify-center h-8 w-8">
                             <Checkbox 
                                checked={isAllSelected}
                                onCheckedChange={handleCheckedChange}
                             />
                         </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isAllSelected ? "取消全选" : "全选"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
