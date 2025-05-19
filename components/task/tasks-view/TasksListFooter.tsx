// 此组件负责显示任务列表底部的汇总信息（如"X 已完成 / Y 总计"）和"添加任务"按钮。
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TasksListFooterProps {
    completedTaskCount: number;
    totalTaskCount: number;
    onOpenCreateDialog: () => void;
}

export function TasksListFooter({
    completedTaskCount,
    totalTaskCount,
    onOpenCreateDialog,
}: TasksListFooterProps) {
    return (
        <div className="flex items-center justify-between w-full pt-3 mt-auto">
            <div className="text-sm text-muted-foreground">
                {completedTaskCount} 已完成 / {totalTaskCount} 总计
            </div>
            <Button variant="outline" size="sm" onClick={onOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                添加任务
            </Button>
        </div>
    );
}
