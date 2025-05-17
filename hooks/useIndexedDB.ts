import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';

/**
 * 用于初始化 IndexedDB 数据库的钩子
 * @returns 数据库初始化状态 { initialized, error }
 */
export const useIndexedDB = () => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await initDB();
        
        if (isMounted) {
          setInitialized(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error('初始化 IndexedDB 失败:', err);
          setError(err instanceof Error ? err : new Error('初始化数据库时发生未知错误'));
        }
      }
    };

    if (typeof window !== 'undefined') {
      initialize();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return { initialized, error };
};

export default useIndexedDB; 