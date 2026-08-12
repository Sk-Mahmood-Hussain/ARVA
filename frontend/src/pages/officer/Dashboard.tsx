import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { Region } from '../../types';
import {
  Users,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Bell,
  Search,
  XCircle,
  Loader2,
  AlertTriangle,
  Send,
  TrendingUp,
  UserCheck,
  BarChart3
} from 'lucide-react';

interface FarmerInfo {
  id: string;
  address: string;
  landSize: number;
  soilType: string;
  irrigationType: string;
  primaryCrop: string;
  cropGrowthStage: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    status: string;
    lastLogin: string | null;
  };
  region: Region;
}

// Validation schemas for forms
const broadcastFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  message: z.string().min(10, 'Advisory alert must be at least 10 characters'),
  targetRegionId: z.string().min(1, 'Target block village region is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

type BroadcastFormValues = z.infer<typeof broadcastFormSchema>;

export const OfficerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'dashboard';

  // State Variables
  const [stats, setStats] = useState<any | null>(null);
  const [farmers, setFarmers] = useState<FarmerInfo[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);

  // AI cases
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [reviewCaseId, setReviewCaseId] = useState<string | null>(null);
  const [officerFeedback, setOfficerFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filters
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmerDetail, setSelectedFarmerDetail] = useState<any | null>(null);

  // Request forms states
  const [banReason, setBanReason] = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [suggestedOfficerEmail, setSuggestedOfficerEmail] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Appointment action states
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [apptActionNotes, setApptActionNotes] = useState('');
  const [apptRescheduleDate, setApptRescheduleDate] = useState('');
  // no updatingAppt state

  // Broadcast creation
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  const {
    register: registerBroadcast,
    handleSubmit: handleSubmitBroadcast,
    reset: resetBroadcast,
    formState: { errors: broadcastErrors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastFormSchema),
  });

  const fetchData = async () => {
    try {
      const [statsRes, farmersRes] = await Promise.all([
        api.get('/officers/dashboard'),
        api.get(`/officers/farmers?search=${farmerSearch}`),
      ]);
      setStats(statsRes.data.data);
      setFarmers(farmersRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load officer dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farmerSearch]);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await api.get('/ai/cases');
      setCases(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCases(false);
    }
  };

  const handleProvideFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewCaseId || !officerFeedback.trim()) return;

    setSubmittingFeedback(true);
    try {
      await api.patch(`/ai/cases/${reviewCaseId}/feedback`, { officerFeedback });
      setReviewCaseId(null);
      setOfficerFeedback('');
      fetchCases();
      alert('Verification feedback submitted successfully! The farmer has been notified.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Load Tab details
  useEffect(() => {
    if (activeTab === 'appointments') {
      api.get('/appointments').then((r) => setAppointments(r.data.data)).catch(console.error);
    } else if (activeTab === 'broadcasts') {
      api.get('/broadcasts').then((r) => setBroadcasts(r.data.data)).catch(console.error);
    } else if (activeTab === 'notifications') {
      api.get('/notifications').then((r) => setNotifications(r.data.data)).catch(console.error);
    } else if (activeTab === 'analytics') {
      api.get('/officers/analytics').then((r) => setAnalytics(r.data.data)).catch(console.error);
    } else if (activeTab === 'cases') {
      fetchCases();
    }
  }, [activeTab]);

  const handleViewFarmerDetail = async (farmerId: string) => {
    try {
      const res = await api.get(`/officers/farmers/${farmerId}`);
      setSelectedFarmerDetail(res.data.data);
      setBanReason('');
      setTransferReason('');
      setSuggestedOfficerEmail('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retrieve farmer details');
    }
  };

  // Submitting Governance Ban/Transfer Requests
  const handleRequestBan = async (e: React.FormEvent, farmerId: string) => {
    e.preventDefault();
    if (!banReason.trim()) return;
    setSubmittingBan(true);
    try {
      await api.post('/requests/ban', { targetUserId: farmerId, reason: banReason });
      alert('Ban request submitted successfully! An Administrator will review the case.');
      setSelectedFarmerDetail(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('jurisdiction') || msg.toLowerCase().includes('region')) {
        alert("⚠️ This farmer is outside your assigned region.");
      } else {
        alert(msg || 'Failed to submit ban request');
      }
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent, farmerId: string) => {
    e.preventDefault();
    if (!transferReason.trim()) return;
    setSubmittingTransfer(true);
    try {
      // Find suggested officer ID if email is specified
      let suggestedOfficerId: string | undefined = undefined;
      if (suggestedOfficerEmail.trim()) {
        const usersRes = await api.get('/admin/users'); // Admins/Officers list
        const matching = usersRes.data.data.find(
          (u: any) => u.email === suggestedOfficerEmail.trim() && u.role === 'OFFICER'
        );
        if (matching) {
          suggestedOfficerId = matching.id;
        } else {
          alert('Suggested officer email not found or user is not an officer. Proceeding with transfer request without officer suggestion.');
        }
      }

      await api.post('/requests/transfer', {
        farmerId,
        reason: transferReason,
        suggestedOfficerId,
      });
      alert('Transfer request submitted successfully! Admin will assign another officer.');
      setSelectedFarmerDetail(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit transfer request');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Appointment actions
  const handleUpdateAppointment = async (apptId: string, status: string) => {
    try {
      const payload: any = { status };
      if (status === 'COMPLETED' || status === 'REJECTED') {
        payload.consultationNotes = apptActionNotes;
      } else if (status === 'RESCHEDULED') {
        if (!apptRescheduleDate) {
          alert('Select a reschedule date!');
          return;
        }
        payload.rescheduleDate = apptRescheduleDate;
        payload.consultationNotes = apptActionNotes;
      }

      await api.patch(`/appointments/${apptId}`, payload);
      alert(`Appointment status updated to ${status}`);
      setEditingApptId(null);
      setApptActionNotes('');
      setApptRescheduleDate('');
      // Refresh list
      const r = await api.get('/appointments');
      setAppointments(r.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update appointment');
    }
  };

  // Creating Regional Broadcast Alerts
  const handlePublishBroadcast = async (values: BroadcastFormValues) => {
    setSubmittingBroadcast(true);
    try {
      await api.post('/broadcasts', {
        ...values,
        targetScope: 'REGIONAL',
        status: 'PUBLISHED',
      });
      alert('Regional advisory alert published and farmers notified!');
      resetBroadcast();
      // Refresh list
      const r = await api.get('/broadcasts');
      setBroadcasts(r.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish broadcast');
    } finally {
      setSubmittingBroadcast(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Syncing Officer Panel...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl text-center">
        <h3 className="text-lg font-bold">Error</h3>
        <p className="mt-2 text-sm">{error || 'Could not verify officer jurisdiction.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-stone-50 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-amber-200 text-xs font-bold uppercase tracking-widest">Officer Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Agriculture Officer Panel
          </h1>
          <p className="text-amber-100/90 text-sm mt-1">
            Assigned region jurisdiction monitoring and direct consultation bookings.
          </p>
        </div>
        <div className="bg-amber-500/50 backdrop-blur-sm border border-amber-400/30 px-4 py-2 rounded-2xl flex items-center space-x-2 text-sm">
          <Briefcase className="w-4 h-4 text-emerald-300" />
          <span className="font-semibold text-amber-100">Jurisdiction Control</span>
        </div>
      </div>

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-700 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">Mapped Farmers</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">{stats.totalFarmers}</span>
              </div>
            </div>

            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-700 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">Active Farmers</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">{stats.activeFarmers}</span>
              </div>
            </div>

            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-700 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">New Farmers</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">+{stats.newFarmers}</span>
              </div>
            </div>

            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-red-50 p-3 rounded-2xl text-red-750 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">Pending Cases</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">{stats.diseaseReportsPending}</span>
              </div>
            </div>

            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-purple-50 p-3 rounded-2xl text-purple-700 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">Appointments</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">{stats.pendingAppointments}</span>
              </div>
            </div>

            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
              <div className="bg-orange-50 p-3 rounded-2xl text-orange-700 shrink-0">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase">Regional Alerts</span>
                <span className="text-xl font-extrabold text-stone-850 mt-0.5">{stats.regionalBroadcasts?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Graphical Growth Timeline and Analytics Call-To-Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* SVG growth chart */}
            <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
              <div>
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Farmer Growth Timeline</h3>
                <span className="text-[10px] text-stone-400 font-semibold">New farmer onboardings mapped over the last 6 months</span>
              </div>
              
              <div className="w-full flex justify-center">
                {(() => {
                  const chartHeight = 150;
                  const chartWidth = 500;
                  const growthData = stats.growthData || [];
                  const maxGrowthVal = Math.max(...growthData.map((t: any) => t.count), 5);
                  const points = growthData.map((t: any, i: number) => {
                    const x = (i / Math.max(growthData.length - 1, 1)) * (chartWidth - 40) + 20;
                    const y = chartHeight - (t.count / maxGrowthVal) * (chartHeight - 40) - 20;
                    return { x, y, count: t.count, month: t.month };
                  });
                  const linePath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-lg h-auto overflow-visible">
                      <line x1="20" y1="130" x2="480" y2="130" stroke="#e5e5e0" strokeWidth="1" />
                      <line x1="20" y1="75" x2="480" y2="75" stroke="#e5e5e0" strokeDasharray="4" />
                      <line x1="20" y1="20" x2="480" y2="20" stroke="#e5e5e0" strokeDasharray="4" />

                      {points.length > 1 && (
                        <path d={linePath} fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      )}

                      {points.map((p: any, idx: number) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#b45309" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#2d2d2d">{p.count}</text>
                          <text x={p.x} y="145" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#787870">{p.month}</text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Quick action / Analytics panel */}
            <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center">
                  <BarChart3 className="w-4 h-4 mr-1.5 text-amber-700 animate-pulse" />
                  Analytics Hub
                </h3>
                <p className="text-xs text-stone-500 font-semibold leading-relaxed">
                  Monitor detailed regional metrics, farmer growth densities across blocks, and consultation appointment statistics.
                </p>
              </div>
              <button
                onClick={() => navigate('/officer/analytics')}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-stone-50 text-xs font-extrabold rounded-xl shadow-sm transition-colors text-center cursor-pointer"
              >
                View Full Analytics Control
              </button>
            </div>
          </div>

          {/* Jurisdiction list */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900 flex items-center border-b border-stone-200 pb-2">
              <MapPin className="w-5 h-5 mr-2 text-amber-700" />
              Jurisdiction Geographical Scope
            </h3>
            <div className="flex flex-wrap gap-3">
              {stats.regions.map((region: Region) => (
                <span
                  key={region.id}
                  className="inline-flex items-center px-4 py-2 rounded-2xl bg-amber-50 text-amber-800 text-sm font-semibold border border-amber-200 shadow-sm animate-fade-in"
                >
                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-600" />
                  {region.village} (Block: {region.block}, {region.district})
                </span>
              ))}
              {stats.regions.length === 0 && (
                <p className="text-stone-400 text-sm font-semibold">No assigned jurisdiction villages. Contact Administrator.</p>
              )}
            </div>
          </div>

          {/* Direct actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Operational Tasks</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/officer?tab=farmers')} className="p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 text-center font-bold text-stone-700 text-xs cursor-pointer">
                  Review Farmers Directory
                </button>
                <button onClick={() => navigate('/officer?tab=appointments')} className="p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 text-center font-bold text-stone-700 text-xs cursor-pointer">
                  Consultation Requests ({stats.pendingAppointments})
                </button>
                <button onClick={() => navigate('/officer?tab=broadcasts')} className="p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 text-center font-bold text-stone-700 text-xs cursor-pointer">
                  Regional Pest Alerts
                </button>
                <button onClick={() => navigate('/officer?tab=cases')} className="p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 text-center font-bold text-stone-700 text-xs cursor-pointer">
                  Disease Escalations ({stats.diseaseReportsPending})
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. FARMERS DIRECTORY TAB */}
      {activeTab === 'farmers' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-stone-900">Farmers in Assigned Regions</h2>
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                placeholder="Search farmer name..."
                className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none bg-stone-50"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farmers.map((farmer) => (
              <div key={farmer.id} className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl space-y-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-extrabold text-stone-900">{farmer.user.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      farmer.user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {farmer.user.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-stone-500 font-semibold">
                    <div className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1" /> {farmer.user.email}</div>
                    {farmer.user.phoneNumber && (
                      <div className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {farmer.user.phoneNumber}</div>
                    )}
                    <div className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {farmer.region.village} ({farmer.region.block})</div>
                  </div>

                  <div className="bg-[#faf9f5] border border-stone-150 p-3 rounded-xl grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-stone-400 font-bold uppercase">Crop</span>
                      <span className="font-extrabold text-stone-700">{farmer.primaryCrop}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-bold uppercase">Land</span>
                      <span className="font-extrabold text-stone-700">{farmer.landSize} Acres</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleViewFarmerDetail(farmer.id)}
                    className="w-full inline-flex justify-center py-2 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-700 transition-colors cursor-pointer"
                  >
                    Manage Profile & Actions
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Farmer Detail modal overlay */}
          {selectedFarmerDetail && (
            <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-[#ffffff] border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative animate-fade-in shadow-2xl">
                <button
                  onClick={() => setSelectedFarmerDetail(null)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <div>
                  <h3 className="text-xl font-extrabold text-stone-900">{selectedFarmerDetail.farmer.user.name}</h3>
                  <span className="text-xs text-stone-500 font-semibold uppercase">{selectedFarmerDetail.farmer.region.village} village • Mapped Profile</span>
                </div>

                {/* Profile specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-b border-stone-100 py-4 text-xs">
                  <div>
                    <span className="block text-stone-400 font-semibold uppercase">Soil Category</span>
                    <span className="font-extrabold text-stone-850">{selectedFarmerDetail.farmer.soilType}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400 font-semibold uppercase">Irrigation System</span>
                    <span className="font-extrabold text-stone-850">{selectedFarmerDetail.farmer.irrigationType}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400 font-semibold uppercase">Crop Growth Stage</span>
                    <span className="font-extrabold text-stone-850">{selectedFarmerDetail.farmer.cropGrowthStage}</span>
                  </div>
                </div>

                {/* Governance actions form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Ban Request form */}
                  <form onSubmit={(e) => handleRequestBan(e, selectedFarmerDetail.farmer.id)} className="space-y-3 p-4 bg-red-50/50 border border-red-200 rounded-2xl">
                    <h4 className="text-xs font-bold text-red-950 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1 text-red-700" /> Request Farmer Account Ban
                    </h4>
                    <textarea
                      rows={2}
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Explain suspicious behavior or registration validation failure..."
                      className="w-full p-2 border border-red-200 bg-[#ffffff] rounded-xl text-xs"
                    />
                    <button
                      type="submit"
                      disabled={submittingBan || !banReason.trim()}
                      className="w-full bg-red-700 text-stone-50 py-1.5 rounded-xl text-xs font-bold hover:bg-red-800 disabled:opacity-50"
                    >
                      Submit Ban Case to Admin
                    </button>
                  </form>

                  {/* Transfer request form */}
                  <form onSubmit={(e) => handleRequestTransfer(e, selectedFarmerDetail.farmer.id)} className="space-y-3 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                    <h4 className="text-xs font-bold text-amber-950 flex items-center">
                      <Briefcase className="w-4 h-4 mr-1 text-amber-700" /> Request Farmer Transfer
                    </h4>
                    <input
                      type="email"
                      value={suggestedOfficerEmail}
                      onChange={(e) => setSuggestedOfficerEmail(e.target.value)}
                      placeholder="Suggested new officer email (optional)..."
                      className="w-full p-2 border border-amber-200 bg-[#ffffff] rounded-xl text-xs"
                    />
                    <textarea
                      rows={2}
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="Reason for transfer (e.g. block boundary updates, language requirement)..."
                      className="w-full p-2 border border-amber-200 bg-[#ffffff] rounded-xl text-xs"
                    />
                    <button
                      type="submit"
                      disabled={submittingTransfer || !transferReason.trim()}
                      className="w-full bg-amber-700 text-stone-50 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-800 disabled:opacity-50"
                    >
                      Submit Transfer Request
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. APPOINTMENT COORDINATOR TAB */}
      {activeTab === 'appointments' && (
        <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">Consultation Consultation Schedulers</h2>

          <div className="space-y-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="p-4 border border-stone-150 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-stone-850 block">{new Date(appt.date).toLocaleString()}</span>
                    <span className="text-[10px] text-stone-400 font-semibold uppercase mt-0.5 block">Requested by Farmer: {appt.farmer.name}</span>
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
                    {appt.status === 'PENDING' && (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleUpdateAppointment(appt.id, 'ACCEPTED')} className="bg-emerald-600 text-stone-50 px-2 py-1 rounded text-xs font-bold hover:bg-emerald-700">Accept</button>
                        <button onClick={() => setEditingApptId(appt.id)} className="bg-red-600 text-stone-50 px-2 py-1 rounded text-xs font-bold hover:bg-red-700">Reject</button>
                      </div>
                    )}
                    {appt.status === 'ACCEPTED' && (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setEditingApptId(appt.id)} className="bg-blue-600 text-stone-50 px-2 py-1 rounded text-xs font-bold hover:bg-blue-700">Complete / Reschedule</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-stone-600">
                  <span className="font-bold text-stone-850 block">Query description:</span>
                  <p className="mt-0.5">{appt.reason}</p>
                </div>

                {appt.consultationNotes && (
                  <div className="text-xs text-stone-600 p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <span className="font-bold text-stone-850 block">Prescription / consultation Notes:</span>
                    <p className="mt-0.5 italic">"{appt.consultationNotes}"</p>
                  </div>
                )}

                {editingApptId === appt.id && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 mt-3">
                    <h4 className="text-xs font-bold text-stone-800">Review Action Form</h4>
                    
                    <div>
                      <label className="block text-[10px] text-stone-400 font-bold uppercase">Consultation Prescription Notes</label>
                      <textarea
                        rows={2}
                        value={apptActionNotes}
                        onChange={(e) => setApptActionNotes(e.target.value)}
                        placeholder="Write advisories, medication dosages, or rejection reasons here..."
                        className="w-full p-2 border border-stone-300 rounded-xl text-xs bg-[#ffffff]"
                      />
                    </div>

                    {appt.status === 'ACCEPTED' && (
                      <div>
                        <label className="block text-[10px] text-stone-400 font-bold uppercase">Reschedule Date (If choosing Reschedule action)</label>
                        <input
                          type="datetime-local"
                          value={apptRescheduleDate}
                          onChange={(e) => setApptRescheduleDate(e.target.value)}
                          className="mt-1 p-2 border border-stone-300 rounded-xl text-xs bg-[#ffffff]"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {appt.status === 'PENDING' ? (
                        <button
                          onClick={() => handleUpdateAppointment(appt.id, 'REJECTED')}
                          className="bg-red-700 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-800"
                        >
                          Confirm Rejection
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateAppointment(appt.id, 'COMPLETED')}
                            className="bg-blue-700 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-800"
                          >
                            Mark Consultation Completed
                          </button>
                          <button
                            onClick={() => handleUpdateAppointment(appt.id, 'RESCHEDULED')}
                            className="bg-amber-700 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-800"
                          >
                            Reschedule Appointment Slot
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditingApptId(null)} className="text-xs text-stone-500 font-bold hover:underline ml-2">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {appointments.length === 0 && (
              <p className="text-stone-500 font-semibold text-center py-12">No consultation appointments assigned to you.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. REGIONAL BROADCASTS TAB */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Broadcast form */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Publish Regional advisory alert</h3>
            
            <form onSubmit={handleSubmitBroadcast(handlePublishBroadcast)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Broadcast Title</label>
                <input
                  type="text"
                  placeholder="e.g. Yellow Rust Warning in Ajnala"
                  {...registerBroadcast('title')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
                {broadcastErrors.title && <p className="text-xs text-red-600 font-semibold mt-1">{broadcastErrors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Message Advisory</label>
                <textarea
                  rows={4}
                  placeholder="Write clear descriptions, dosage recommendations, and preventative block updates..."
                  {...registerBroadcast('message')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
                {broadcastErrors.message && <p className="text-xs text-red-600 font-semibold mt-1">{broadcastErrors.message.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Target Region Block Scope</label>
                <select
                  {...registerBroadcast('targetRegionId')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                >
                  <option value="">Select Target Region</option>
                  {stats.regions.map((reg: Region) => (
                    <option key={reg.id} value={reg.id}>{reg.village} ({reg.block})</option>
                  ))}
                </select>
                {broadcastErrors.targetRegionId && <p className="text-xs text-red-600 font-semibold mt-1">{broadcastErrors.targetRegionId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Priority Level</label>
                <select
                  {...registerBroadcast('priority')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                >
                  <option value="LOW">Low Advisory</option>
                  <option value="MEDIUM">Medium Warning</option>
                  <option value="HIGH">High Critical Emergency</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingBroadcast}
                className="w-full flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-50 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                {submittingBroadcast ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1.5" />}
                Publish Broadcast Alert
              </button>
            </form>
          </div>

          {/* Broadcasts history list */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Broadcast Alert History</h3>

            <div className="space-y-4">
              {broadcasts.map((br) => (
                <div key={br.id} className="p-4 border border-stone-150 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{br.title}</h4>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase mt-0.5 block">Target Scope: {br.targetScope} {br.targetRegion ? `(${br.targetRegion.village})` : ''}</span>
                    </div>

                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      br.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {br.priority} Alert
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{br.message}</p>
                  <span className="block text-[9px] text-stone-450 font-bold uppercase pt-1">Published on {new Date(br.createdAt).toLocaleString()} by {br.author.name}</span>
                </div>
              ))}
              {broadcasts.length === 0 && (
                <p className="text-stone-500 font-semibold text-center py-12">No regional broadcasts alerts published yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. OFFICER DETAILED ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-8">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">Advisory Region Performance Analytics</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
              <span className="block text-xs font-bold text-stone-400 uppercase">Farmers Covered</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{analytics.totalFarmers}</span>
            </div>
            <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
              <span className="block text-xs font-bold text-stone-400 uppercase">Active Status Mapped</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{analytics.activeFarmers}</span>
            </div>
            <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
              <span className="block text-xs font-bold text-stone-400 uppercase">Consultations Held</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{analytics.completedAppointments}</span>
            </div>
            <div className="bg-[#faf9f5] border border-stone-200 p-4 rounded-2xl">
              <span className="block text-xs font-bold text-stone-400 uppercase">Community Interaction</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{analytics.communityPostsCount} Posts</span>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-150 p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-extrabold text-stone-700 uppercase tracking-widest">Active Consultation Completion Ratio</h4>
            {analytics.totalAppointments > 0 ? (
              <div className="space-y-2">
                <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(analytics.completedAppointments / analytics.totalAppointments) * 100}%` }}
                    className="h-full bg-emerald-600"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-stone-600">
                  <span>Completed: {analytics.completedAppointments}</span>
                  <span>Total Scheduled: {analytics.totalAppointments} ({Math.round((analytics.completedAppointments / analytics.totalAppointments) * 100)}%)</span>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-xs font-semibold py-4 text-center">No consultation appointments data available to plot performance bars.</p>
            )}
          </div>
        </div>
      )}

      {/* 6. NOTIFICATIONS HUB TAB */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl mx-auto bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-amber-700" /> Officer Notifications Center
          </h2>
          <div className="space-y-3">
            {notifications.map((notify) => (
              <div
                key={notify.id}
                className={`p-4 border rounded-2xl transition-colors flex justify-between items-center ${
                  notify.read ? 'border-stone-100 bg-[#faf9f5]/55 opacity-70' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold ${notify.read ? 'text-stone-700' : 'text-stone-900'}`}>{notify.title}</h4>
                  <p className="text-xs text-stone-500">{notify.message}</p>
                  <span className="block text-[10px] text-stone-400 font-semibold uppercase">{new Date(notify.createdAt).toLocaleString()}</span>
                </div>
                {!notify.read && (
                  <button
                    onClick={() => handleMarkNotificationRead(notify.id)}
                    className="text-xs font-bold text-amber-700 hover:underline shrink-0"
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

      {/* 7. ESCALATED CASES TAB */}
      {activeTab === 'cases' && (
        <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-700" />
              Farmer Crop Case Escalations
            </h2>
            <button
              onClick={fetchCases}
              disabled={loadingCases}
              className="text-xs text-amber-700 hover:text-amber-900 font-extrabold cursor-pointer inline-flex items-center space-x-1"
            >
              {loadingCases ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Refresh List</span>}
            </button>
          </div>

          {loadingCases ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span className="text-stone-400 text-xs font-semibold">Syncing case data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm bg-stone-50/30">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-150 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Farmer details</span>
                      <p className="text-sm font-extrabold text-stone-850 mt-1">{c.farmer.name} ({c.farmer.phoneNumber || c.farmer.email})</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                        c.status === 'RESOLVED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold text-stone-400 uppercase">Crop Sown</span>
                      <p className="text-xs font-bold text-stone-750">{c.cropType}</p>

                      <span className="block text-[10px] font-bold text-stone-400 uppercase pt-2">AI Diagnosis Overview</span>
                      <p className="text-xs text-stone-750 leading-relaxed font-medium whitespace-pre-wrap">{c.aiDiagnosis}</p>

                      <span className="block text-[10px] font-bold text-stone-400 uppercase pt-2">Farmer Feedback Notes</span>
                      <p className="text-xs text-stone-600 italic font-semibold">{c.farmerNotes || 'No notes attached.'}</p>
                    </div>

                    {c.imageAnalysisUrl && (
                      <div className="rounded-xl overflow-hidden max-h-[160px] border border-stone-200 shadow-sm shrink-0">
                        <img src={c.imageAnalysisUrl} alt="crop diagnostic leaf" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {c.status === 'PENDING' ? (
                    reviewCaseId === c.id ? (
                      <form onSubmit={handleProvideFeedback} className="space-y-3 pt-3 border-t border-stone-200">
                        <label className="block text-xs font-bold text-stone-600">Verification & Treatment Feedback</label>
                        <textarea
                          rows={3}
                          value={officerFeedback}
                          onChange={(e) => setOfficerFeedback(e.target.value)}
                          placeholder="Provide the diagnostic verification details and treatment recommendations..."
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setReviewCaseId(null)}
                            className="px-4 py-1.5 border border-stone-300 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingFeedback}
                            className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-stone-50 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1"
                          >
                            {submittingFeedback && <Loader2 className="w-3 animate-spin mr-1" />}
                            <span>Submit Resolution</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="pt-3 border-t border-stone-200 flex justify-end">
                        <button
                          onClick={() => {
                            setReviewCaseId(c.id);
                            setOfficerFeedback('');
                          }}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-stone-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Resolve & Submit Feedback
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="pt-3 border-t border-stone-200 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100/50 space-y-1">
                      <span className="block text-[10px] font-bold text-emerald-800 uppercase">Officer Verification Feedback</span>
                      <p className="text-xs text-emerald-700 leading-relaxed font-semibold">{c.officerFeedback}</p>
                    </div>
                  )}
                </div>
              ))}

              {cases.length === 0 && (
                <p className="text-stone-500 font-semibold text-center py-12">No crop disease cases escalated to you.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;
