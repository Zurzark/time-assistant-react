"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/user-service';

interface UserContextType {
  user: UserProfile;
  updateUser: (profile: Partial<UserProfile>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULT_USER: UserProfile = {
  nickname: 'User',
  email: 'user@example.com',
  avatar: '/placeholder.svg?height=36&width=36',
  bio: 'FocusPilot User',
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshUser = async () => {
    try {
      const profile = await getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleUpdateUser = async (profile: Partial<UserProfile>) => {
    const success = await updateUserProfile(profile);
    if (success) {
      await refreshUser();
    }
    return success;
  };

  // Optional: prevent rendering until initialized if needed, but for now we show default
  
  return (
    <UserContext.Provider value={{ user, updateUser: handleUpdateUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
