import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LogOut,
  User as UserIcon,
  Shield,
  Briefcase,
  Menu,
  X,
  Sprout,
  LayoutDashboard,
  Bell,
  BookOpen,
  Calendar,
  Users,
  AlertTriangle,
  Globe,
  FileText,
  MessageSquare,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const unread = res.data.data.filter((n: any) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    return `/${user.role.toLowerCase()}`;
  };

  const getProfilePath = () => {
    if (!user) return '/';
    return `/${user.role.toLowerCase()}/profile`;
  };

  const isLinkActive = (path: string) => {
    const currentFull = location.pathname + location.search;
    if (path.includes('?')) {
      return currentFull === path;
    }
    return location.pathname === path && !location.search;
  };

  const getNavLinks = () => {
    if (!user) return [];
    
    if (user.role === 'FARMER') {
      return [
        { label: 'Dashboard', path: '/farmer', icon: LayoutDashboard },
        { label: 'AI Assistant', path: '/farmer/assistant', icon: MessageSquare },
        { label: 'Image Detection', path: '/farmer/image-detection', icon: ImageIcon },
        { label: 'My Profile', path: '/farmer/profile', icon: UserIcon },
        { label: 'My Officers', path: '/farmer/profile', icon: Shield },
        { label: 'Community', path: '/farmer?tab=community', icon: Users },
        { label: 'Government Schemes', path: '/farmer?tab=schemes', icon: BookOpen },
        { label: 'Appointments', path: '/farmer?tab=appointments', icon: Calendar },
        { label: 'Notifications', path: '/notifications', icon: Bell },
      ];
    } else if (user.role === 'OFFICER') {
      return [
        { label: 'Dashboard', path: '/officer', icon: LayoutDashboard },
        { label: 'Farmers', path: '/officer?tab=farmers', icon: Users },
        { label: 'Disease Cases', path: '/officer?tab=cases', icon: AlertTriangle },
        { label: 'Appointments', path: '/officer?tab=appointments', icon: Calendar },
        { label: 'Regional Alerts', path: '/officer?tab=broadcasts', icon: Bell },
        { label: 'Analytics', path: '/officer?tab=analytics', icon: FileText },
        { label: 'Profile', path: '/officer/profile', icon: UserIcon },
      ];
    } else {
      return [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { label: 'Users', path: '/admin?tab=users', icon: Users },
        { label: 'Officers', path: '/admin?tab=officers', icon: Briefcase },
        { label: 'Regions', path: '/admin?tab=regions', icon: Globe },
        { label: 'Schemes', path: '/admin?tab=schemes', icon: BookOpen },
        { label: 'Broadcasts', path: '/admin?tab=broadcasts', icon: Bell },
        { label: 'Reports', path: '/admin?tab=requests', icon: ShieldAlert },
        { label: 'Requests', path: '/admin?tab=requests', icon: AlertTriangle },
        { label: 'Analytics', path: '/admin?tab=dashboard', icon: FileText },
      ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-[#faf6ee] flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Brand and Hamburger Menu Toggle */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-emerald-800 transition-all cursor-pointer"
                title="Open Menu Drawer"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link to={getDashboardPath()} className="flex items-center space-x-2">
                <div className="bg-emerald-600 p-2 rounded-xl text-amber-100 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-emerald-800">
                  ARVA
                </span>
              </Link>
            </div>

            {/* Right Minimal Actions (Desktop & Mobile Unified Layout) */}
            <div className="flex items-center space-x-4">
              {/* Notification icon with unread badge */}
              <Link
                to="/notifications"
                className="relative p-2 text-stone-600 hover:text-emerald-800 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                title="Notification Center"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-stone-50 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Avatar icon */}
              <Link
                to={getProfilePath()}
                className="w-9 h-9 rounded-full overflow-hidden border border-stone-200 bg-stone-100 hover:border-emerald-600 transition-all flex items-center justify-center cursor-pointer"
                title="My Profile"
              >
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-stone-500" />
                )}
              </Link>

              {/* Explicit Logout icon button */}
              <button
                onClick={handleLogout}
                className="p-2 text-stone-600 hover:text-red-700 hover:bg-stone-150 rounded-full transition-colors cursor-pointer"
                title="Logout Session"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Slide-out Drawer Panel (Both Desktop & Mobile) */}
      {drawerOpen && (
        <>
          {/* Backdrop mask */}
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer content body */}
          <div className="fixed top-0 left-0 h-full w-80 bg-[#ffffff] border-r border-stone-200 shadow-2xl z-50 transform translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 border-b border-stone-250 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-[#064e3b] text-stone-50">
                <div className="flex items-center space-x-2">
                  <Sprout className="w-5 h-5 text-amber-300" />
                  <span className="font-extrabold text-base tracking-tight">ARVA Menu Hub</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-lg text-emerald-100 hover:bg-emerald-700 hover:text-stone-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User profile card inside drawer */}
              <div className="p-4 border-b border-stone-150 bg-stone-50/50 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0">
                  {user?.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-xs text-stone-850 truncate">{user?.name}</p>
                  <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Links list */}
              <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[60vh]">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.path);
                  return (
                    <Link
                      key={link.label}
                      to={link.path}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-sm'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-3 ${active ? 'text-emerald-700' : 'text-stone-400'}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout at bottom */}
            <div className="p-4 border-t border-stone-200">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full inline-flex items-center justify-center py-2.5 border border-stone-300 rounded-xl text-sm font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout Session
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Body */}
      <div className="flex-grow">
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-6 text-center text-xs text-stone-400 font-semibold mt-auto">
        <p>© {new Date().getFullYear()} ARVA. Developed for Punjab Agriculture Advisory & Smart India Hackathon (SIH25010).</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
