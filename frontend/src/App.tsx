import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import NotFound from './pages/NotFound';

// Authenticated Farmer Pages
import Onboarding from './pages/farmer/Onboarding';
import FarmerDashboard from './pages/farmer/Dashboard';
import Profile from './pages/farmer/Profile';
import Assistant from './pages/farmer/Assistant';
import Alerts from './pages/farmer/Alerts';
import ImageDetection from './pages/farmer/ImageDetection';
import Weather from './pages/farmer/Weather';
import Advisory from './pages/farmer/Advisory';
import Officers from './pages/farmer/Officers';

// Authenticated Officer Pages
import OfficerDashboard from './pages/officer/Dashboard';
import OfficerProfile from './pages/officer/Profile';
import OfficerAnalytics from './pages/officer/Analytics';

// Authenticated Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProfile from './pages/admin/Profile';
import AdminAnalytics from './pages/admin/Analytics';

// Shared Authenticated Pages
import Notifications from './pages/Notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Farmer Onboarding Route (Must be Farmer, but onboarding not necessarily completed) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Farmer Dashboard Route */}
            <Route
              path="/farmer"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <FarmerDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Assistant Route */}
            <Route
              path="/farmer/assistant"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Assistant />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Image Detection Route */}
            <Route
              path="/farmer/image-detection"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <ImageDetection />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Alerts Route */}
            <Route
              path="/farmer/alerts"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Alerts />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Profile Route */}
            <Route
              path="/farmer/profile"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Weather Route */}
            <Route
              path="/farmer/weather"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Weather />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Advisory Route */}
            <Route
              path="/farmer/advisory"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Advisory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Farmer Officers Route */}
            <Route
              path="/farmer/officers"
              element={
                <ProtectedRoute allowedRoles={['FARMER']}>
                  <DashboardLayout>
                    <Officers />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Officer Dashboard Route */}
            <Route
              path="/officer"
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <DashboardLayout>
                    <OfficerDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Officer Analytics Route */}
            <Route
              path="/officer/analytics"
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <DashboardLayout>
                    <OfficerAnalytics />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Officer Profile Route */}
            <Route
              path="/officer/profile"
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <DashboardLayout>
                    <OfficerProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard Route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DashboardLayout>
                    <AdminDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Analytics Route */}
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DashboardLayout>
                    <AdminAnalytics />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Profile Route */}
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DashboardLayout>
                    <AdminProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Shared Notifications Route */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={['FARMER', 'OFFICER', 'ADMIN']}>
                  <DashboardLayout>
                    <Notifications />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 Route */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
