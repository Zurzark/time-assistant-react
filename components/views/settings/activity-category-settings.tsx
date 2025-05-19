"use client"
// 该组件管理活动分类的设置，包括 CRUD 操作、显示现有分类以及处理分类的图标选择。
// 它使用对话框来添加/编辑分类，并使用另一个对话框进行图标选择。
// 如果正在使用的分类被删除，它还会处理删除逻辑和项目的重新分类。

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Switch might not be used here directly, but good to have for consistency if settings sub-components evolve
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  // Original & Added Icons (Merged and Deduplicated from icon-picker.tsx)
  Coffee, Briefcase, BookOpen, Users, Smile, Activity, Anchor, Award, Settings, Trash2, Edit3, PlusCircle, ListChecks, Info, AlertCircle, CheckCircle, XCircle, LucideProps, LucideIcon,
  Home, Calendar, Clock, MessageSquare, Bell, Folder, FileText, Image, Video, Mic, Search, Filter, Settings as SettingsIcon,
  Sliders, Menu, MoreHorizontal, MoreVertical, Grid, Layout, Rows, Columns, User, Key, Lock, Unlock, Eye, EyeOff, Power, Link, ExternalLink, Paperclip, ThumbsUp, ThumbsDown, Heart, Star, Tag, Bookmark, Flag,
  PenTool, Brush, Palette, Crop, Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Shuffle, Repeat, Save, UploadCloud, DownloadCloud, Terminal, Code, GitMerge, HardDrive, Server, Database, Cpu, Wrench, Cog,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart2, PieChart, Gift, Package, Truck, Banknote, Coins, Receipt,
  Mail, Phone, MessageCircle, Share2, Users as UsersGroup, UserCheck, UserPlus, AtSign, Rss,
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Film, Music, Airplay, Radio, MicVocal, Headphones,
  MapPin, Map, Navigation, Globe, Compass, Milestone, Route,
  Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Waves, Leaf, Sprout, Droplet, Thermometer, Zap, Flame,
  Smartphone, Tablet, Laptop, Tv, Watch, Printer, Camera, Keyboard, MousePointer, Speaker, Disc, BatteryCharging, Battery, Lightbulb,
  Archive, Box, Briefcase as BriefcaseAlt,
  Inbox, CalendarDays, ListOrdered, ListTodo, Target, Check, ChevronsUp, ChevronsDown, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Award as AwardAlt,
  Ghost, Rocket, Puzzle, Shield, HelpCircle, Aperture, Gamepad, Dice5, Coffee as CoffeeCup,
  ShoppingBag, Umbrella, Bike, Car, Plane, Ship, Train, Building, Home as HomeAlt, School, Pizza, Sandwich, Beer, Wine,
  // Specific icons that were already here and might be used directly elsewhere (ensure they are covered above or add if unique)
  Loader2, 
  // ClipboardList is imported and used as ClipboardListIcon alias below for the empty state, so direct ClipboardList is also fine
  ClipboardList as ClipboardListIcon // Explicit alias for clarity if used as ClipboardListIcon
} from "lucide-react";
import {
  ObjectStores,
  ActivityCategory, 
  getAll as getAllDB,
  add as addDB,
  update as updateDB,
  remove as removeDB,
  getByIndex, 
} from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Keep if any dialog uses it explicitly
} from "@/components/ui/dialog";
import { IconPicker, PickableIconName } from '@/components/ui/icon-picker';

interface ActivityCategorySettingsProps {
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

// 预定义颜色供活动分类选择
const predefinedCategoryColors = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#78716c", "#a1a1aa", "#64748b",
];

