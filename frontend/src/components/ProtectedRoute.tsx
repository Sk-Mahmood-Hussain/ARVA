import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-emerald-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-stone-600 font-medium animate-pulse">Loading ARVA Portal...</p>
      </div>
    );
  }

  // 1. Not logged in -> Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in, but role is not allowed -> redirect to corresponding home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'OFFICER') return <Navigate to="/officer" replace />;
    return <Navigate to="/farmer" replace />;
  }

  // 3. Farmer specific checks: Onboarding must be completed
  if (user.role === 'FARMER') {
    const isOnboardingPage = location.pathname === '/onboarding';
    
    if (!user.onboardingCompleted && !isOnboardingPage) {
      // Force onboarding
      return <Navigate to="/onboarding" replace />;
    }
    
    if (user.onboardingCompleted && isOnboardingPage) {
      // Already completed -> skip onboarding page
      return <Navigate to="/farmer" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
