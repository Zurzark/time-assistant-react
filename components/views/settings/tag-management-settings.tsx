// 标签管理设置组件
// 用于管理应用中的标签，包括创建、编辑和删除标签，以及设置标签颜色

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Tag, Plus, Edit3, Trash2, AlertCircle, Check } from "lucide-react";
import { TagInfo } from "@/components/ui/tag-input";
import { 
  ObjectStores, 
  getAll, 
  add, 
  update, 
  remove, 
  getByIndex,
  Task, 
  InboxItem
} from "@/lib/db";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface TagManagementSettingsProps {
  toast: any; // 使用来自设置视图的 toast 函数
}

// 预设颜色列表
const PRESET_COLORS = [
  "#ef4444", // 红色
  "#f97316", // 橙色
  "#eab308", // 黄色
  "#84cc16", // 黄绿色
  "#22c55e", // 绿色
  "#10b981", // 翠绿色
  "#06b6d4", // 青色
  "#0ea5e9", // 浅蓝色
  "#3b82f6", // 蓝色
  "#6366f1", // 靛蓝色
  "#8b5cf6", // 紫色
  "#a855f7", // 紫罗兰色
  "#d946ef", // 洋红色
  "#ec4899", // 粉红色
  "#f43f5e", // 玫瑰红色
  "#64748b", // 石板灰
  "#9ca3af", // 灰色
  "#4b5563", // 暗灰色
];

