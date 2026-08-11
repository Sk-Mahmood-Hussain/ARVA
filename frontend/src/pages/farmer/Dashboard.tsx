import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { FarmerProfile } from '../../types';
import {
  User,
  Sprout,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Award,
  BookOpen,
  Calendar,
  Users,
  Bell,
  Heart,
  MessageSquare,
  Plus,
  Trash2,
  Search,
  Loader2,
  ArrowRight,
  Shield
} from 'lucide-react';

// ==========================================
// FORM SCHEMAS
// ==========================================
const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  block: z.string().min(1, 'Block is required'),
  village: z.string().min(1, 'Village is required'),
  landSize: z.number({ invalid_type_error: 'Land size must be a number' }).positive('Land size must be positive'),
  soilType: z.string().min(1, 'Soil type is required'),
  irrigationType: z.string().min(1, 'Irrigation type is required'),
  primaryCrop: z.string().min(1, 'Primary crop is required'),
  cropGrowthStage: z.string().min(1, 'Crop growth stage is required'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const FarmerDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'dashboard';

  // State Variables
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: Broadcasts & Notifications
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Tab: Community
  const [posts, setPosts] = useState<any[]>([]);
  const [postCategory, setPostCategory] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [postSort, setPostSort] = useState('recent');
  const [postText, setPostText] = useState('');
  const [postCrop, setPostCrop] = useState('General');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Tab: Schemes
  const [schemes, setSchemes] = useState<any[]>([]);
  const [schemeSearch, setSchemeSearch] = useState('');

  // Tab: Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptDate, setApptDate] = useState('');
  const [apptReason, setApptReason] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Profile Edit Regions Select Chain
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [villages, setVillages] = useState<{ id: string; village: string }[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [advisory, setAdvisory] = useState<any | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  // Setup Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors: formErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const selectedState = watch('state');
  const selectedDistrict = watch('district');
  const selectedBlock = watch('block');

  // Load basic farmer profile & dashboard parameters
  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/farmers/dashboard');
      if (res.data.data.profile) {
        setProfile(res.data.data.profile);
        // Reset form values with profile values
        reset({
          name: user?.name || '',
          phoneNumber: user?.phoneNumber || '',
          address: res.data.data.profile.address,
          state: res.data.data.profile.region.state,
          district: res.data.data.profile.region.district,
          block: res.data.data.profile.region.block,
          village: res.data.data.profile.region.village,
          landSize: res.data.data.profile.landSize,
          soilType: res.data.data.profile.soilType,
          irrigationType: res.data.data.profile.irrigationType,
          primaryCrop: res.data.data.profile.primaryCrop,
          cropGrowthStage: res.data.data.profile.cropGrowthStage,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchAdvisoryData = async () => {
    setLoadingAdvisory(true);
    try {
      const res = await api.get('/ai/advisory');
      setAdvisory(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdvisory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      navigate('/farmer/profile');
    }
  }, [activeTab]);

  // Load Tab specific data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Load recent broadcasts & notifications & appointments & RAG advisory
      api.get('/broadcasts').then((r) => setBroadcasts(r.data.data.slice(0, 3))).catch(console.error);
      api.get('/notifications').then((r) => setNotifications(r.data.data.slice(0, 3))).catch(console.error);
      api.get('/appointments').then((r) => setAppointments(r.data.data.slice(0, 3))).catch(console.error);
      fetchAdvisoryData();
    } else if (activeTab === 'notifications') {
      api.get('/notifications').then((r) => setNotifications(r.data.data)).catch(console.error);
    } else if (activeTab === 'broadcasts') {
      api.get('/broadcasts').then((r) => setBroadcasts(r.data.data)).catch(console.error);
    } else if (activeTab === 'community') {
      fetchCommunityPosts();
    } else if (activeTab === 'schemes') {
      fetchSchemes();
    } else if (activeTab === 'appointments') {
      api.get('/appointments').then((r) => setAppointments(r.data.data)).catch(console.error);
    } else if (activeTab === 'profile') {
      // Load States list
      api.get('/regions/states').then((r) => setStates(r.data.data)).catch(console.error);
    }
  }, [activeTab, postCategory, postSearch, postSort, schemeSearch]);

  const fetchCommunityPosts = async () => {
    try {
      const categoryParam = postCategory ? `&category=${postCategory}` : '';
      const searchParam = postSearch ? `&search=${postSearch}` : '';
      const res = await api.get(`/community?sort=${postSort}${categoryParam}${searchParam}`);
      setPosts(res.data.data.posts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchemes = async () => {
    try {
      const searchParam = schemeSearch ? `?search=${schemeSearch}` : '';
      const res = await api.get(`/schemes${searchParam}`);
      setSchemes(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Region selects logic for Profile tab
  useEffect(() => {
    if (!selectedState) return;
    const fetchDistricts = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/districts?state=${selectedState}`);
        setDistricts(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchDistricts();
  }, [selectedState]);

  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchBlocks = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/blocks?state=${selectedState}&district=${selectedDistrict}`);
        setBlocks(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchBlocks();
  }, [selectedDistrict]);

  useEffect(() => {
    if (!selectedBlock) return;
    const fetchVillages = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/villages?state=${selectedState}&district=${selectedDistrict}&block=${selectedBlock}`);
        setVillages(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchVillages();
  }, [selectedBlock]);

  // Actions
  const handleSaveProfile = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      await api.patch('/farmers/profile', values);
      await refreshUser();
      await fetchDashboardData();
      alert('Profile updated successfully! If you updated your village/block, your designated officer was recalculated.');
      navigate('/farmer');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', postText);
      formData.append('category', postCrop);
      formData.append('location', `${profile?.region.village}, ${profile?.region.block}`);
      if (postImage) {
        formData.append('image', postImage);
      }

      await api.post('/community', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPostText('');
      setPostImage(null);
      fetchCommunityPosts();
      alert('Post created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await api.post(`/community/${postId}/like`);
      // Update locally
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              hasLiked: !p.hasLiked,
              likeCount: p.hasLiked ? p.likeCount - 1 : p.likeCount + 1,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await api.post(`/community/${postId}/comments`, { content: commentText });
      setCommentText('');
      // Reload posts to update comments counts or reload specific post detail if we had it
      fetchCommunityPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/community/${postId}`);
      fetchCommunityPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/community/comments/${commentId}`);
      fetchCommunityPosts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete comment.');
    }
  };

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptDate || !apptReason.trim()) return;
    setScheduling(true);
    try {
      await api.post('/appointments', { date: apptDate, reason: apptReason });
      setApptDate('');
      setApptReason('');
      alert('Appointment requested successfully! The designated officer was notified.');
      // Refresh
      const r = await api.get('/appointments');
      setAppointments(r.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request appointment');
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment request?')) return;
    try {
      await api.patch(`/appointments/${apptId}`, { status: 'CANCELLED' });
      // Refresh
      const r = await api.get('/appointments');
      setAppointments(r.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationRead = async (notifyId: string) => {
    try {
      await api.patch(`/notifications/${notifyId}`);
      setNotifications((prev) => prev.map((n) => (n.id === notifyId ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Syncing Dashboard Data...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl text-center">
        <h3 className="text-lg font-bold">Access Warning</h3>
        <p className="mt-2 text-sm">{error || 'Could not verify farmer onboarding.'}</p>
        <button onClick={() => navigate('/onboarding')} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700">
          Go to Onboarding Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* 1. COMMAND CENTER (DASHBOARD) TAB */}
      {activeTab === 'dashboard' && (
        <>
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-stone-50 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-emerald-200 text-xs font-bold uppercase tracking-widest">Farmer Portal</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                Sat Sri Akal, {user?.name}
              </h1>
              <p className="text-emerald-100/90 text-sm mt-1">
                Command center for regional Punjab crop advisories and block services.
              </p>
            </div>
            <div className="bg-emerald-600/50 backdrop-blur-sm border border-emerald-500/30 px-4 py-2 rounded-2xl flex items-center space-x-2 text-sm">
              <MapPin className="w-4 h-4 text-amber-300" />
              <span className="font-semibold text-emerald-100">{profile.region.village}, {profile.region.block}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Metrics column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Farm summary details */}
              <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
                <h3 className="text-lg font-bold text-stone-900 flex items-center border-b border-stone-200 pb-2">
                  <Sprout className="w-5 h-5 mr-2 text-emerald-700" />
                  Registered Farm Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Primary Crop</span>
                    <span className="text-lg font-extrabold text-stone-800">{profile.primaryCrop}</span>
                  </div>
                  <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Growth Stage</span>
                    <span className="text-lg font-extrabold text-stone-800">{profile.cropGrowthStage}</span>
                  </div>
                  <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Land Size</span>
                    <span className="text-lg font-extrabold text-stone-800">{profile.landSize} Acres</span>
                  </div>
                  <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Soil Category</span>
                    <span className="text-lg font-extrabold text-stone-800">{profile.soilType}</span>
                  </div>
                  <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl col-span-2 sm:col-span-1">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Irrigation System</span>
                    <span className="text-lg font-extrabold text-stone-800">{profile.irrigationType}</span>
                  </div>
                </div>
              </div>

              {/* Smart Crop & Weather Advisory Card */}
              <div className="bg-[#ffffff] border border-stone-200 shadow-sm rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                  <h3 className="text-lg font-bold text-stone-900 flex items-center">
                    <Sprout className="w-5 h-5 mr-2 text-emerald-700" />
                    Live Weather & Crop Advisory
                  </h3>
                  <button
                    onClick={fetchAdvisoryData}
                    disabled={loadingAdvisory}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-extrabold cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1"
                  >
                    {loadingAdvisory ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Refresh Advisory</span>
                    )}
                  </button>
                </div>

                {loadingAdvisory ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-stone-400 text-xs font-semibold">Compiling agricultural recommendations...</span>
                  </div>
                ) : advisory ? (
                  <div className="space-y-4">
                    {/* Live Weather Metrics */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Live Climate Status</span>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">{advisory.weather.description}</p>
                      </div>
                      <div className="flex space-x-4">
                        <div className="text-right">
                          <span className="block text-[9px] font-bold text-stone-400 uppercase">Temp</span>
                          <span className="text-sm font-extrabold text-stone-850">{advisory.weather.temp}°C</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-bold text-stone-400 uppercase">Wind</span>
                          <span className="text-sm font-extrabold text-stone-850">{advisory.weather.windspeed} km/h</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Advisory Report content */}
                    <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-850">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <span>Weather-Aware Crop Recommendations (ARVA AI)</span>
                      </div>
                      <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">
                        {advisory.advisory}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 text-center py-6 font-semibold">No crop advisory data fetched. Check profile settings.</p>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl">
                <h3 className="text-lg font-bold text-stone-900 mb-4 border-b border-stone-200 pb-2">Quick Commands</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button onClick={() => navigate('/farmer?tab=community')} className="flex flex-col items-center justify-center p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 cursor-pointer">
                    <Users className="w-6 h-6 text-emerald-700 mb-1" />
                    <span className="text-xs font-bold text-stone-700">Community Feed</span>
                  </button>
                  <button onClick={() => navigate('/farmer?tab=schemes')} className="flex flex-col items-center justify-center p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 cursor-pointer">
                    <BookOpen className="w-6 h-6 text-emerald-700 mb-1" />
                    <span className="text-xs font-bold text-stone-700">Government Schemes</span>
                  </button>
                  <button onClick={() => navigate('/farmer?tab=appointments')} className="flex flex-col items-center justify-center p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 cursor-pointer">
                    <Calendar className="w-6 h-6 text-emerald-700 mb-1" />
                    <span className="text-xs font-bold text-stone-700">Consultation Slots</span>
                  </button>
                  <button onClick={() => navigate('/farmer?tab=profile')} className="flex flex-col items-center justify-center p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 cursor-pointer">
                    <User className="w-6 h-6 text-emerald-700 mb-1" />
                    <span className="text-xs font-bold text-stone-700">Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Designated officer column */}
            <div className="space-y-8">
              {/* Designated Officer */}
              <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6 flex flex-col">
                <h3 className="text-lg font-bold text-stone-900 flex items-center border-b border-stone-200 pb-2">
                  <User className="w-5 h-5 mr-2 text-emerald-700" />
                  Your Agriculture Officer
                </h3>
                {profile.assignedOfficer ? (
                  <div className="space-y-5 flex-grow">
                    <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-2xl flex flex-col items-center text-center">
                      <div className="bg-emerald-100 p-3 rounded-full text-emerald-700 mb-2">
                        <User className="w-8 h-8" />
                      </div>
                      <h4 className="font-extrabold text-stone-800 text-base">
                        {profile.assignedOfficer.user.name}
                      </h4>
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
                        Block Advisory Officer
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-center space-x-3 text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                        <a href={`mailto:${profile.assignedOfficer.user.email}`} className="truncate hover:underline">
                          {profile.assignedOfficer.user.email}
                        </a>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{profile.assignedOfficer.user.phoneNumber || 'No phone number'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center py-6 space-y-3">
                    <ShieldAlert className="w-8 h-8 text-amber-600" />
                    <h4 className="font-bold text-stone-800">Pending Assignment</h4>
                    <p className="text-xs text-stone-500 max-w-[200px]">
                      No Agriculture Officer is registered for your region village.
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Broadcast alerts */}
              <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                  <h3 className="text-base font-bold text-stone-900 flex items-center">
                    <Award className="w-5 h-5 mr-1.5 text-emerald-700" />
                    Advisories & Alerts
                  </h3>
                  <button onClick={() => navigate('/farmer?tab=broadcasts')} className="text-xs text-emerald-700 font-bold hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {broadcasts.map((br) => (
                    <div key={br.id} className="p-3 border border-stone-100 bg-[#faf9f5] rounded-2xl">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1.5 ${
                        br.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {br.priority} Alert
                      </span>
                      <h4 className="text-xs font-bold text-stone-800">{br.title}</h4>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{br.message}</p>
                    </div>
                  ))}
                  {broadcasts.length === 0 && (
                    <p className="text-stone-400 text-xs font-semibold py-4 text-center">No active crop advisories.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. PROFILE EDIT TAB */}
      {activeTab === 'profile' && (
        <main className="max-w-3xl mx-auto">
          <div className="bg-[#ffffff] p-6 sm:p-10 border border-stone-200 shadow-sm rounded-3xl space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Update Farmer Profile Details
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Changing your state, district, block, or village will trigger reassignment rules.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleSaveProfile)} className="space-y-6">
              <h2 className="text-lg font-bold text-emerald-800 border-b border-stone-200 pb-1.5">
                1. Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Farmer Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Phone Number</label>
                  <input
                    type="text"
                    {...register('phoneNumber')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.phoneNumber.message}</p>}
                </div>
              </div>

              <h2 className="text-lg font-bold text-emerald-800 border-b border-stone-200 pb-1.5 pt-4">
                2. Geographic Location
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">State</label>
                  <select
                    {...register('state')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">District</label>
                  <select
                    disabled={!selectedState || loadingRegions}
                    {...register('district')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Block</label>
                  <select
                    disabled={!selectedDistrict || loadingRegions}
                    {...register('block')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Block</option>
                    {blocks.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Village</label>
                  <select
                    disabled={!selectedBlock || loadingRegions}
                    {...register('village')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Village</option>
                    {villages.map((v) => (
                      <option key={v.id} value={v.village}>{v.village}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Physical Address</label>
                <textarea
                  rows={2}
                  {...register('address')}
                  className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <h2 className="text-lg font-bold text-emerald-800 border-b border-stone-200 pb-1.5 pt-4">
                3. Agricultural Parameters
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Land Size (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('landSize', { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Soil Type</label>
                  <select
                    {...register('soilType')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                  >
                    <option value="Clay">Clay</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Loamy">Loamy</option>
                    <option value="Silt">Silt</option>
                    <option value="Peaty">Peaty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Irrigation Type</label>
                  <select
                    {...register('irrigationType')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler Irrigation</option>
                    <option value="Tube Well">Tube Well</option>
                    <option value="Canal">Canal</option>
                    <option value="Rain-fed">Rain-fed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Primary Crop</label>
                  <select
                    {...register('primaryCrop')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                  >
                    <option value="Wheat">Wheat</option>
                    <option value="Paddy">Paddy (Rice)</option>
                    <option value="Maize">Maize</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Sugarcane">Sugarcane</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Crop Growth Stage</label>
                  <select
                    {...register('cropGrowthStage')}
                    className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                  >
                    <option value="Sowing">Sowing</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Maturity">Maturity</option>
                    <option value="Harvesting">Harvesting</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full flex justify-center py-3 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-55 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
                  Save Profile Modifications
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* 3. COMMUNITY FEED TAB */}
      {activeTab === 'community' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Form */}
            <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Publish to Community Feed</h3>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  rows={3}
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Share crop growth milestones, pest alerts, or agricultural queries..."
                  className="w-full px-4 py-3 border border-stone-300 bg-stone-50 rounded-2xl shadow-inner text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600">Category / Crop</label>
                    <select
                      value={postCrop}
                      onChange={(e) => setPostCrop(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                    >
                      <option value="General">General Advisory</option>
                      <option value="Wheat">Wheat Crop</option>
                      <option value="Paddy">Paddy Crop</option>
                      <option value="Maize">Maize Crop</option>
                      <option value="Cotton">Cotton Crop</option>
                      <option value="Sugarcane">Sugarcane Crop</option>
                      <option value="Pest Alert">Pest Alert</option>
                      <option value="Weather Alert">Weather Alert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600">Attach Post Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPostImage(e.target.files ? e.target.files[0] : null)}
                      className="mt-1 block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={posting || !postText.trim()}
                  className="w-full flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {posting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Publish Post
                </button>
              </form>
            </div>

            {/* Posts Catalog list */}
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#fcfbf9] border border-stone-200 p-2 rounded-xl text-stone-700 font-bold text-sm">
                        {post.author.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{post.author.name}</h4>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">{post.author.role} • {new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {/* Delete block */}
                    {(post.authorId === user?.id || user?.role === 'ADMIN') && (
                      <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-3">
                    <p className="text-sm text-stone-700 leading-relaxed">{post.content}</p>
                    {post.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm max-h-[300px] flex items-center justify-center bg-stone-50">
                        <img src={post.imageUrl} alt="post visual" className="object-contain max-h-[300px] w-full" />
                      </div>
                    )}
                  </div>

                  {/* Metadata labels */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <span className="px-2.5 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded-full">{post.category}</span>
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5" /> {post.location}
                    </span>
                  </div>

                  {/* Like / Comment triggers */}
                  <div className="flex items-center space-x-6 border-t border-b border-stone-100 py-3 text-stone-600 text-xs font-bold">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center space-x-1 hover:text-emerald-700 cursor-pointer ${
                        post.hasLiked ? 'text-red-600' : ''
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                      <span>{post.likeCount} Likes</span>
                    </button>
                    <button
                      onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                      className="flex items-center space-x-1 hover:text-emerald-700 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.commentCount} Comments</span>
                    </button>
                  </div>

                  {/* Comments section */}
                  {activeCommentsPostId === post.id && (
                    <div className="space-y-4 pt-2">
                      <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add public comment..."
                          className="flex-grow px-3 py-1.5 border border-stone-300 rounded-xl text-xs"
                        />
                        <button type="submit" className="bg-emerald-600 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700">
                          Submit
                        </button>
                      </form>
                      {/* Comments List */}
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {post.comments?.map((comment: any) => (
                          <div key={comment.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex justify-between items-start">
                            <div>
                              <span className="font-bold text-stone-900 block">{comment.user.name} ({comment.user.role})</span>
                              <span className="block mt-0.5">{comment.content}</span>
                            </div>
                            {(comment.userId === user?.id || comment.user?.id === user?.id || user?.role === 'ADMIN') && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-[10px] text-red-500 hover:text-red-750 font-bold shrink-0 ml-2 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                        {post.comments?.length === 0 && (
                          <p className="text-stone-400 text-[10px] text-center font-semibold">No comments on this post yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {posts.length === 0 && (
                <p className="text-stone-500 text-center font-semibold py-12">No posts available in community database.</p>
              )}
            </div>
          </div>

          {/* Right Filters Column */}
          <div className="space-y-6">
            <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Filter Feed</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500">Category Tag</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="General">General Advisory</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Paddy">Paddy</option>
                    <option value="Maize">Maize</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Sugarcane">Sugarcane</option>
                    <option value="Pest Alert">Pest Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500">Keyword Search</label>
                  <div className="mt-1 relative rounded-xl shadow-sm">
                    <input
                      type="text"
                      value={postSearch}
                      onChange={(e) => setPostSearch(e.target.value)}
                      placeholder="Search posts..."
                      className="block w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-stone-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500">Sorting</label>
                  <select
                    value={postSort}
                    onChange={(e) => setPostSort(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-xl text-sm"
                  >
                    <option value="recent">Recent Posts</option>
                    <option value="popular">Most Liked</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. GOVERNMENT SCHEMES TAB */}
      {activeTab === 'schemes' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-stone-900">National & State Agricultural Schemes</h2>
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={schemeSearch}
                onChange={(e) => setSchemeSearch(e.target.value)}
                placeholder="Search eligibility, crops, schemes..."
                className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none bg-stone-50"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schemes.map((sch) => (
              <div key={sch.id} className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-base font-extrabold text-stone-900">{sch.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{sch.description}</p>
                  
                  <div className="space-y-2 border-t border-stone-100 pt-3">
                    <div className="text-xs text-stone-700">
                      <span className="font-bold text-stone-800">Eligibility:</span> {sch.eligibility}
                    </div>
                    <div className="text-xs text-stone-700">
                      <span className="font-bold text-stone-800">Benefits:</span> {sch.benefits}
                    </div>
                    {sch.requiredDocuments && sch.requiredDocuments.length > 0 && (
                      <div className="text-xs text-stone-700">
                        <span className="font-bold text-stone-800">Documents Needed:</span> {sch.requiredDocuments.join(', ')}
                      </div>
                    )}
                    <div className="text-xs text-stone-500">
                      <span className="font-bold">Source:</span> {sch.source}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <a
                    href={sch.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Open Official Portal Application <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </a>
                </div>
              </div>
            ))}
            {schemes.length === 0 && (
              <p className="text-stone-500 font-semibold text-center py-12 col-span-2">No government schemes found matching filters.</p>
            )}
          </div>
        </div>
      )}

      {/* 5. CONSULTATION APPOINTMENTS TAB */}
      {activeTab === 'appointments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request appointment */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Request Officer Consultation</h3>
            
            {profile.assignedOfficer ? (
              <form onSubmit={handleScheduleAppointment} className="space-y-4">
                <div className="p-3 border border-emerald-100 bg-emerald-50/50 rounded-2xl text-xs text-stone-700">
                  <span className="block font-bold text-emerald-800">Assigned Officer:</span>
                  <span className="block mt-0.5">{profile.assignedOfficer.user.name}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600">Reason for Consultation</label>
                  <textarea
                    rows={3}
                    value={apptReason}
                    onChange={(e) => setApptReason(e.target.value)}
                    placeholder="e.g. Yellowing leaves in Wheat fields, crop pest advisory..."
                    className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={scheduling || !apptDate || !apptReason.trim()}
                  className="w-full flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {scheduling ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
                  Schedule Appointment
                </button>
              </form>
            ) : (
              <div className="p-4 border border-stone-200 rounded-2xl text-center text-xs text-stone-500">
                You cannot book appointments because no Agriculture Officer is designated to your village block region.
              </div>
            )}
          </div>

          {/* History / Status list */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Appointment History</h3>

            <div className="space-y-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-4 border border-stone-150 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">{new Date(appt.date).toLocaleString()}</span>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase mt-0.5 block">With Officer: {appt.officer.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        appt.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        appt.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        appt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {appt.status}
                      </span>
                      {['PENDING', 'ACCEPTED'].includes(appt.status) && (
                        <button onClick={() => handleCancelAppointment(appt.id)} className="text-xs font-bold text-red-600 hover:underline">Cancel</button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-stone-600">
                    <span className="font-bold text-stone-800 block">Consultation Reason:</span>
                    <p className="mt-0.5">{appt.reason}</p>
                  </div>

                  {appt.consultationNotes && (
                    <div className="text-xs text-stone-600 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                      <span className="font-bold text-stone-850 block">Officer Consultation Notes:</span>
                      <p className="mt-0.5 leading-relaxed italic">"{appt.consultationNotes}"</p>
                    </div>
                  )}
                </div>
              ))}
              {appointments.length === 0 && (
                <p className="text-stone-500 font-semibold text-center py-12">No historical appointments requested.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. NOTIFICATIONS HUB TAB */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl mx-auto bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-emerald-700" />
              Notifications Center
            </h2>
            <button onClick={handleMarkAllNotificationsRead} className="text-xs text-emerald-700 font-bold hover:underline">Mark all as read</button>
          </div>

          <div className="space-y-3">
            {notifications.map((notify) => (
              <div
                key={notify.id}
                className={`p-4 border rounded-2xl transition-colors flex justify-between items-center ${
                  notify.read ? 'border-stone-100 bg-[#faf9f5]/55 opacity-70' : 'border-emerald-200 bg-emerald-50/20'
                }`}
              >
                <div className="space-y-1 pr-4">
                  <h4 className={`text-sm font-bold ${notify.read ? 'text-stone-700' : 'text-stone-900'}`}>{notify.title}</h4>
                  <p className="text-xs text-stone-500 leading-relaxed">{notify.message}</p>
                  <span className="block text-[10px] text-stone-400 font-semibold uppercase">{new Date(notify.createdAt).toLocaleString()}</span>
                </div>
                {!notify.read && (
                  <button
                    onClick={() => handleMarkNotificationRead(notify.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-stone-500 font-semibold text-center py-12">Notifications inbox is empty.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
