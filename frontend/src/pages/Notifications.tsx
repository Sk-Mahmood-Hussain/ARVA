import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Loader2,
  Inbox
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'BROADCAST' | 'APPOINTMENT' | 'DISEASE' | 'BAN_REQUEST' | 'TRANSFER_REQUEST' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export const Notifications: React.FC = () => {
  const { refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'BROADCAST':
        return <Bell className="w-5 h-5 text-amber-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      case 'DISEASE':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'BAN_REQUEST':
      case 'TRANSFER_REQUEST':
        return <ShieldAlert className="w-5 h-5 text-blue-650" />;
      default:
        return <Bell className="w-5 h-5 text-stone-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Loading notifications...</span>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
      <div className="bg-[#ffffff] border border-stone-200 shadow-xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-stone-50 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <Bell className="w-6 h-6 mr-2 text-amber-300" />
              Notification Center
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1">
              Stay updated with the latest alerts, appointments, and crop diagnostic notifications.
            </p>
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center text-stone-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-stone-150">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                n.read ? 'bg-stone-50/40' : 'bg-emerald-50/15'
              }`}
            >
              <div className={`p-2.5 rounded-2xl ${n.read ? 'bg-stone-100' : 'bg-emerald-100/70'}`}>
                {getIcon(n.type)}
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className={`text-sm font-bold ${n.read ? 'text-stone-800' : 'text-stone-900'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-stone-400 font-bold">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  {n.message}
                </p>
                {!n.read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-[10px] text-emerald-700 font-bold hover:underline pt-1.5 block"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-20 px-4 flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-stone-100 rounded-full text-stone-400">
                <Inbox className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-stone-700">Inbox is empty</h3>
              <p className="text-xs text-stone-500 max-w-[280px]">
                You have no active alerts or advisories right now. We will notify you when something comes up!
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Notifications;