// Icon map for displaying icons
const displayIconMap: Record<PickableIconName, LucideIcon> = {
  // Copied from icon-picker.tsx iconMap for consistency
  // Original Icons
  Coffee, Briefcase, BookOpen, Users, Smile, Activity, Anchor, Award, Settings, Trash2, Edit3, PlusCircle, ListChecks, Info, AlertCircle, CheckCircle, XCircle,
  // Added Icons - Set 1
  Home, Calendar, Clock, MessageSquare, Bell, Folder, FileText, Image, Video, Mic, Search, Filter, SettingsIcon,
  Sliders, Menu, MoreHorizontal, MoreVertical, Grid, Layout, Rows, Columns, User, Key, Lock, Unlock, Eye, EyeOff, Power, Link, ExternalLink, Paperclip, ThumbsUp, ThumbsDown, Heart, Star, Tag, Bookmark, Flag,
  // Added Icons - Set 2
  PenTool, Brush, Palette, Crop, Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Shuffle, Repeat, Save, UploadCloud, DownloadCloud, Terminal, Code, GitMerge, HardDrive, Server, Database, Cpu, Wrench, Cog,
  // Added Icons - Set 3
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart2, PieChart, Gift, Package, Truck, Banknote, Coins, Receipt,
  // Added Icons - Set 4
  Mail, Phone, MessageCircle, Share2, UsersGroup, UserCheck, UserPlus, AtSign, Rss,
  // Added Icons - Set 5
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Film, Music, Airplay, Radio, MicVocal, Headphones,
  // Added Icons - Set 6
  MapPin, Map, Navigation, Globe, Compass, Milestone, Route,
  // Added Icons - Set 7
  Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Waves, Leaf, Sprout, Droplet, Thermometer, Zap, Flame,
  // Added Icons - Set 8
  Smartphone, Tablet, Laptop, Tv, Watch, Printer, Camera, Keyboard, MousePointer, Speaker, Disc, BatteryCharging, Battery, Lightbulb,
  // Added Icons - Set 9
  Archive, Box, BriefcaseAlt,
  Inbox, CalendarDays, ListOrdered, ListTodo, Target, Check, ChevronsUp, ChevronsDown, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  // Added Icons - Set 10
  AwardAlt,
  Ghost, Rocket, Puzzle, Shield, HelpCircle, Aperture, Gamepad, Dice5, CoffeeCup,
  ShoppingBag, Umbrella, Bike, Car, Plane, Ship, Train, Building, HomeAlt, School, Pizza, Sandwich, Beer, Wine
  // ClipboardList: ClipboardListIcon, // This can be used directly if needed
};

// Type guard to check if a string is a valid PickableIconName
function isValidPickableIcon(iconName: string | undefined): iconName is PickableIconName {
  if (!iconName) return false;
  return iconName in displayIconMap;
}

interface ActivityCategoryFormData {
  id?: number;
  name: string;
  color: string;
  icon?: PickableIconName;
}

const initialActivityCategoryFormData: ActivityCategoryFormData = {
  name: "",
  color: "#6b7280", // 默认灰色
  icon: undefined,
};

