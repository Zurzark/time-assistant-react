import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    LayoutGrid,
    LayoutList,
    Search,
    SlidersHorizontal,
} from "lucide-react";

interface TaskListHeaderProps {
    dynamicListTitle: string;
    taskCount: number;
    searchTermInput: string;
    onSearchTermChange: (term: string) => void;
    sortBy: string;
    onSortByChange: (sortKey: string) => void;
    viewMode: "list" | "board";
    onViewModeChange: (mode: "list" | "board") => void;
    showSelectAllCheckbox: boolean;
    headerCheckboxState: boolean | 'indeterminate';
    onToggleSelectAll: () => void;
}

export function TaskListHeader({
    dynamicListTitle,
    taskCount,
    searchTermInput,
    onSearchTermChange,
    sortBy, // Not directly used to show selection, but influences sort buttons' active state if implemented
    onSortByChange,
    viewMode,
    onViewModeChange,
    showSelectAllCheckbox,
    headerCheckboxState,
    onToggleSelectAll,
}: TaskListHeaderProps) {
    return (
        <div className="flex items-center justify-between pb-3">
            <div className="flex items-center space-x-2">
                {showSelectAllCheckbox && (
                    <Checkbox
                        id="selectAllHeader"
                        checked={headerCheckboxState}
                        onCheckedChange={onToggleSelectAll}
                        aria-label="选择/取消选择所有可见任务"
                        className="mr-2"
                    />
                )}
                <h2 className="text-xl font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {dynamicListTitle}
                </h2>
                <Badge variant="outline" className="text-[15px] px-1.5 py-0.5">{taskCount}</Badge>
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="搜索任务..."
                        className="w-[200px] pl-8 rounded-md"
                        value={searchTermInput}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {/* Add active state indication to DropdownMenuItems if desired e.g., based on current sortBy value */}
                        <DropdownMenuItem onClick={() => onSortByChange("priority")}>按优先级排序</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortByChange("dueDate")}>按截止日期排序</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortByChange("alphabetical")}>按字母顺序排序</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSortByChange("createdAt-desc")}>按创建时间 (新优先)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortByChange("createdAt-asc")}>按创建时间 (旧优先)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center border rounded-md">
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className="rounded-none rounded-l-md"
                        onClick={() => onViewModeChange("list")}
                        aria-label="列表视图"
                    >
                        <LayoutList className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                        variant={viewMode === "board" ? "secondary" : "ghost"}
                        size="icon"
                        className="rounded-none rounded-r-md"
                        onClick={() => onViewModeChange("board")}
                        aria-label="看板视图"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

