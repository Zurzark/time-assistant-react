// 标签输入组件
// 提供用户友好的标签选择和创建界面，支持模糊搜索已有标签

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ObjectStores, getAll, add, update } from "@/lib/db";

export interface TagInfo {
  name: string;
  color?: string;
  createdAt: Date;
  usageCount?: number;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  className,
  placeholder = "添加标签...",
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(value);
  const [searchResults, setSearchResults] = useState<TagInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // 加载所有标签数据
  useEffect(() => {
    const loadTags = async () => {
      setLoading(true);
      try {
        const allTags = await getAll<TagInfo>(ObjectStores.TAGS);
        setTags(allTags);
      } catch (error) {
        console.error("加载标签数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTags();
  }, []);

  // 同步外部value到内部状态
  useEffect(() => {
    setSelectedTags(value);
  }, [value]);

  // 处理搜索
  useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults(tags);
      return;
    }

    const query = inputValue.toLowerCase().trim();
    const filteredTags = tags
      .filter(tag => 
        tag.name.toLowerCase().includes(query) && 
        !selectedTags.includes(tag.name)
      )
      .sort((a, b) => {
        // 优先显示以查询开头的标签
        const aStartsWith = a.name.toLowerCase().startsWith(query);
        const bStartsWith = b.name.toLowerCase().startsWith(query);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return a.name.localeCompare(b.name);
      });
    
    setSearchResults(filteredTags);
  }, [inputValue, tags, selectedTags]);

  // 添加标签（从搜索结果或创建新标签）
  const addTag = async (tagName: string) => {
    if (!tagName.trim() || selectedTags.includes(tagName)) return;

    const tagExists = tags.some(t => t.name === tagName);
    
    if (!tagExists) {
      // 新标签：创建并保存
      const newTag: TagInfo = {
        name: tagName,
        color: "#64748b", // 默认颜色
        createdAt: new Date(),
        usageCount: 0  // 初始为0，仅在实际任务保存时增加
      };
      
      try {
        await add(ObjectStores.TAGS, newTag);
        setTags(prev => [...prev, newTag]);
      } catch (error) {
        console.error("创建新标签失败:", error);
      }
    }

    const newSelectedTags = [...selectedTags, tagName];
    setSelectedTags(newSelectedTags);
    onChange(newSelectedTags);
    setInputValue("");
  };

  // 删除标签
  const removeTag = (tagName: string) => {
    const newSelectedTags = selectedTags.filter(t => t !== tagName);
    setSelectedTags(newSelectedTags);
    onChange(newSelectedTags);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
      setOpen(false);
    } else if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // 获取标签的颜色
  const getTagColor = (tagName: string): string | undefined => {
    const tag = tags.find(t => t.name === tagName);
    return tag?.color;
  };

  // 处理输入框点击事件，确保弹出菜单可靠地打开
  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      // 无论何时点击容器，都确保打开下拉菜单
      setOpen(true);
      // 并聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // 处理输入框聚焦事件
  const handleInputFocus = () => {
    if (!disabled && !open) {
      setOpen(true);
    }
  };

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div 
            ref={triggerRef}
            className={cn(
              "flex flex-wrap gap-1.5 px-3 py-2 h-10 border rounded-md focus-within:ring-1 focus-within:ring-ring",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleInputContainerClick}
          >
            {selectedTags.map(tag => {
              const tagColor = getTagColor(tag);
              return (
                <Badge 
                  key={tag} 
                  variant="outline"
                  className="px-2 py-0.5 gap-1 flex items-center font-semibold text-xs"
                  style={{ 
                    backgroundColor: tagColor ? `${tagColor}20` : undefined,
                    color: tagColor || undefined,
                    borderColor: tagColor ? `${tagColor}50` : undefined
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                if (!open) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={selectedTags.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground h-full"
              disabled={disabled}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="搜索标签..." 
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                      没有找到匹配的标签
                    </div>
                    {inputValue.trim() && (
                      <CommandItem 
                        onSelect={() => {
                          addTag(inputValue);
                          setOpen(false);
                        }}
                        className="border-t border-border px-2 py-1.5"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        创建新标签 "{inputValue}"
                      </CommandItem>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {searchResults.map(tag => (
                      <CommandItem
                        key={tag.name}
                        onSelect={() => {
                          addTag(tag.name);
                          setOpen(false);
                        }}
                        className="flex items-center px-2 py-1.5"
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 