import { get, update, ObjectStores, AppSetting } from './db';

export interface UserProfile {
  nickname: string;
  email: string;
  avatar?: string; // Base64 string or URL
  bio?: string;
}

const USER_PROFILE_KEY = 'user_profile';

const DEFAULT_PROFILE: UserProfile = {
  nickname: 'User',
  email: 'user@example.com',
  avatar: '/placeholder.svg?height=36&width=36',
  bio: 'FocusPilot User',
};

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const setting = await get<AppSetting>(ObjectStores.APP_SETTINGS, USER_PROFILE_KEY);
    if (setting && setting.value) {
      return { ...DEFAULT_PROFILE, ...setting.value };
    }
  } catch (error) {
    // If not found, return default
    // console.log('User profile not found, using default');
  }
  return DEFAULT_PROFILE;
};

export const updateUserProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
  try {
    const currentProfile = await getUserProfile();
    const newProfile = { ...currentProfile, ...profile };
    
    await update<AppSetting>(ObjectStores.APP_SETTINGS, {
      key: USER_PROFILE_KEY,
      value: newProfile,
    });
    return true;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return false;
  }
};

/**
 * Compress image and convert to base64
 */
export const processAvatarFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Resize to max 200x200
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.8 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
