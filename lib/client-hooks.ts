// 此文件包含需要在客户端运行的自定义React Hooks，
// 目前包含useDebounce hook，用于对值进行防抖处理，减少频繁更新。
"use client";

import { useState, useEffect } from "react";

// Debounce Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}