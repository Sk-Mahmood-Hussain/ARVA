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
  Briefcase,
  Camera
} from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Invalid phone number').optional().or(z.literal('')),
  language: z.string().min(1, 'Language preference is required'),
  designation: z.string().min(2, 'Designation is required'),
  qualification: z.string().min(2, 'Qualification is required'),
  callingTime: z.string().min(2, 'Calling hours are required'),
  department: z.string().min(2, 'Department is required'),
  experience: z.string().optional().or(z.literal('')),
  availability: z.string().min(1, 'Availability is required'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const OfficerProfile: React.FC = () => {
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

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      const me = res.data?.data?.user;
      if (me) {
        reset({
          name: me.name || '',
          phoneNumber: me.phoneNumber || '',
          language: me.language || 'en',
          designation: me.profile?.designation || '',
          qualification: me.profile?.qualification || '',
          callingTime: me.profile?.callingTime || '9:00 AM - 5:00 PM',
          department: me.profile?.department || '',
          experience: me.profile?.experience || '',
          availability: me.profile?.availability || 'Available',
        });
      }
    } catch (err: any) {
      setErrorMsg('Failed to fetch profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
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
      setSuccessMsg('Profile photo uploaded and updated successfully!');
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
      await api.put('/officers/profile', values);
      await refreshUser();
      setSuccessMsg('Your profile details have been saved successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Loading profile...</span>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
      <div className="bg-[#ffffff] border border-stone-200 shadow-xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-stone-50 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Officer Profile Settings</h1>
          <p className="text-amber-100/90 text-sm mt-1">
            Update your public profile, qualifications, calling hours, and availability.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-655 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left: Avatar Photo uploader */}
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3 bg-[#faf9f5]/55 p-6 border border-stone-150 rounded-3xl">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-amber-100 shadow-md bg-stone-105 group">
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

            {/* Right: Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full md:w-2/3 space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-amber-700" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Full Name</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {errors.name && <p className="text-xs text-red-650 mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Preferred Language</label>
                    <select
                      {...register('language')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
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
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

              {/* Office Details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-amber-700" />
                  Officer Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Official Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Block Agriculture Development Officer"
                      {...register('designation')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {errors.designation && <p className="text-xs text-red-650 mt-1">{errors.designation.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Dept of Agriculture & Farmer Welfare"
                      {...register('department')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {errors.department && <p className="text-xs text-red-650 mt-1">{errors.department.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Qualifications</label>
                    <input
                      type="text"
                      placeholder="e.g. M.Sc. Agronomy / Ph.D Plant Pathology"
                      {...register('qualification')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {errors.qualification && <p className="text-xs text-red-650 mt-1">{errors.qualification.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Calling Hours</label>
                    <input
                      type="text"
                      placeholder="e.g. 9:00 AM - 5:00 PM"
                      {...register('callingTime')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {errors.callingTime && <p className="text-xs text-red-655 mt-1">{errors.callingTime.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Availability / Availability Status</label>
                    <select
                      {...register('availability')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Years of Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. 8 Years"
                      {...register('experience')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/officer')}
                  className="px-6 py-2.5 border border-stone-300 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 border border-transparent text-stone-50 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OfficerProfile;
