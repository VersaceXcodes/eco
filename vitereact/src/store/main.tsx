import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface AuthState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

interface Initiative {
  id: string;
  title: string;
  description: string;
}

interface ImpactMetrics {
  carbon_saved: number;
  water_saved: number;
}

interface EnvSettings {
  theme: 'light' | 'dark';
}

type AppState = {
  auth_state: AuthState;
  featured_initiatives: Initiative[];
  user_impact: ImpactMetrics | null;
  notification_count: number;
  environment_settings: EnvSettings;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  check_auth: () => Promise<void>;
  clear_error: () => void;
  set_featured_initiatives: (initiatives: Initiative[]) => void;
  set_user_impact: (impact: ImpactMetrics) => void;
  set_notification_count: (count: number) => void;
  update_environment_settings: (settings: EnvSettings) => void;
};

// Export types for component usage
export type { User, AuthState, Initiative, ImpactMetrics, EnvSettings, AppState };

// Store creation
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Initial state
      auth_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },
      featured_initiatives: [],
      user_impact: null,
      notification_count: 0,
      environment_settings: {
        theme: 'light',
      },

      // Auth Actions
      login: async (email: string, password: string) => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            authentication_status: {
             ...state.auth_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set((state) => ({
            auth_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set((state) => ({
            auth_state: {
             ...state.auth_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set(() => ({
          auth_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      },

      check_auth: async () => {
        const { auth_state } = get();
        const token = auth_state.auth_token;

        if (!token) {
          set((state) => ({
            auth_state: {
             ...state.auth_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/verify`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const { user } = response.data;
          
          set((state) => ({
            auth_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error) {
          set(() => ({
            auth_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_error: () => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            error_message: null,
          },
        }));
      },

      // State management actions
      set_featured_initiatives: (initiatives: Initiative[]) => {
        return set({ featured_initiatives: initiatives });
      },

      set_user_impact: (impact: ImpactMetrics) => {
        return set({ user_impact: impact });
      },

      set_notification_count: (count: number) => {
        return set({ notification_count: count });
      },

      update_environment_settings: (settings: EnvSettings) => {
        return set({ environment_settings: settings });
      },
    }),
    {
      name: 'eco-app-storage',
      partialize: (state) => ({
        auth_state: {
          current_user: state.auth_state.current_user,
          auth_token: state.auth_state.auth_token,
          authentication_status: {
            is_authenticated: state.auth_state.authentication_status.is_authenticated,
            is_loading: false,
          },
          error_message: null,
        },
      }),
    }
  )
);