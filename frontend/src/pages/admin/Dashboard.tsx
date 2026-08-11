import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { User, Region } from '../../types';
import {
  Users,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  Mail,
  Loader2,
  UserPlus,
  Globe,
  Trash2,
  XCircle
} from 'lucide-react';

const officerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phoneNumber: z.string().min(10, 'Invalid phone number').optional().or(z.literal('')),
  regionIds: z.array(z.string()).min(1, 'Select at least one assigned region'),
  designation: z.string().optional().or(z.literal('')),
  qualification: z.string().optional().or(z.literal('')),
  callingTime: z.string().optional().or(z.literal('')),
});

type OfficerFormValues = z.infer<typeof officerFormSchema>;

// Scheme builder schema
const schemeFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  eligibility: z.string().min(5, 'Eligibility criteria required'),
  benefits: z.string().min(5, 'Benefits details required'),
  requiredDocuments: z.string(),
  officialUrl: z.string().url('Invalid URL format'),
  source: z.string().min(2, 'Authoritative source required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

type SchemeFormValues = z.infer<typeof schemeFormSchema>;

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'dashboard';

  // State Variables
  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [officersList, setOfficersList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Officers list and registration states
  const [submittingOfficer, setSubmittingOfficer] = useState(false);
  const [officerSuccess, setOfficerSuccess] = useState<string | null>(null);
  const [officerError, setOfficerError] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);

  // Regions CRUD states
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [regState, setRegState] = useState('Punjab');
  const [regDistrict, setRegDistrict] = useState('');
  const [regBlock, setRegBlock] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [submittingRegion, setSubmittingRegion] = useState(false);

  // Tab: Schemes
  const [schemes, setSchemes] = useState<any[]>([]);
  const [submittingScheme, setSubmittingScheme] = useState(false);
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);

  // Tab: Broadcasts
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('MEDIUM');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Tab: Governance requests
  const [banRequests, setBanRequests] = useState<any[]>([]);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [transferOfficerEmail, setTransferOfficerEmail] = useState('');
  const [reviewingType, setReviewingType] = useState<'ban' | 'transfer' | null>(null);
  const [reviewingRequestDetail, setReviewingRequestDetail] = useState<any | null>(null);

  // Tab: Community moderation
  const [posts, setPosts] = useState<any[]>([]);

  // Setup Officer Form
  const {
    register: registerOfficer,
    handleSubmit: handleSubmitOfficer,
    reset: resetOfficer,
    formState: { errors: officerErrors },
  } = useForm<OfficerFormValues>({
    resolver: zodResolver(officerFormSchema),
    defaultValues: { regionIds: [] },
  });

  // Setup Scheme Form
  const {
    register: registerScheme,
    handleSubmit: handleSubmitScheme,
    reset: resetScheme,
    setValue: setSchemeValue,
  } = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeFormSchema),
  });

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, regionsRes, officersRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/regions'),
        api.get('/admin/officers'),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setRegions(regionsRes.data.data);
      setOfficersList(officersRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Load Tab details
  useEffect(() => {
    if (activeTab === 'schemes') {
      api.get('/schemes').then((r) => setSchemes(r.data.data)).catch(console.error);
    } else if (activeTab === 'broadcasts') {
      api.get('/broadcasts').then((r) => setBroadcasts(r.data.data)).catch(console.error);
    } else if (activeTab === 'requests') {
      api.get('/requests/ban').then((r) => setBanRequests(r.data.data)).catch(console.error);
      api.get('/requests/transfer').then((r) => setTransferRequests(r.data.data)).catch(console.error);
    } else if (activeTab === 'community') {
      api.get('/community?limit=30').then((r) => setPosts(r.data.data.posts)).catch(console.error);
    }
  }, [activeTab]);

  const handleToggleStatus = async (userToToggle: User) => {
    setBanningUser(userToToggle.id);
    const newStatus = userToToggle.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${userToToggle.id}/status`, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userToToggle.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setBanningUser(null);
    }
  };

  const startEditOfficer = (off: any) => {
    setEditingOfficerId(off.id);
    resetOfficer({
      name: off.name,
      email: off.email,
      password: '',
      phoneNumber: off.phoneNumber || '',
      regionIds: off.regions?.map((r: any) => r.id) || [],
      designation: off.designation || '',
      qualification: off.qualification || '',
      callingTime: off.callingTime || '9:00 AM - 5:00 PM',
    });
  };

  const handleCreateOfficer = async (data: OfficerFormValues) => {
    setSubmittingOfficer(true);
    setOfficerError(null);
    setOfficerSuccess(null);
    try {
      const payload = {
        ...data,
        phoneNumber: data.phoneNumber === '' ? undefined : data.phoneNumber,
      };
      if (editingOfficerId) {
        await api.put(`/admin/officers/${editingOfficerId}`, payload);
        setOfficerSuccess(`Officer ${data.name} updated successfully!`);
        setEditingOfficerId(null);
      } else {
        await api.post('/admin/officers', payload);
        setOfficerSuccess(`Officer ${data.name} registered and region coverage assigned!`);
      }
      resetOfficer({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        regionIds: [],
        designation: '',
        qualification: '',
        callingTime: '9:00 AM - 5:00 PM',
      });
      fetchData();
    } catch (err: any) {
      setOfficerError(err.response?.data?.message || 'Failed to register/update agriculture officer.');
    } finally {
      setSubmittingOfficer(false);
    }
  };

  const handleSaveRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regState || !regDistrict || !regBlock || !regVillage) {
      alert('All region parameters are required');
      return;
    }
    setSubmittingRegion(true);
    try {
      const payload = { state: regState, district: regDistrict, block: regBlock, village: regVillage };
      if (editingRegionId) {
        await api.put(`/admin/regions/${editingRegionId}`, payload);
        alert('Region details updated successfully!');
      } else {
        await api.post('/admin/regions', payload);
        alert('New region added successfully!');
      }
      setEditingRegionId(null);
      setRegDistrict('');
      setRegBlock('');
      setRegVillage('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save region');
    } finally {
      setSubmittingRegion(false);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this region?')) return;
    try {
      await api.delete(`/admin/regions/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete region');
    }
  };

  // Scheme actions
  const handleSaveScheme = async (data: SchemeFormValues) => {
    setSubmittingScheme(true);
    try {
      const documentsArray = typeof data.requiredDocuments === 'string'
        ? (data.requiredDocuments as string).split(',').map((s) => s.trim()).filter(Boolean)
        : data.requiredDocuments;

      const payload = {
        ...data,
        requiredDocuments: documentsArray,
      };

      if (editingSchemeId) {
        await api.patch(`/schemes/${editingSchemeId}`, payload);
        alert('Government scheme updated successfully!');
      } else {
        await api.post('/schemes', payload);
        alert('Government scheme created successfully!');
      }
      resetScheme();
      setEditingSchemeId(null);
      // Reload schemes
      const r = await api.get('/schemes');
      setSchemes(r.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save scheme');
    } finally {
      setSubmittingScheme(false);
    }
  };

  const handleEditScheme = (sch: any) => {
    setEditingSchemeId(sch.id);
    setSchemeValue('title', sch.title);
    setSchemeValue('description', sch.description);
    setSchemeValue('eligibility', sch.eligibility);
    setSchemeValue('benefits', sch.benefits);
    setSchemeValue('requiredDocuments', sch.requiredDocuments.join(', '));
    setSchemeValue('officialUrl', sch.officialUrl);
    setSchemeValue('source', sch.source);
    setSchemeValue('status', sch.status);
  };

  const handleDeleteScheme = async (schId: string) => {
    if (!confirm('Are you sure you want to delete this government scheme?')) return;
    try {
      await api.delete(`/schemes/${schId}`);
      alert('Scheme deleted.');
      const r = await api.get('/schemes');
      setSchemes(r.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Publish Nationwide Broadcast
  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSubmittingBroadcast(true);
    try {
      await api.post('/broadcasts', {
        title: broadcastTitle,
        message: broadcastMessage,
        priority: broadcastPriority,
        targetScope: 'NATIONWIDE',
        status: 'PUBLISHED',
      });
      alert('Nationwide broadcast advisory alert published successfully!');
      setBroadcastTitle('');
      setBroadcastMessage('');
      // Reload list
      const r = await api.get('/broadcasts');
      setBroadcasts(r.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish broadcast alert');
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (brId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast alert?')) return;
    try {
      await api.delete(`/broadcasts/${brId}`);
      const r = await api.get('/broadcasts');
      setBroadcasts(r.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Governance requests reviews
  const handleReviewRequest = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingRequestId || !reviewingType) return;
    try {
      const payload: any = { status, adminNotes: adminReviewNotes };
      if (reviewingType === 'transfer' && status === 'APPROVED') {
        if (!transferOfficerEmail.trim()) {
          alert('Specify the new officer email to complete the transfer approval!');
          return;
        }
        // Find officer ID by email
        const matching = users.find(
          (u) => u.email === transferOfficerEmail.trim() && u.role === 'OFFICER'
        );
        if (!matching) {
          alert('Officer email not found in directory!');
          return;
        }
        payload.assignedOfficerId = matching.id;
      }

      await api.patch(`/requests/${reviewingType}/${reviewingRequestId}`, payload);
      alert(`Request marked as ${status}`);
      setReviewingRequestId(null);
      setReviewingType(null);
      setReviewingRequestDetail(null);
      setAdminReviewNotes('');
      setTransferOfficerEmail('');
      // Reload lists
      const [banR, transR] = await Promise.all([
        api.get('/requests/ban'),
        api.get('/requests/transfer'),
      ]);
      setBanRequests(banR.data.data);
      setTransferRequests(transR.data.data);
      fetchData(); // Update dashboard counts
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete request review');
    }
  };

  // Moderation
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Moderate and delete this community post?')) return;
    try {
      await api.delete(`/community/${postId}`);
      alert('Post moderated and deleted.');
      const r = await api.get('/community?limit=30');
      setPosts(r.data.data.posts);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Syncing Admin Dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl text-center">
        <h3 className="text-lg font-bold">Error</h3>
        <p className="mt-2 text-sm">{error || 'Could not load stats.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-700 to-red-800 text-stone-50 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-red-200 text-xs font-bold uppercase tracking-widest">Admin Control Center</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            System Platform Administration
          </h1>
          <p className="text-red-100/90 text-sm mt-1">
            Governance dashboard managing user accounts, officer registration, and scheme builders.
          </p>
        </div>
        <div className="bg-red-600/50 backdrop-blur-sm border border-red-500/30 px-4 py-2 rounded-2xl flex items-center space-x-2 text-sm">
          <Shield className="w-4 h-4 text-amber-300" />
          <span className="font-semibold text-red-100">Superuser Console</span>
        </div>
      </div>

      {/* 1. OVERVIEW DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-center">
              <span className="block text-xs font-bold text-stone-400 uppercase">Total Farmers</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{stats.totalFarmers}</span>
            </div>
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-center">
              <span className="block text-xs font-bold text-stone-400 uppercase">Registered Officers</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{stats.totalOfficers}</span>
            </div>
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-center">
              <span className="block text-xs font-bold text-stone-400 uppercase">Active Users</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{stats.totalUsers}</span>
            </div>
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-center">
              <span className="block text-xs font-bold text-stone-400 uppercase">Mapped Regions</span>
              <span className="text-2xl font-extrabold text-stone-800 mt-1">{stats.totalRegions}</span>
            </div>
            <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-center col-span-2 lg:col-span-1">
              <span className="block text-xs font-bold text-stone-400 uppercase font-bold text-red-750">Pending Cases</span>
              <span className="text-2xl font-extrabold text-red-750 mt-1">
                {stats.pendingBanRequests + stats.pendingTransferRequests}
              </span>
            </div>
          </div>

          {/* Platform Activity Overview charts */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Platform Content Densities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-stone-150 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-stone-500 uppercase">Total Consultation Appointments</span>
                <span className="text-xl font-extrabold text-stone-850 block">{stats.totalAppointments} Consultations</span>
              </div>
              <div className="p-4 border border-stone-150 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-stone-500 uppercase">Total Farmer Community Posts</span>
                <span className="text-xl font-extrabold text-stone-850 block">{stats.totalPosts} Posts published</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-stone-900 flex items-center border-b border-stone-200 pb-2">
            <Users className="w-5 h-5 mr-2 text-red-700" /> User Accounts Directory
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm bg-stone-50">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-[#faf6f0]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">User Profile</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Designated Role</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#ffffff] divide-y divide-stone-200">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-[#faf9f5]/55 transition-all">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-stone-900">{item.name}</div>
                      <div className="text-xs text-stone-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                        <span>{item.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full border ${
                        item.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                        item.role === 'OFFICER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center text-xs font-semibold ${
                        item.status === 'ACTIVE' ? 'text-emerald-750' : 'text-red-750'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        disabled={item.role === 'ADMIN' || banningUser === item.id}
                        className={`inline-flex items-center px-3 py-1.5 border rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${
                          item.status === 'ACTIVE'
                            ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                            : 'border-emerald-200 text-emerald-755 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {banningUser === item.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                        {item.status === 'ACTIVE' ? 'Ban User' : 'Unban User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. OFFICER REGISTRATION TAB */}
      {activeTab === 'officers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">
              <UserPlus className="w-5 h-5 mr-2 text-red-700 inline" /> Register Agriculture Officer
            </h3>

            {officerSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-start space-x-2 text-xs font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{officerSuccess}</span>
              </div>
            )}

            {officerError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl flex items-start space-x-2 text-xs font-bold">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{officerError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOfficer(handleCreateOfficer)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Officer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Harpreet Singh"
                  {...registerOfficer('name')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
                {officerErrors.name && <p className="text-xs text-red-600 font-semibold mt-1">{officerErrors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. harpreet@arva.gov.in"
                  {...registerOfficer('email')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
                {officerErrors.email && <p className="text-xs text-red-600 font-semibold mt-1">{officerErrors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Account Password {editingOfficerId && '(Optional)'}</label>
                <input
                  type="password"
                  placeholder={editingOfficerId ? 'Leave blank to keep current' : 'Account password'}
                  {...registerOfficer('password')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
                {officerErrors.password && <p className="text-xs text-red-600 font-semibold mt-1">{officerErrors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  {...registerOfficer('phoneNumber')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Block Development Officer"
                  {...registerOfficer('designation')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Qualification</label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc. Agronomy"
                  {...registerOfficer('qualification')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Calling Hours</label>
                <input
                  type="text"
                  placeholder="e.g. 9:00 AM - 5:00 PM"
                  {...registerOfficer('callingTime')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 font-bold text-stone-850">Assign Coverage Regions</label>
                <div className="mt-1.5 border border-stone-200 rounded-xl max-h-[140px] overflow-y-auto p-3 bg-stone-50 space-y-2">
                  {regions.map((reg) => (
                    <label key={reg.id} className="flex items-center space-x-2 text-xs text-stone-700 font-bold">
                      <input
                        type="checkbox"
                        value={reg.id}
                        {...registerOfficer('regionIds')}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{reg.village} ({reg.block}, {reg.district})</span>
                    </label>
                  ))}
                  {regions.length === 0 && <p className="text-stone-400 text-xs font-semibold">No regions seeded.</p>}
                </div>
                {officerErrors.regionIds && <p className="text-xs text-red-600 font-semibold mt-1">{officerErrors.regionIds.message}</p>}
              </div>

              <div className="flex gap-2">
                {editingOfficerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOfficerId(null);
                      resetOfficer({
                        name: '',
                        email: '',
                        password: '',
                        phoneNumber: '',
                        regionIds: [],
                        designation: '',
                        qualification: '',
                        callingTime: '9:00 AM - 5:00 PM',
                      });
                    }}
                    className="flex-1 py-2.5 border border-stone-300 text-stone-700 bg-stone-150 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingOfficer}
                  className="flex-grow flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-50 bg-red-700 hover:bg-red-800 disabled:opacity-50 cursor-pointer"
                >
                  {submittingOfficer ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
                  {editingOfficerId ? 'Save Changes' : 'Register Officer'}
                </button>
              </div>
            </form>
          </div>

          {/* Officers directory */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Registered Agriculture Officers</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {officersList.map((officer) => (
                  <div key={officer.id} className="p-4 border border-stone-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#faf9f5]/55 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-stone-900">{officer.name}</h4>
                      <p className="text-xs text-stone-600 font-semibold">{officer.designation || 'Agriculture Officer'} • {officer.qualification || 'B.Sc. Agriculture'}</p>
                      <p className="text-[10px] text-stone-500 font-bold">{officer.email} • {officer.phoneNumber || 'No phone'} • Calling: {officer.callingTime}</p>
                      
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {officer.regions?.map((reg: any) => (
                          <span key={reg.id} className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] px-2 py-0.5 rounded font-extrabold">
                            {reg.village}
                          </span>
                        ))}
                      </div>
                      <span className="block text-[9px] text-stone-400 font-extrabold pt-1">Farmers in Jurisdiction: {officer.farmerCount}</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => startEditOfficer(officer)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 cursor-pointer"
                      >
                        Edit Details
                      </button>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        officer.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {officer.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. REGIONS TAB */}
      {activeTab === 'regions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Region Form */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
              <Globe className="w-5 h-5 mr-1.5 text-emerald-700" />
              {editingRegionId ? 'Edit Mapped Region' : 'Map New Region'}
            </h3>
            
            <form onSubmit={handleSaveRegion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700">State</label>
                <input
                  type="text"
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                  placeholder="Punjab"
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">District Name</label>
                <input
                  type="text"
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  placeholder="e.g. Amritsar"
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Block Name</label>
                <input
                  type="text"
                  value={regBlock}
                  onChange={(e) => setRegBlock(e.target.value)}
                  placeholder="e.g. Ajnala"
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Village Name</label>
                <input
                  type="text"
                  value={regVillage}
                  onChange={(e) => setRegVillage(e.target.value)}
                  placeholder="e.g. Harar"
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingRegionId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRegionId(null);
                      setRegDistrict('');
                      setRegBlock('');
                      setRegVillage('');
                    }}
                    className="flex-1 py-2 border border-stone-300 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingRegion}
                  className="flex-1 py-2 border border-transparent rounded-xl shadow-sm text-xs font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer animate-pulse"
                >
                  {submittingRegion ? 'Saving...' : editingRegionId ? 'Save Changes' : 'Map Region'}
                </button>
              </div>
            </form>
          </div>

          {/* Regions List */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Mapped Regions List</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {regions.map((reg) => (
                <div key={reg.id} className="p-4 border border-stone-150 bg-[#faf9f5]/55 rounded-2xl flex justify-between items-center shadow-sm">
                  <div className="text-xs space-y-1">
                    <span className="block font-extrabold text-stone-850">{reg.village}</span>
                    <span className="block text-stone-500 font-semibold">Block: {reg.block}</span>
                    <span className="block text-stone-400 font-semibold">{reg.district} district, {reg.state}</span>
                  </div>
                  <div className="flex flex-col space-y-1 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        setEditingRegionId(reg.id);
                        setRegState(reg.state);
                        setRegDistrict(reg.district);
                        setRegBlock(reg.block);
                        setRegVillage(reg.village);
                      }}
                      className="px-2 py-0.5 border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-150 rounded text-[10px] font-bold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRegion(reg.id)}
                      className="px-2 py-0.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded text-[10px] font-bold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {regions.length === 0 && <p className="text-stone-400 text-xs font-semibold col-span-2 text-center py-6">No regions mapped.</p>}
            </div>
          </div>
        </div>
      )}

      {/* 5. SCHEMES BUILDER TAB */}
      {activeTab === 'schemes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Builder Form */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">
              {editingSchemeId ? 'Edit Scheme Parameters' : 'Create Government Scheme'}
            </h3>
            
            <form onSubmit={handleSubmitScheme(handleSaveScheme)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Scheme Title</label>
                <input
                  type="text"
                  placeholder="e.g. PM Kisan Samman Nidhi"
                  {...registerScheme('title')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Description</label>
                <textarea
                  rows={3}
                  {...registerScheme('description')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Eligibility Criteria</label>
                <textarea
                  rows={2}
                  {...registerScheme('eligibility')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Benefits Details</label>
                <textarea
                  rows={2}
                  {...registerScheme('benefits')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Required Documents (comma separated)</label>
                <input
                  type="text"
                  placeholder="Aadhaar Card, Land Record, Bank Book"
                  {...registerScheme('requiredDocuments')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Official URL</label>
                <input
                  type="text"
                  {...registerScheme('officialUrl')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Authoritative Source</label>
                <input
                  type="text"
                  placeholder="Ministry of Agriculture"
                  {...registerScheme('source')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Status</label>
                <select
                  {...registerScheme('status')}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingScheme}
                className="w-full flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-55 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {submittingScheme ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
                {editingSchemeId ? 'Update Scheme' : 'Publish Scheme'}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 font-bold">Catalog Schemes Builder</h3>
            <div className="space-y-4">
              {schemes.map((sch) => (
                <div key={sch.id} className="p-4 border border-stone-150 rounded-2xl flex justify-between items-center bg-[#faf9f5]/55">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">{sch.title}</h4>
                    <span className="text-[10px] text-stone-400 font-bold uppercase">{sch.status} • {sch.source}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-bold">
                    <button onClick={() => handleEditScheme(sch)} className="text-emerald-700 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteScheme(sch.id)} className="text-red-650 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. BROADCAST ALERTS TAB */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Builder Form */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4 self-start">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Publish Nationwide Broadcast Alert</h3>
            
            <form onSubmit={handlePublishBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Broadcast Title</label>
                <input
                  type="text"
                  placeholder="e.g. Critical Pest Alert: Fall Armyworm Warning"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Message Content</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">Priority Level</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 bg-stone-50 rounded-xl text-sm cursor-pointer"
                >
                  <option value="LOW">Low Advisory</option>
                  <option value="MEDIUM">Medium Warning</option>
                  <option value="HIGH">High Emergency</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                className="w-full flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-stone-50 bg-red-705 hover:bg-red-800 disabled:opacity-50 cursor-pointer"
              >
                {submittingBroadcast ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
                Publish Nationwide Advisory
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Global Advisories History</h3>
            <div className="space-y-4">
              {broadcasts.map((br) => (
                <div key={br.id} className="p-4 border border-stone-150 rounded-2xl flex justify-between items-start bg-[#faf9f5]/55">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">{br.title}</h4>
                    <span className="text-[10px] text-stone-400 font-bold uppercase">{br.priority} • {new Date(br.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => handleDeleteBroadcast(br.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. GOVERNANCE CASES TAB */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ban requests */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Farmer Ban Requests</h3>
            <div className="space-y-4">
              {banRequests.map((req) => (
                <div key={req.id} className="p-4 border border-stone-150 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>Requester: {req.requester.name}</span>
                    <span className={`px-2 py-0.5 rounded uppercase ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="text-xs text-stone-700">
                    <span className="font-bold">Target Farmer:</span> {req.targetUser.name} ({req.targetUser.email})
                  </div>

                  <div className="text-xs text-stone-750 p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <span className="font-bold">Reason:</span> {req.reason}
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setReviewingRequestId(req.id);
                          setReviewingType('ban');
                          setReviewingRequestDetail(req);
                        }}
                        className="bg-red-700 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-850"
                      >
                        Action Case
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {banRequests.length === 0 && (
                <p className="text-stone-500 font-semibold text-center py-6 text-xs">No farmer ban requests pending.</p>
              )}
            </div>
          </div>

          {/* Transfer requests */}
          <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Farmer Reassignment Requests</h3>
            <div className="space-y-4">
              {transferRequests.map((req) => (
                <div key={req.id} className="p-4 border border-stone-150 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>Requester: {req.requester.name}</span>
                    <span className={`px-2 py-0.5 rounded uppercase ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="text-xs text-stone-700">
                    <span className="font-bold">Farmer:</span> {req.farmer.name}
                  </div>

                  <div className="text-xs text-stone-750 p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <span className="font-bold">Reason:</span> {req.reason}
                  </div>

                  {req.suggestedOfficer && (
                    <div className="text-xs text-stone-500">
                      <span className="font-bold">Suggested Officer:</span> {req.suggestedOfficer.name} ({req.suggestedOfficer.email})
                    </div>
                  )}

                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setReviewingRequestId(req.id);
                          setReviewingType('transfer');
                          setReviewingRequestDetail(req);
                          if (req.suggestedOfficer) {
                            setTransferOfficerEmail(req.suggestedOfficer.email);
                          }
                        }}
                        className="bg-emerald-600 text-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700"
                      >
                        Action Case
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {transferRequests.length === 0 && (
                <p className="text-stone-500 font-semibold text-center py-6 text-xs">No farmer reassignment requests pending.</p>
              )}
            </div>
          </div>

          {/* Action Overlay */}
          {reviewingRequestId && (
            <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#ffffff] border border-stone-200 rounded-3xl w-full max-w-md p-6 space-y-4 relative animate-fade-in shadow-2xl">
                <button
                  onClick={() => {
                    setReviewingRequestId(null);
                    setReviewingType(null);
                    setReviewingRequestDetail(null);
                  }}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <h3 className="text-base font-bold text-stone-900 uppercase">Review Governance Case</h3>

                {reviewingRequestDetail && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                    <div><span className="font-bold">Requester:</span> {reviewingRequestDetail.requester?.name}</div>
                    <div><span className="font-bold">Target Farmer:</span> {reviewingType === 'ban' ? reviewingRequestDetail.targetUser?.name : reviewingRequestDetail.farmer?.name}</div>
                    <div><span className="font-bold">Reason:</span> {reviewingRequestDetail.reason}</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-600">Review Notes</label>
                  <textarea
                    rows={2}
                    value={adminReviewNotes}
                    onChange={(e) => setAdminReviewNotes(e.target.value)}
                    placeholder="Provide notes/rejection reasons..."
                    className="mt-1 block w-full p-2 border border-stone-300 rounded-xl text-xs"
                  />
                </div>

                {reviewingType === 'transfer' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-600">Assign New Officer Email</label>
                    <input
                      type="email"
                      value={transferOfficerEmail}
                      onChange={(e) => setTransferOfficerEmail(e.target.value)}
                      placeholder="e.g. officer.ludhiana@arva.gov.in"
                      className="mt-1 block w-full p-2 border border-stone-300 rounded-xl text-xs"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleReviewRequest('APPROVED')}
                    className="flex-grow bg-emerald-600 text-stone-50 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    Approve Request
                  </button>
                  <button
                    onClick={() => handleReviewRequest('REJECTED')}
                    className="flex-grow bg-red-650 text-stone-50 py-2 rounded-xl text-xs font-bold hover:bg-red-750"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. COMMUNITY MODERATION TAB */}
      {activeTab === 'community' && (
        <div className="bg-[#ffffff] p-6 border border-stone-200 shadow-sm rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">Community Moderation Dashboard</h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="p-4 border border-stone-150 rounded-2xl flex justify-between items-start bg-[#faf9f5]/55">
                <div className="space-y-2 pr-4">
                  <div className="text-xs font-bold text-stone-800">
                    {post.author.name} ({post.author.role}) • {post.category} • {post.location}
                  </div>
                  <p className="text-xs text-stone-600">{post.content}</p>
                </div>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 p-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Purge Post
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
