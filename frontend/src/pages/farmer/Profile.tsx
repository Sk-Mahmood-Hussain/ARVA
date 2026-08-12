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
  MapPin,
  Sprout,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Shield,
  MessageSquare,
  Calendar,
  AlertOctagon,
  Clock,
  UserX,
  X
} from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  block: z.string().min(1, 'Block is required'),
  village: z.string().min(1, 'Village is required'),
  landSize: z.any().optional(),
  soilType: z.string().optional(),
  irrigationType: z.string().optional(),
  primaryCrop: z.string().optional(),
  cropGrowthStage: z.string().optional(),
  language: z.string().min(1, 'Language preference is required'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface OfficerDetail {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  status: string;
  designation?: string;
  qualification?: string;
  callingTime?: string;
  department?: string;
  experience?: string;
  availability?: string;
}

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customCrop, setCustomCrop] = useState('');

  // Region lists for select chain
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [villages, setVillages] = useState<{ id: string; village: string }[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Officers list in region
  const [regionalOfficers, setRegionalOfficers] = useState<OfficerDetail[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  
  // Selected Officer Modal states
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetail | null>(null);
  const [consultationHistory, setConsultationHistory] = useState<any[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  // Report Modal states
  const [reportingOfficer, setReportingOfficer] = useState<OfficerDetail | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const selectedState = watch('state');
  const selectedDistrict = watch('district');
  const selectedBlock = watch('block');
  const selectedCrop = watch('primaryCrop');

  const fetchProfileAndOfficers = async () => {
    try {
      const res = await api.get('/farmers/profile');
      const profileData = res.data?.data;
      if (profileData) {
        setProfile(profileData);
        const standardCrops = ['Wheat', 'Paddy', 'Maize', 'Cotton', 'Sugarcane'];
        const isStandard = standardCrops.includes(profileData.primaryCrop);
        reset({
          name: user?.name || '',
          phoneNumber: user?.phoneNumber || '',
          address: profileData.address,
          state: profileData.region.state,
          district: profileData.region.district,
          block: profileData.region.block,
          village: profileData.region.village,
          landSize: profileData.landSize,
          soilType: profileData.soilType,
          irrigationType: profileData.irrigationType,
          primaryCrop: isStandard ? profileData.primaryCrop : (profileData.primaryCrop ? 'Other' : ''),
          cropGrowthStage: profileData.cropGrowthStage,
          language: user?.language || 'en',
        });
        if (!isStandard && profileData.primaryCrop) {
          setCustomCrop(profileData.primaryCrop);
        }

        // Map regional officers
        if (profileData.region?.officers) {
          const officers = profileData.region.officers.map((off: any) => ({
            id: off.user.id,
            name: off.user.name,
            email: off.user.email,
            phoneNumber: off.user.phoneNumber,
            profilePictureUrl: off.user.profilePictureUrl,
            status: off.user.status,
            designation: off.designation,
            qualification: off.qualification,
            callingTime: off.callingTime,
            department: off.department,
            experience: off.experience,
            availability: off.availability,
          }));
          setRegionalOfficers(officers);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndOfficers();
    // Load States initially
    api.get('/regions/states').then((r) => setStates(r.data.data)).catch(console.error);
  }, [user]);

  // Handle Select Chain
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
    if (!selectedState || !selectedDistrict) return;
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
  }, [selectedState, selectedDistrict]);

  useEffect(() => {
    if (!selectedState || !selectedDistrict || !selectedBlock) return;
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
  }, [selectedState, selectedDistrict, selectedBlock]);

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
      setErrorMsg(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenOfficerDetails = async (officer: OfficerDetail) => {
    setSelectedOfficer(officer);
    setLoadingConsultations(true);
    try {
      const res = await api.get('/ai/cases');
      const allCases = res.data.data;
      const consultations = allCases.filter((c: any) => c.officerId === officer.id);
      setConsultationHistory(consultations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const handleReportOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingOfficer || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await api.post('/requests/ban', {
        targetUserId: reportingOfficer.id,
        reason: reportReason,
      });
      alert('Your report has been submitted to the Admin for verification review.');
      setReportingOfficer(null);
      setReportReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const payload = {
        ...values,
        landSize: values.landSize ? Number(values.landSize) : 1.0,
        soilType: values.soilType || 'Loamy',
        irrigationType: values.irrigationType || 'Tube Well',
        primaryCrop: (values.primaryCrop === 'Other' && customCrop) ? customCrop : (values.primaryCrop || 'Wheat'),
        cropGrowthStage: values.cropGrowthStage || 'Sowing',
      };
      await api.patch('/farmers/profile', payload);
      await refreshUser();
      setSuccessMsg('Your profile credentials and coordinates have been updated successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchProfileAndOfficers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update farmer profile details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Synchronizing Profile details...</span>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      <div className="bg-[#ffffff] border border-stone-200 shadow-xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-stone-50 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Farmer Profile Settings</h1>
          <p className="text-emerald-100/90 text-sm mt-1">
            Manage your personal data, farm location parameters, photo, and block officers directory.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Static Farm Summary Details */}
          {profile && (
            <div className="bg-[#faf9f5]/55 p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center border-b border-stone-200 pb-2">
                <Sprout className="w-5 h-5 mr-2 text-emerald-700" />
                Registered Farm Details Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-[#ffffff] border border-stone-150 p-4 rounded-2xl shadow-sm">
                  <span className="block text-[10px] font-bold text-stone-400 uppercase">Primary Crop</span>
                  <span className="text-sm font-extrabold text-stone-850">{profile.primaryCrop}</span>
                </div>
                <div className="bg-[#ffffff] border border-stone-150 p-4 rounded-2xl shadow-sm">
                  <span className="block text-[10px] font-bold text-stone-400 uppercase">Growth Stage</span>
                  <span className="text-sm font-extrabold text-stone-850">{profile.cropGrowthStage}</span>
                </div>
                <div className="bg-[#ffffff] border border-stone-150 p-4 rounded-2xl shadow-sm">
                  <span className="block text-[10px] font-bold text-stone-400 uppercase">Land Size</span>
                  <span className="text-sm font-extrabold text-stone-850">{profile.landSize} Acres</span>
                </div>
                <div className="bg-[#ffffff] border border-stone-150 p-4 rounded-2xl shadow-sm">
                  <span className="block text-[10px] font-bold text-stone-400 uppercase">Soil Category</span>
                  <span className="text-sm font-extrabold text-stone-850">{profile.soilType}</span>
                </div>
                <div className="bg-[#ffffff] border border-stone-150 p-4 rounded-2xl shadow-sm">
                  <span className="block text-[10px] font-bold text-stone-400 uppercase">Irrigation System</span>
                  <span className="text-sm font-extrabold text-stone-850">{profile.irrigationType}</span>
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm animate-pulse">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left: Avatar Photo uploader */}
            <div className="w-full lg:w-1/4 flex flex-col items-center space-y-3 bg-[#faf9f5]/55 p-6 border border-stone-150 rounded-3xl">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-100 shadow-md bg-stone-105 group">
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
            <form onSubmit={handleSubmit(onSubmit)} className="w-full lg:w-3/4 space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-emerald-700" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Full Name</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Language Preference</label>
                    <select
                      {...register('language')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
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
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>}
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

              {/* Geographical Parameters */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-emerald-700" />
                  Geographical Parameters & Location
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">State</label>
                    <select
                      {...register('state')}
                      className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select State</option>
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">District</label>
                    <select
                      {...register('district')}
                      disabled={!selectedState}
                      className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Block</label>
                    <select
                      {...register('block')}
                      disabled={!selectedDistrict}
                      className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Block</option>
                      {blocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Village</label>
                    <select
                      {...register('village')}
                      disabled={!selectedBlock}
                      className="mt-1 block w-full px-3 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Village</option>
                      {villages.map((v) => (
                        <option key={v.id} value={v.village}>{v.village}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingRegions && (
                  <div className="flex items-center text-xs text-stone-400 font-semibold space-x-1.5 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading coordinates...</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-600">Residential Address</label>
                  <input
                    type="text"
                    {...register('address')}
                    className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
                </div>
              </div>

              {/* Farm Profile characteristics */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center">
                  <Sprout className="w-5 h-5 mr-2 text-emerald-700" />
                  Agricultural Profile Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Land Size (Acres) <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('landSize', { valueAsNumber: true })}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-[#ffffff] rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {errors.landSize && <p className="text-xs text-red-600 mt-1">{(errors.landSize as any).message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Soil Category <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <select
                      {...register('soilType')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Soil (Optional)</option>
                      <option value="Loamy">Loamy (Mera)</option>
                      <option value="Sandy">Sandy (Retli)</option>
                      <option value="Clayey">Clayey (Cheeka)</option>
                      <option value="Silt">Silt Soil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Irrigation System <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <select
                      {...register('irrigationType')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Irrigation (Optional)</option>
                      <option value="Tube Well">Tube Well Irrigation</option>
                      <option value="Canal System">Canal (Nahar) System</option>
                      <option value="Drip System">Drip Irrigation</option>
                      <option value="Sprinkler">Sprinkler Irrigation</option>
                      <option value="Rainfed">Rainfed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Crop Category <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <select
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Category (Optional)</option>
                      <option value="Cereals">Cereals / Grains</option>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Oilseeds">Oilseeds</option>
                      <option value="Pulses">Pulses / Legumes</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Primary Sown Crop <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <select
                      {...register('primaryCrop')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Crop (Optional)</option>
                      <option value="Wheat">Wheat (Kanak)</option>
                      <option value="Paddy">Rice (Dhan/Paddy)</option>
                      <option value="Maize">Maize (Makki)</option>
                      <option value="Cotton">Cotton (Narma)</option>
                      <option value="Sugarcane">Sugarcane (Ganna)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Growth Stage <span className="text-stone-400 font-semibold">(Optional)</span></label>
                    <select
                      {...register('cropGrowthStage')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Stage (Optional)</option>
                      <option value="Sowing">Sowing</option>
                      <option value="Vegetative">Vegetative Growth</option>
                      <option value="Flowering">Flowering Stage</option>
                      <option value="Maturity">Maturity</option>
                      <option value="Harvesting">Harvesting</option>
                    </select>
                  </div>
                </div>

                {selectedCrop === 'Other' && (
                  <div className="bg-emerald-50/55 p-4 border border-emerald-200 rounded-2xl max-w-md">
                    <label className="block text-xs font-bold text-stone-600">Enter Custom Crop / Product <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={customCrop}
                      onChange={(e) => setCustomCrop(e.target.value)}
                      placeholder="e.g. Mustard, Soya Bean"
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-[#ffffff] rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/farmer')}
                  className="px-6 py-2.5 border border-stone-300 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 border border-transparent text-stone-50 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Region Mapped Officers directory */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-emerald-700" />
              Regional Agriculture Officers Mapped to Your Block
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {regionalOfficers.map((officer) => (
                <div
                  key={officer.id}
                  onClick={() => handleOpenOfficerDetails(officer)}
                  className="p-4 border border-stone-200 hover:border-emerald-500 rounded-2xl bg-[#faf9f5]/55 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center space-x-3 group"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0">
                    {officer.profilePictureUrl ? (
                      <img
                        src={officer.profilePictureUrl}
                        alt={officer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-emerald-800 transition-colors">
                      {officer.name}
                    </h4>
                    <p className="text-[10px] text-stone-500 truncate font-semibold">
                      {officer.designation || 'Block Development Officer'}
                    </p>
                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase ${
                      officer.availability === 'Available'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      {officer.availability || 'Available'}
                    </span>
                  </div>
                </div>
              ))}

              {regionalOfficers.length === 0 && (
                <div className="col-span-full py-8 text-center border border-dashed border-stone-300 rounded-2xl text-stone-400 font-semibold text-xs">
                  No designated block officers are currently registered in your village region.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Officer Detailed Profile Modal Overlay */}
      {selectedOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#ffffff] border border-stone-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-stone-50 p-6 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-amber-300" />
                <h3 className="text-lg font-bold">Agriculture Officer Profile Details</h3>
              </div>
              <button
                onClick={() => setSelectedOfficer(null)}
                className="p-1 rounded-lg text-emerald-100 hover:bg-emerald-600 hover:text-stone-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
              {/* Photo & Basic Details */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0 mx-auto sm:mx-0">
                  {selectedOfficer.profilePictureUrl ? (
                    <img
                      src={selectedOfficer.profilePictureUrl}
                      alt={selectedOfficer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <UserIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="flex-grow text-center sm:text-left space-y-1">
                  <h4 className="text-base font-extrabold text-stone-900">{selectedOfficer.name}</h4>
                  <p className="text-xs text-emerald-800 font-bold">{selectedOfficer.designation || 'Block Officer'}</p>
                  <p className="text-[11px] text-stone-500 font-semibold">{selectedOfficer.department || 'Department of Agriculture'}</p>
                  <div className="pt-1.5 flex flex-wrap justify-center sm:justify-start gap-1.5">
                    <span className="bg-stone-100 text-stone-800 text-[9px] px-2 py-0.5 rounded font-extrabold border border-stone-200">
                      Q: {selectedOfficer.qualification || 'B.Sc Agriculture'}
                    </span>
                    <span className="bg-stone-100 text-stone-800 text-[9px] px-2 py-0.5 rounded font-extrabold border border-stone-200">
                      Exp: {selectedOfficer.experience || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specific info rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-150 pt-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-stone-700">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Calling Hours: <strong className="text-stone-900">{selectedOfficer.callingTime || '9:00 AM - 5:00 PM'}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-stone-700">
                  <UserIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Availability status: <strong className="text-stone-900">{selectedOfficer.availability || 'Available'}</strong></span>
                </div>
                {selectedOfficer.phoneNumber && (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-stone-700">
                    <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Phone: <strong className="text-stone-900">{selectedOfficer.phoneNumber}</strong></span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-xs font-semibold text-stone-700">
                  <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="truncate">Email: <strong className="text-stone-900">{selectedOfficer.email}</strong></span>
                </div>
              </div>

              {/* Consultation History */}
              <div className="border-t border-stone-150 pt-4 space-y-2">
                <h5 className="text-xs font-bold text-stone-850 uppercase tracking-wide">Previous Consultation History</h5>
                {loadingConsultations ? (
                  <div className="flex items-center text-xs text-stone-400 space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading consultation history...</span>
                  </div>
                ) : consultationHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {consultationHistory.map((h) => (
                      <div key={h.id} className="p-2.5 border border-stone-150 rounded-xl bg-stone-50 text-[11px] font-semibold space-y-1">
                        <div className="flex justify-between font-bold text-stone-800">
                          <span>Crop: {h.cropType} (Diagnosis: {h.aiDiagnosis})</span>
                          <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                        </div>
                        {h.officerFeedback ? (
                          <p className="text-emerald-800 font-medium bg-emerald-50 p-1.5 rounded-lg mt-1 border border-emerald-100">
                            Officer Feedback: {h.officerFeedback}
                          </p>
                        ) : (
                          <p className="text-stone-400 italic">Verification pending...</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">No previous consultation history found with this officer.</p>
                )}
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-stone-150">
                <a
                  href={`tel:${selectedOfficer.phoneNumber || ''}`}
                  className="py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4 text-emerald-700" />
                  Call
                </a>
                <a
                  href={`mailto:${selectedOfficer.email}`}
                  className="py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Mail className="w-4 h-4 text-emerald-700" />
                  Email
                </a>
                <button
                  onClick={() => {
                    setSelectedOfficer(null);
                    navigate('/farmer/assistant');
                  }}
                  className="py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  Chat
                </button>
                <button
                  onClick={() => {
                    setSelectedOfficer(null);
                    navigate('/farmer?tab=appointments');
                  }}
                  className="py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  Book
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => {
                    setReportingOfficer(selectedOfficer);
                    setSelectedOfficer(null);
                  }}
                  className="inline-flex items-center text-xs font-bold text-red-650 hover:text-red-800 hover:underline cursor-pointer"
                >
                  <UserX className="w-4 h-4 mr-1" />
                  Report Officer for Admin Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Officer Modal Overlay */}
      {reportingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#ffffff] border border-stone-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="bg-red-700 text-stone-50 p-5 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center">
                <AlertOctagon className="w-4 h-4 mr-1.5 text-amber-300" />
                Report Officer for Verification Review
              </h3>
              <button
                onClick={() => setReportingOfficer(null)}
                className="text-stone-100 hover:text-stone-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportOfficerSubmit} className="p-5 space-y-4">
              <p className="text-xs text-stone-600 font-medium">
                You are reporting Officer <strong className="text-stone-800">{reportingOfficer.name}</strong>. Provide the detailed reason for this report. The Admin will review the case parameters.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Reason for Report</label>
                <textarea
                  required
                  rows={4}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe details: absenteeism, wrong advisory prescriptions, lack of response, or misconduct..."
                  className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setReportingOfficer(null)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 border border-transparent text-stone-50 bg-red-750 hover:bg-red-800 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                >
                  {submittingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Profile;
