"use client"
// 该组件管理数据的导入、导出和清理功能，包括数据备份和恢复

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Download,
  Upload,
  Loader2,
  Trash2,
  AlertTriangle,
  Check
} from "lucide-react";
import { 
  ObjectStores, 
  openDB, 
  getAll as getAllDB,
  clearStore 
} from "@/lib/db";

interface DataManagementSettingsProps {
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export function DataManagementSettings({ toast }: DataManagementSettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportConfirmDialogOpen, setIsImportConfirmDialogOpen] = useState(false);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearConfirmCheckbox, setClearConfirmCheckbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setSelectedFile(file);
        // 读取文件内容并解析
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            setParsedData(data);
          } catch (error) {
            toast({ 
              title: "解析错误", 
              description: "所选文件不是有效的JSON格式。", 
              variant: "destructive" 
            });
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        };
        reader.readAsText(file);
      } else {
        toast({ 
          title: "格式错误", 
          description: "请选择JSON格式的文件。", 
          variant: "destructive" 
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // 导出数据
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      // 构建导出数据对象
      const exportData: Record<string, any[]> = {};
      
      // 获取所有对象存储中的数据
      for (const storeName of Object.values(ObjectStores)) {
        try {
          const data = await getAllDB(storeName);
          exportData[storeName] = data;
        } catch (error) {
          console.error(`导出 ${storeName} 数据时出错:`, error);
        }
      }
      
      // 创建JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 创建Blob并下载
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      // 生成文件名，包含日期
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `FocusPilot_Backup_${formattedDate}.json`;
      
      // 触发下载
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({ 
        title: "导出成功", 
        description: `所有数据已成功导出为 ${fileName}`, 
        variant: "default" 
      });
    } catch (error) {
      console.error("导出数据时出错:", error);
      toast({ 
        title: "导出失败", 
        description: "无法导出数据。请重试或检查控制台获取详细错误信息。", 
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 导入确认
  const handleImportConfirm = async () => {
    if (!parsedData) {
      toast({ 
        title: "数据错误", 
        description: "没有有效的导入数据。", 
        variant: "destructive" 
      });
      setIsImportConfirmDialogOpen(false);
      return;
    }

    try {
      setIsImporting(true);
      
      // 获取数据库连接
      const { db, error } = await openDB();
      if (error || !db) {
        throw error || new Error("无法打开数据库");
      }
      
      // 创建事务来处理所有数据存储
      const transaction = db.transaction(
        Object.values(ObjectStores).filter(store => db.objectStoreNames.contains(store)),
        "readwrite"
      );
      
      // 清空并重新填充每个对象存储
      for (const storeName of Object.values(ObjectStores)) {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`对象存储 ${storeName} 在数据库中不存在，跳过`);
          continue;
        }
        
        try {
          // 获取对象存储
          const store = transaction.objectStore(storeName);
          
          // 清空存储
          await new Promise<void>((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(new Error(`清空 ${storeName} 失败`));
          });
          
          // 如果导入数据包含此存储的数据，添加到存储
          if (parsedData[storeName] && Array.isArray(parsedData[storeName])) {
            for (const item of parsedData[storeName]) {
              await new Promise<void>((resolve, reject) => {
                const addRequest = store.add(item);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = (event) => {
                  console.error(`添加项目到 ${storeName} 时出错:`, event);
                  reject(new Error(`添加项目到 ${storeName} 失败`));
                };
              });
            }
          }
        } catch (error) {
          console.error(`处理 ${storeName} 时出错:`, error);
        }
      }
      
      // 提交事务并关闭数据库
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(new Error("导入事务失败"));
        };
      });
      
      toast({ 
        title: "导入成功", 
        description: "数据已成功导入。应用将刷新以应用更改。", 
        variant: "default" 
      });
      
      // 延迟后刷新页面以应用更改
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("导入数据时出错:", error);
      toast({ 
        title: "导入失败", 
        description: "无法导入数据。请重试或检查控制台获取详细错误信息。", 
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
      setIsImportConfirmDialogOpen(false);
    }
  };

  // 清空数据确认
  const handleClearDataConfirm = async () => {
    const requiredText = "我确认清空";
    if (clearConfirmText !== requiredText || !clearConfirmCheckbox) {
      return; // 按钮应该已经被禁用，但这是一个额外的安全检查
    }

    try {
      setIsClearing(true);
      
      // 清空所有对象存储
      for (const storeName of Object.values(ObjectStores)) {
        try {
          await clearStore(storeName);
        } catch (error) {
          console.error(`清空 ${storeName} 时出错:`, error);
        }
      }
      
      toast({ 
        title: "清空成功", 
        description: "所有数据已成功清除。应用将重置。", 
        variant: "default" 
      });
      
      // 延迟后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("清空数据时出错:", error);
      toast({ 
        title: "操作失败", 
        description: "无法清空数据。请重试或检查控制台获取详细错误信息。", 
        variant: "destructive" 
      });
    } finally {
      setIsClearing(false);
      setIsClearDataDialogOpen(false);
      // 重置确认状态
      setClearConfirmText("");
      setClearConfirmCheckbox(false);
    }
  };

  // 检查清空数据的确认条件
  const isClearConfirmEnabled = clearConfirmText === "我确认清空" && clearConfirmCheckbox;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">数据导入</h3>
        <div className="grid gap-2">
          <Label htmlFor="data-import">导入数据文件</Label>
          <div className="flex gap-2">
            <Input 
              id="data-import" 
              type="file" 
              accept=".json" 
              onChange={handleFileChange} 
              ref={fileInputRef}
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedFile ? `已选择: ${selectedFile.name}` : "未选择文件"}
          </p>
          <Button 
            onClick={() => setIsImportConfirmDialogOpen(true)} 
            disabled={!selectedFile || isImporting}
            className="mt-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                开始导入
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2 flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
            <span>
              注意：导入操作将完全覆盖当前应用中的所有数据，且无法撤销。请确保您选择的是正确的备份文件。仅支持从本应用导出的.json格式文件。
            </span>
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">数据导出</h3>
        <div className="grid gap-2">
          <Label htmlFor="data-export">导出数据文件</Label>
          <Button 
            id="data-export" 
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            导出的文件包含所有应用数据，可用于备份或在其他设备上恢复您的数据。
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">数据清理</h3>
        <div className="grid gap-2">
          <Label htmlFor="data-cleanup">清空所有数据</Label>
          <Button 
            id="data-cleanup" 
            variant="destructive"
            onClick={() => setIsClearDataDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            清空
          </Button>
          <p className="text-sm text-muted-foreground mt-2 flex items-start">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-red-500" />
            <span>
              此操作将永久删除您在此应用中存储的所有数据，并且无法恢复。请谨慎操作。
            </span>
          </p>
        </div>
      </div>

      {/* 导入确认对话框 */}
      <Dialog open={isImportConfirmDialogOpen} onOpenChange={setIsImportConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认导入数据</DialogTitle>
            <DialogDescription>
              您确定要导入此文件中的数据吗？当前应用内的所有数据将被替换。
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 pb-2">
            <p className="text-sm text-muted-foreground flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>此操作将覆盖您当前的所有数据，且无法撤销。</span>
            </p>
            {selectedFile && (
              <p className="text-sm mt-4">
                <strong>文件:</strong> {selectedFile.name}
                <br />
                <strong>大小:</strong> {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsImportConfirmDialogOpen(false)}
              disabled={isImporting}
            >
              取消
            </Button>
            <Button 
              type="button" 
              onClick={handleImportConfirm}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  确认导入
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空数据确认对话框 */}
      <Dialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              警告：确认清空所有数据？
            </DialogTitle>
            <DialogDescription className="pt-2">
              此操作将永久删除您在此应用中存储的所有任务、项目、目标、设置、时间日志及其他所有数据，并且无法恢复！请在继续前确保您已备份任何重要数据。
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 pb-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-sm">
                请输入"我确认清空"以继续：
              </Label>
              <Input
                id="confirm-text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                className="border-red-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-checkbox"
                checked={clearConfirmCheckbox}
                onCheckedChange={(checked) => setClearConfirmCheckbox(!!checked)}
              />
              <Label htmlFor="confirm-checkbox" className="text-sm font-normal">
                我已了解清空所有数据的风险，并同意继续。
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsClearDataDialogOpen(false)}
              disabled={isClearing}
            >
              取消
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleClearDataConfirm}
              disabled={!isClearConfirmEnabled || isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在清空...
                </>
              ) : (
                "确认清空"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 