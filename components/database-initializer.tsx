'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import useIndexedDB from '@/hooks/useIndexedDB';

/**
 * 数据库初始化组件
 * 负责在应用程序启动时初始化 IndexedDB 数据库
 * 并在需要时显示升级通知
 */
export default function DatabaseInitializer() {
  const { initialized, error } = useIndexedDB();
  const { toast } = useToast();

  useEffect(() => {
    if (initialized) {
      // 数据库初始化成功
      // 如果需要，这里可以显示一个通知
      // console.log('IndexedDB 数据库初始化完成');
    }
  }, [initialized]);

  useEffect(() => {
    if (error) {
      // 数据库初始化失败
      toast({
        variant: 'destructive',
        title: '数据库初始化失败',
        description: error.message || '无法初始化应用数据库，某些功能可能无法正常工作',
      });
    }
  }, [error, toast]);

  // 这是一个纯逻辑组件，不渲染任何内容
  return null;
} 