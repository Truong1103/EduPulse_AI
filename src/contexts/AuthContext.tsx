import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AppRole } from '../types';
import { supabase, isSupabaseConfigured, recoverOAuthSessionFromUrl, POST_AUTH_REDIRECT_KEY } from '../lib/supabase';
import { getCurrentUserProfile } from '../services/api';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: AppRole;
  isLeadMentor: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<UserProfile>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRealProfile = async (): Promise<UserProfile | null> => {
    try {
      const realProfile = await getCurrentUserProfile();
      setCurrentUser(realProfile);
      if (realProfile) {
        localStorage.setItem('edupulse_active_user', JSON.stringify(realProfile));
      } else {
        localStorage.removeItem('edupulse_active_user');
      }
      return realProfile;
    } catch (e) {
      console.warn('Lỗi khi tải hồ sơ người dùng:', e);
      setCurrentUser(null);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        await recoverOAuthSessionFromUrl();
      } catch (e) {
        console.warn(e);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        loadRealProfile().catch(() => setIsLoading(false));
      } else {
        localStorage.removeItem('edupulse_active_user');
        setCurrentUser(null);
        setIsLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && event !== 'TOKEN_REFRESHED') {
        try {
          await loadRealProfile();
        } catch {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('edupulse_active_user');
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Chưa cấu hình VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.');
    }
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Chưa cấu hình Supabase.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    if (!data.user) throw new Error('Đăng nhập không tạo được phiên.');
    const profile = await loadRealProfile();
    if (!profile) throw new Error('Đăng nhập được nhưng chưa ghi được hồ sơ vào bảng profiles. Chạy supabase/auth_profile_fix.sql trên SQL Editor rồi thử lại.');
    return profile;
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Chưa cấu hình Supabase.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0]
        }
      }
    });
    if (error) throw error;
    if (!data.session) {
      setIsLoading(false);
      return null;
    }
    const profile = await loadRealProfile();
    if (!profile) throw new Error('Tài khoản Auth đã tạo nhưng hồ sơ profiles chưa được ghi. Chạy supabase/auth_profile_fix.sql.');
    return profile;
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Lỗi đăng xuất:', e);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('edupulse_active_user');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || 'student',
        isLeadMentor: Boolean(currentUser?.isLeadMentor),
        isLoading,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        isConfigured: isSupabaseConfigured,
        refreshProfile: loadRealProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