export function TagManagementSettings({ toast }: TagManagementSettingsProps) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState<TagInfo | null>(null);
  const [editedTagName, setEditedTagName] = useState("");
  const [editedTagColor, setEditedTagColor] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasksUsingTag, setTasksUsingTag] = useState<Task[]>([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // 加载所有标签
  const loadTags = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 获取所有标签、任务和收集篮条目
      const [allTags, tasks, inboxItems] = await Promise.all([
        getAll<TagInfo>(ObjectStores.TAGS),
        getAll<Task>(ObjectStores.TASKS),
        getAll<InboxItem>(ObjectStores.INBOX_ITEMS)
      ]);
      
      // 创建标签使用计数器
      const tagUsageCounts: Record<string, number> = {};
      
      // 计算任务中的标签使用次数
      tasks.forEach(task => {
        if (task.tags && task.isDeleted !== 1) {
          task.tags.forEach(tagName => {
            tagUsageCounts[tagName] = (tagUsageCounts[tagName] || 0) + 1;
          });
        }
      });
      
      // 计算收集篮中的标签使用次数
      inboxItems.forEach(item => {
        if (item.tags && item.status !== "deleted") {
          item.tags.forEach(tagName => {
            tagUsageCounts[tagName] = (tagUsageCounts[tagName] || 0) + 1;
          });
        }
      });
      
      // 更新标签的使用计数
      const updatedTags = allTags.map(tag => ({
        ...tag,
        usageCount: tagUsageCounts[tag.name] || 0
      }));
      
      // 按使用计数排序，使用最多的在前面
      updatedTags.sort((a, b) => {
        const countA = a.usageCount || 0;
        const countB = b.usageCount || 0;
        if (countA !== countB) return countB - countA;
        return a.name.localeCompare(b.name);
      });
      
      setTags(updatedTags);
    } catch (err) {
      console.error("加载标签失败:", err);
      setError("无法加载标签数据。请刷新页面重试。");
      toast({ title: "加载失败", description: "无法加载标签数据。", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  // 检查标签是否被任务使用
  const checkTagUsage = async (tagName: string) => {
    try {
      const [tasks, inboxItems] = await Promise.all([
        getAll<Task>(ObjectStores.TASKS),
        getAll<InboxItem>(ObjectStores.INBOX_ITEMS)
      ]);
      
      // 筛选使用了此标签的任务
      const tasksUsingThisTag = tasks.filter(task => 
        task.tags && task.tags.includes(tagName) && task.isDeleted !== 1
      );
      
      // 筛选使用了此标签的收集篮条目
      const inboxItemsUsingThisTag = inboxItems.filter(item => 
        item.tags && item.tags.includes(tagName) && item.status !== "deleted"
      );
      
      return tasksUsingThisTag;
    } catch (err) {
      console.error("检查标签使用情况失败:", err);
      throw err;
    }
  };

  // 处理添加新标签
  const handleAddTag = async () => {
    // 打开编辑对话框，但设置 currentTag 为 null 表示是新建
    setCurrentTag(null);
    setEditedTagName("");
    setEditedTagColor("#64748b"); // 默认颜色
    setIsEditDialogOpen(true);
  };

  // 处理编辑标签
  const handleEditTag = (tag: TagInfo) => {
    setCurrentTag(tag);
    setEditedTagName(tag.name);
    setEditedTagColor(tag.color || "#64748b");
    setIsEditDialogOpen(true);
  };

  // 处理删除标签
  const handleDeleteTag = async (tag: TagInfo) => {
    try {
      const tasksWithTag = await checkTagUsage(tag.name);
      setTasksUsingTag(tasksWithTag);
      setCurrentTag(tag);
      setIsDeleteDialogOpen(true);
    } catch (err) {
      toast({ title: "错误", description: "检查标签使用情况时出错", variant: "destructive" });
    }
  };

  // 确认编辑/添加标签
  const handleSaveTag = async () => {
    if (!editedTagName.trim()) {
      toast({ title: "错误", description: "标签名称不能为空", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // 检查标签名是否已存在（排除当前编辑的标签）
      if (!currentTag || currentTag.name !== editedTagName) {
        const existingTag = tags.find(t => t.name === editedTagName);
        if (existingTag) {
          toast({ title: "错误", description: "标签名称已存在", variant: "destructive" });
          setIsProcessing(false);
          return;
        }
      }

      if (currentTag) {
        // 编辑现有标签
        const updatedTag = {
          ...currentTag,
          name: editedTagName,
          color: editedTagColor,
        };

        // 如果标签名称发生变化，需要更新所有使用该标签的任务
        if (currentTag.name !== editedTagName) {
          const tasksWithTag = await checkTagUsage(currentTag.name);
          
          // 更新所有使用旧标签的任务
          for (const task of tasksWithTag) {
            if (task.tags && task.id) {
              const updatedTags = task.tags.map(t => t === currentTag.name ? editedTagName : t);
              const updatedTask = { ...task, tags: updatedTags };
              await update(ObjectStores.TASKS, updatedTask);
            }
          }
        }

        await update(ObjectStores.TAGS, updatedTag);
        toast({ title: "成功", description: `标签 "${editedTagName}" 已更新` });
      } else {
        // 添加新标签
        const newTag: TagInfo = {
          name: editedTagName,
          color: editedTagColor,
          createdAt: new Date(),
          usageCount: 0
        };

        await add(ObjectStores.TAGS, newTag);
        toast({ title: "成功", description: `新标签 "${editedTagName}" 已创建` });
      }

      setIsEditDialogOpen(false);
      await loadTags(); // 重新加载标签
    } catch (err) {
      console.error("保存标签失败:", err);
      toast({ title: "保存失败", description: "无法保存标签数据", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // 确认删除标签
  const handleConfirmDelete = async () => {
    if (!currentTag) return;
    
    setIsProcessing(true);
    
    try {
      if (tasksUsingTag.length > 0) {
        // 从使用该标签的任务中移除该标签
        for (const task of tasksUsingTag) {
          if (task.tags && task.id) {
            const updatedTags = task.tags.filter(t => t !== currentTag.name);
            const updatedTask = { ...task, tags: updatedTags };
            await update(ObjectStores.TASKS, updatedTask);
          }
        }
      }
      
      // 从收集篮条目中移除标签
      const inboxItems = await getAll<InboxItem>(ObjectStores.INBOX_ITEMS);
      const inboxItemsWithTag = inboxItems.filter(item => 
        item.tags && item.tags.includes(currentTag.name) && item.status !== "deleted"
      );
      
      for (const item of inboxItemsWithTag) {
        if (item.tags && item.id) {
          const updatedTags = item.tags.filter(t => t !== currentTag.name);
          const updatedItem = { ...item, tags: updatedTags };
          await update(ObjectStores.INBOX_ITEMS, updatedItem);
        }
      }
      
      // 删除标签
      await remove(ObjectStores.TAGS, currentTag.name);
      
      toast({ 
        title: "标签已删除", 
        description: tasksUsingTag.length > 0 || inboxItemsWithTag.length > 0
          ? `标签 "${currentTag.name}" 已从相关内容中移除并删除` 
          : `标签 "${currentTag.name}" 已删除`
      });
      
      setIsDeleteDialogOpen(false);
      await loadTags(); // 重新加载标签
    } catch (err) {
      console.error("删除标签失败:", err);
      toast({ title: "删除失败", description: "无法删除标签", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理标签颜色更新
  const handleUpdateTagColor = async (tag: TagInfo, newColor: string) => {
    try {
      const updatedTag = { ...tag, color: newColor };
      await update(ObjectStores.TAGS, updatedTag);
      setTags(prevTags => 
        prevTags.map(t => t.name === tag.name ? updatedTag : t)
      );
    } catch (err) {
      console.error("更新标签颜色失败:", err);
      toast({ title: "更新失败", description: "无法更新标签颜色", variant: "destructive" });
    }
  };

  // 颜色选择器组件
  const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
    return (
      <div className="flex flex-wrap gap-2 p-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              color === value ? "ring-2 ring-ring ring-offset-2" : "hover:scale-110"
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            type="button"
          >
            {color === value && <Check className="h-4 w-4 text-white" />}
          </button>
        ))}
        <div className="mt-2 w-full">
          <Label htmlFor="custom-color" className="text-xs block mb-1">或选择自定义颜色</Label>
          <input
            id="custom-color"
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 rounded-md border"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">标签管理</h3>
        <Button onClick={handleAddTag}>
          <Plus className="mr-2 h-4 w-4" />
          添加标签
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">正在加载标签...</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="flex-grow">{error}</span>
            <Button variant="outline" size="sm" onClick={loadTags} className="ml-4 flex-shrink-0">
              重试
            </Button>
          </div>
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <Tag className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">没有标签</h3>
          <p className="text-muted-foreground">点击"添加标签"按钮创建你的第一个标签</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tags.map((tag) => (
            <Card key={tag.name} className="overflow-hidden">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-grow">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: tag.color || '#64748b' }} 
                  />
                  <div className="font-medium truncate">{tag.name}</div>
                  {tag.usageCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      已用于 {tag.usageCount} 个任务/想法
                    </span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="选择颜色"
                        className="relative overflow-hidden"
                      >
                        <div 
                          className="absolute inset-0 m-1 rounded-sm"
                          style={{ backgroundColor: tag.color || '#64748b' }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="end">
                      <div className="p-2 font-medium border-b">选择标签颜色</div>
                      <ColorPicker 
                        value={tag.color || "#64748b"} 
                        onChange={(color) => handleUpdateTagColor(tag, color)} 
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditTag(tag)}
                    title="编辑标签"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteTag(tag)}
                    title="删除标签"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑/添加标签对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentTag ? "编辑标签" : "添加新标签"}</DialogTitle>
            <DialogDescription>
              {currentTag 
                ? "修改标签的名称和颜色。如果标签名称更改，所有使用此标签的任务将自动更新。"
                : "创建一个新的标签，可用于任务分类。"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tag-name" className="text-right">名称</Label>
              <Input
                id="tag-name"
                value={editedTagName}
                onChange={(e) => setEditedTagName(e.target.value)}
                className="col-span-3"
                placeholder="标签名称"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">颜色</Label>
              <div className="col-span-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: editedTagColor }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {editedTagColor.toUpperCase()}
                  </span>
                </div>
                <ColorPicker
                  value={editedTagColor}
                  onChange={setEditedTagColor}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isProcessing}
            >
              取消
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveTag}
              disabled={isProcessing || !editedTagName.trim()}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentTag ? "保存更改" : "创建标签"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除标签确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              {tasksUsingTag.length > 0 
                ? `标签 "${currentTag?.name}" 正在被 ${tasksUsingTag.length} 个任务使用。删除此标签将同时从这些任务中移除该标签。是否确定要删除？`
                : `确定要删除标签 "${currentTag?.name}" 吗？此操作无法撤销。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 