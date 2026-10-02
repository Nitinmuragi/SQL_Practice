import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

export const AuthLayout = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (!loading && isAuthenticated) {
    if (location.pathname === '/admin/login') {
      if (user?.is_admin) {
        return <Navigate to="/admin/challenges" replace />;
      }
      // If currently signed in as a student, allow them to remain on /admin/login so they can sign in as admin
    } else {
      return <Navigate to={user?.is_admin ? '/admin/challenges' : '/dashboard'} replace />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};