export function ActivityCategorySettings({ toast }: ActivityCategorySettingsProps) {
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);
  const [loadingActivityCategories, setLoadingActivityCategories] = useState(true);
  const [activityCategoryError, setActivityCategoryError] = useState<string | null>(null);
  const [isActivityCategoryModalOpen, setIsActivityCategoryModalOpen] = useState(false);
  const [currentEditingActivityCategory, setCurrentEditingActivityCategory] = useState<ActivityCategory | null>(null);
  const [activityCategorySaving, setActivityCategorySaving] = useState(false);
  
  const [isRecategorizeModalOpen, setIsRecategorizeModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ActivityCategory | null>(null);
  const [recategorizeTargetId, setRecategorizeTargetId] = useState<string | number | null>(null);
  const [relatedItemsCount, setRelatedItemsCount] = useState(0);
  const [activityCategoryFormData, setActivityCategoryFormData] = useState<ActivityCategoryFormData>(initialActivityCategoryFormData);
  const [isIconPickerModalOpen, setIsIconPickerModalOpen] = useState(false);

  const loadActivityCategories = useCallback(async () => {
    setLoadingActivityCategories(true);
    setActivityCategoryError(null);
    try {
      const categories = await getAllDB<ActivityCategory>(ObjectStores.ACTIVITY_CATEGORIES);
      categories.sort((a, b) => {
        if (a.isSystemCategory && !b.isSystemCategory) return -1;
        if (!a.isSystemCategory && b.isSystemCategory) return 1;
        return a.name.localeCompare(b.name);
      });
      setActivityCategories(categories);
    } catch (err) {
      console.error("Failed to load activity categories:", err);
      setActivityCategoryError("无法加载活动分类。如问题持续，请尝试刷新页面或检查数据库。");
      toast({ title: "加载失败", description: "无法加载活动分类。", variant: "destructive" });
    } finally {
      setLoadingActivityCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    loadActivityCategories();
  }, [loadActivityCategories]);

  const handleOpenAddActivityCategoryModal = () => {
    setCurrentEditingActivityCategory(null);
    setActivityCategoryFormData(initialActivityCategoryFormData);
    setIsActivityCategoryModalOpen(true);
  };

  const handleOpenEditActivityCategoryModal = (category: ActivityCategory) => {
    setCurrentEditingActivityCategory(category);
    const iconFromDb = category.icon;
    let validIconForForm: PickableIconName | undefined = undefined;
    if (isValidPickableIcon(iconFromDb)) {
      validIconForForm = iconFromDb;
    } else if (iconFromDb) {
      console.warn(`Invalid icon name "${iconFromDb}" from DB for category "${category.name}". Icon will not be pre-selected in picker.`);
    }
    setActivityCategoryFormData({
      id: category.id,
      name: category.name,
      color: category.color || initialActivityCategoryFormData.color, 
      icon: validIconForForm, 
    });
    setIsActivityCategoryModalOpen(true);
  };

  const handleCloseActivityCategoryModal = () => {
    setIsActivityCategoryModalOpen(false);
  };

  const handleSaveActivityCategory = async () => {
    const { id, name, color, icon } = activityCategoryFormData;

    if (!name.trim()) {
      toast({ title: "验证错误", description: "分类名称不能为空。", variant: "destructive" });
      return;
    }
    if (name.trim().length > 50) {
        toast({ title: "验证错误", description: "分类名称过长 (最多50字符)。", variant: "destructive" });
        return;
    }
    const duplicateExists = activityCategories.some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase() && cat.id !== id
    );
    if (duplicateExists) {
      toast({ title: "验证错误", description: `分类名称 "${name.trim()}" 已存在。`, variant: "destructive" });
      return;
    }
    if (!color) {
        toast({ title: "验证错误", description: "请选择一个颜色。", variant: "destructive" });
        return;
    }

    setActivityCategorySaving(true);
    try {
      const now = new Date();
      if (currentEditingActivityCategory && id !== undefined) {
        const categoryToUpdate: ActivityCategory = {
          ...currentEditingActivityCategory,
          id: id,
          name: name.trim(),
          color: color,
          icon: icon,
          updatedAt: now,
        };
        if (currentEditingActivityCategory.isSystemCategory === 1) {
            categoryToUpdate.name = currentEditingActivityCategory.name;
        }
        await updateDB(ObjectStores.ACTIVITY_CATEGORIES, categoryToUpdate);
        toast({ title: "更新成功", description: `活动分类 "${categoryToUpdate.name}" 已更新。` });
      } else {
        const newCategory: Omit<ActivityCategory, 'id'> = {
          name: name.trim(),
          color: color,
          icon: icon,
          isSystemCategory: 0,
          createdAt: now,
          updatedAt: now,
        };
        await addDB(ObjectStores.ACTIVITY_CATEGORIES, newCategory);
        toast({ title: "创建成功", description: `新的活动分类 "${newCategory.name}" 已添加。` });
      }
      await loadActivityCategories();
      handleCloseActivityCategoryModal();
    } catch (error) {
      console.error("Failed to save activity category:", error);
      toast({ title: "保存失败", description: "无法保存活动分类，请重试。", variant: "destructive" });
    } finally {
      setActivityCategorySaving(false);
    }
  };
  
  const handleDeleteActivityCategory = async (category: ActivityCategory) => {
    if (category.isSystemCategory === 1) {
      toast({ title: "操作无效", description: "系统预置分类不能删除。", variant: "default" });
      return;
    }
    setActivityCategorySaving(true);
    try {
      if (category.id === undefined) {
        toast({ title: "错误", description: "分类ID未知，无法删除。", variant: "destructive" });
        setActivityCategorySaving(false);
        return;
      }
      const relatedTimeBlocks = await getByIndex<any>(ObjectStores.TIME_BLOCKS, 'byActivityCategory', category.id);
      if (relatedTimeBlocks && relatedTimeBlocks.length > 0) {
        setCategoryToDelete(category);
        setRelatedItemsCount(relatedTimeBlocks.length);
        setRecategorizeTargetId(null);
        setIsRecategorizeModalOpen(true);
        setActivityCategorySaving(false);
        return;
      }
      if (window.confirm(`确定要删除分类 "${category.name}" 吗？此分类未被任何时间块使用。`)) {
        await removeDB(ObjectStores.ACTIVITY_CATEGORIES, category.id);
        toast({ title: "删除成功", description: `活动分类 "${category.name}" 已被删除。` });
        loadActivityCategories(); 
      } else {
        setActivityCategorySaving(false);
      }
    } catch (error) {
      console.error("Failed to check/delete activity category:", error);
      toast({ title: "删除失败", description: "检查或删除分类时发生错误。", variant: "destructive" });
      if (!isRecategorizeModalOpen) {
         setActivityCategorySaving(false);
      }
    } finally {
       if (!isRecategorizeModalOpen) { 
         setActivityCategorySaving(false);
      }
    }
  };

  const handleConfirmRecategorizeAndDelete = async () => {
    if (!categoryToDelete || categoryToDelete.id === undefined) {
      toast({ title: "错误", description: "要删除的分类信息丢失。", variant: "destructive" });
      return;
    }
    if (recategorizeTargetId === null) {
        toast({ title: "操作要求", description: '请选择一个新的分类或"未分类"选项。', variant: "default" }); 
        return;
    }
    setActivityCategorySaving(true);
    let countToUpdate = 0; // Initialize count for updated items
    try {
      const relatedTimeBlocks = await getByIndex<any>(ObjectStores.TIME_BLOCKS, 'byActivityCategory', categoryToDelete.id); // Assuming categoryToDelete is not null here due to prior checks
      countToUpdate = relatedTimeBlocks.length; // Store the count
      
      for (const block of relatedTimeBlocks) {
        const updatedBlock = { 
          ...block, 
          activityCategoryId: recategorizeTargetId === "UNASSIGNED" ? undefined : Number(recategorizeTargetId),
          updatedAt: new Date(),
        };
        await updateDB(ObjectStores.TIME_BLOCKS, updatedBlock);
      }

      await removeDB(ObjectStores.ACTIVITY_CATEGORIES, categoryToDelete.id); // Assuming categoryToDelete is not null
      toast({ title: "操作成功", description: `分类 "${categoryToDelete?.name}" 已删除，${countToUpdate} 条关联记录已更新。` });
      
      loadActivityCategories();
      setIsRecategorizeModalOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Failed to recategorize and delete:", error);
      toast({ title: "操作失败", description: "重新分类或删除时发生错误。", variant: "destructive" });
    } finally {
      setActivityCategorySaving(false);
    }
  };

  const handleSelectIcon = (selectedIconName: PickableIconName | null) => {
    setActivityCategoryFormData(prev => ({ ...prev, icon: selectedIconName || undefined }));
    setIsIconPickerModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">现有活动分类</h3>
        {loadingActivityCategories && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>正在加载活动分类...</span>
          </div>
        )}

        {!loadingActivityCategories && activityCategoryError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="flex-grow">{activityCategoryError}</span>
              <Button variant="outline" size="sm" onClick={loadActivityCategories} className="ml-4 flex-shrink-0">
                重试
              </Button>
            </div>
          </div>
        )}

        {!loadingActivityCategories && !activityCategoryError && activityCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-border py-10 text-center">
            <ClipboardListIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              您尚未添加任何活动分类。
            </p>            
            <Button onClick={handleOpenAddActivityCategoryModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> 添加新分类
            </Button>
          </div>
        )}

        {!loadingActivityCategories && !activityCategoryError && activityCategories.length > 0 && (
          <div className="space-y-3">
            {activityCategories.map(category => {
              const IconComponent = category.icon && isValidPickableIcon(category.icon) ? displayIconMap[category.icon] : ClipboardListIcon;
              return (
                <Card key={category.id} className={cn(category.isSystemCategory === 1 && "bg-muted/30 dark:bg-muted/20")}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-grow min-w-0"> {/* Added min-w-0 for better truncation */}
                      <span 
                        className="p-1.5 bg-muted rounded-sm flex items-center justify-center w-8 h-8 flex-shrink-0"
                        style={{color: category.color || undefined}}
                      >
                        <IconComponent className="h-5 w-5" />
                      </span>
                      <span 
                        className="h-4 w-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: category.color || '#ccc' }}
                        title={`颜色: ${category.color || '#ccc'}`}
                      />
                      <div className={cn("flex-grow min-w-0", category.isSystemCategory === 1 && "opacity-70")}> {/* Added min-w-0 */}
                        <p className="font-semibold text-sm truncate" title={category.name}>{category.name}</p>
                        {category.isSystemCategory === 1 && (
                          <span className="text-xs text-muted-foreground">(系统预置)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {category.isSystemCategory !== 1 && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditActivityCategoryModal(category)} title="编辑分类" disabled={activityCategorySaving}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => handleDeleteActivityCategory(category)}
                            title="删除分类"
                            disabled={activityCategorySaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {category.isSystemCategory === 1 && (
                         <Button variant="ghost" size="icon" onClick={() => handleOpenEditActivityCategoryModal(category)} title="编辑分类 (颜色/图标)" disabled={activityCategorySaving}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
             <Button onClick={handleOpenAddActivityCategoryModal} className="mt-4 w-full" disabled={activityCategorySaving}>
                <PlusCircle className="mr-2 h-4 w-4" /> 添加新的活动分类
            </Button>
          </div>
        )}
      </div>

      <Separator />
      
      <Dialog open={isActivityCategoryModalOpen} onOpenChange={(open) => {if (!open) { handleCloseActivityCategoryModal(); } else setIsActivityCategoryModalOpen(true);}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentEditingActivityCategory ? "编辑活动分类" : "添加活动分类"}</DialogTitle>
            <DialogDescription>
              {currentEditingActivityCategory ? "修改分类的详细信息。" : "创建一个新的活动分类，用于时间跟踪。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">名称</Label>
              <Input 
                id="category-name" 
                value={activityCategoryFormData.name}
                onChange={(e) => setActivityCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="例如：工作会议、编码、运动"
                disabled={currentEditingActivityCategory?.isSystemCategory === 1}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="category-color" className="text-right pt-2">颜色</Label>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {predefinedCategoryColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded-full transition-all border-2",
                        activityCategoryFormData.color === color 
                          ? "ring-2 ring-offset-2 ring-primary ring-offset-background border-primary" 
                          : "border-transparent hover:scale-110 hover:border-muted-foreground"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setActivityCategoryFormData(prev => ({ ...prev, color: color }))}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    id="category-color"
                    type="color"
                    value={activityCategoryFormData.color}
                    onChange={(e) => setActivityCategoryFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="p-1 h-10 w-20 flex-shrink-0"
                  />
                  <span className="text-sm text-muted-foreground">或选择自定义颜色</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="category-icon" className="text-right">图标 (可选)</Label>
               <Button variant="outline" className="col-span-3" onClick={() => setIsIconPickerModalOpen(true)}>
                 {activityCategoryFormData.icon && isValidPickableIcon(activityCategoryFormData.icon) ? 
                    <div className="flex items-center gap-2">
                       {React.createElement(displayIconMap[activityCategoryFormData.icon], {className:"h-4 w-4"})} 
                       <span>{activityCategoryFormData.icon}</span>
                    </div>
                    : "选择图标"}
               </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseActivityCategoryModal} disabled={activityCategorySaving}>取消</Button>
            <Button type="button" onClick={handleSaveActivityCategory} disabled={activityCategorySaving}>
              {activityCategorySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentEditingActivityCategory ? "保存更改" : "创建分类"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIconPickerModalOpen} onOpenChange={setIsIconPickerModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>选择图标</DialogTitle>
            <DialogDescription>
              搜索并选择一个适合此活动分类的图标。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <IconPicker 
                onSelectIcon={handleSelectIcon} 
                currentIcon={activityCategoryFormData.icon}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">关闭</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecategorizeModalOpen} onOpenChange={(open) => { 
          if (!open) {
              setIsRecategorizeModalOpen(false); 
              setCategoryToDelete(null); 
              setActivityCategorySaving(false);
          } else {
            setIsRecategorizeModalOpen(true); // ensure it's explicitly set true if opening
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除分类并重新分配记录</DialogTitle>
            <DialogDescription>
              {categoryToDelete && relatedItemsCount > 0 && (
                <>
                  分类 <strong>"{categoryToDelete.name}"</strong> 正被 <strong>{relatedItemsCount}</strong> 条记录使用。
                  请选择一个新的分类来分配这些记录，或将其标记为"未分类"。原分类将被删除。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="recategorize-select">将记录重新分类到：</Label>
            <Select 
                value={recategorizeTargetId === null ? "" : String(recategorizeTargetId)} 
                onValueChange={(value) => setRecategorizeTargetId(value === "UNASSIGNED" ? "UNASSIGNED" : (value ? Number(value) : null))}
            >
              <SelectTrigger id="recategorize-select">
                <SelectValue placeholder="选择目标分类..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">未分类 (清除分类)</SelectItem>
                {activityCategories
                  .filter(cat => cat.id !== categoryToDelete?.id)
                  .map(cat => {
                    const Icon = cat.icon && isValidPickableIcon(cat.icon) ? displayIconMap[cat.icon] : ClipboardListIcon;
                    return (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                        <div className="flex items-center">
                            <Icon className="h-4 w-4 mr-2 flex-shrink-0" style={{color: cat.color || undefined}}/>
                            <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{backgroundColor: cat.color || '#ccc'}}></span>
                            {cat.name}
                        </div>
                        </SelectItem>
                    );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRecategorizeModalOpen(false); setCategoryToDelete(null); setActivityCategorySaving(false); }} disabled={activityCategorySaving}>
              取消
            </Button>
            <Button onClick={handleConfirmRecategorizeAndDelete} disabled={activityCategorySaving || recategorizeTargetId === null}>
              {activityCategorySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认并删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 