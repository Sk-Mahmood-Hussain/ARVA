import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User as UserIcon,
  Phone,
  Mail,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Camera
} from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Invalid phone number').optional().or(z.literal('')),
  language: z.string().min(1, 'Language preference is required'),
  notification_retention_days: z.number({ invalid_type_error: 'Retention must be a number' }).min(1, 'Retention must be at least 1 day'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const AdminProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const fetchProfileAndSettings = async () => {
    try {
      const [meRes, settingsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/admin/settings'),
      ]);
      
      const me = meRes.data?.data?.user;
      const settings = settingsRes.data?.data || {};
      
      if (me) {
        reset({
          name: me.name || '',
          phoneNumber: me.phoneNumber || '',
          language: me.language || 'en',
          notification_retention_days: parseInt(settings.notification_retention_days || '7', 10),
        });
      }
    } catch (err: any) {
      setErrorMsg('Failed to fetch profile/settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndSettings();
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.post('/auth/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await refreshUser();
      setSuccessMsg('Profile photo uploaded successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // 1. Save user details
      await api.patch('/farmers/profile', {
        name: values.name,
        phoneNumber: values.phoneNumber,
        language: values.language,
      });

      // 2. Save retention days setting
      await api.post('/admin/settings', {
        notification_retention_days: values.notification_retention_days,
      });

      await refreshUser();
      setSuccessMsg('Profile details and system configuration saved successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save settings changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Loading admin dashboard settings...</span>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
      <div className="bg-[#ffffff] border border-stone-200 shadow-xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-750 to-red-800 text-stone-50 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System & Account Administration</h1>
          <p className="text-red-100/90 text-sm mt-1">
            Manage your administrator profile picture, details, and global notification retention rules.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm animate-pulse">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left Avatar */}
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3 bg-[#faf9f5]/55 p-6 border border-stone-150 rounded-3xl">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-red-100 shadow-md bg-stone-105 group">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100">
                    <UserIcon className="w-16 h-16" />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center text-stone-50">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>
              <div className="relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  type="button"
                  className="px-4 py-2 border border-stone-300 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-750 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
              </div>
              <p className="text-[10px] text-stone-400 font-bold text-center">JPG, PNG, or GIF up to 5MB</p>
            </div>

            {/* Right Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full md:w-2/3 space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-red-700" />
                  Administrator Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Full Name</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    {errors.name && <p className="text-xs text-red-650 mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Language Preference</label>
                    <select
                      {...register('language')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-1" /> Mobile Number
                    </label>
                    <input
                      type="text"
                      {...register('phoneNumber')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-1" /> Email Address (Read-only)
                    </label>
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-200 bg-stone-100 rounded-xl text-sm text-stone-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-red-700" />
                  System Configuration
                </h3>
                <div>
                  <label className="block text-xs font-bold text-stone-600">Notification Retention Period (Days)</label>
                  <input
                    type="number"
                    {...register('notification_retention_days', { valueAsNumber: true })}
                    className="mt-1 block w-full max-w-[200px] px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  {errors.notification_retention_days && <p className="text-xs text-red-650 mt-1">{errors.notification_retention_days.message}</p>}
                  <p className="text-[10px] text-stone-400 font-bold mt-1.5">
                    Expired system notifications and broadcasts will be deleted permanently from the database after this threshold.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-6 py-2.5 border border-stone-300 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 border border-transparent text-stone-50 bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile & Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminProfile;
