import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// View components (replace with actual view imports as needed)
import UV_Login from '@/components/views/UV_Login';
import UV_Dashboard from '@/components/views/UV_Dashboard';

// Configure QueryClient with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.auth_state.is_authenticated);
  const isLoading = useAppStore(state => state.auth_state.is_loading);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  const isLoading = useAppStore(state => state.auth_state.is_loading);
  const checkAuth = useAppStore(state => state.checkAuth);

  // Initialize authentication check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="App min-h-screen flex flex-col">
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={<UV_Login />}
              />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UV_Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </QueryClientProvider>
    </Router>
  );
};

export default App;
