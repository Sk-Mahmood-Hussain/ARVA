import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Sprout, LogOut, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const onboardingFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  language: z.string().min(1, 'Language is required'),
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

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const Onboarding: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Region dropdown states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [villages, setVillages] = useState<{ id: string; village: string }[]>([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      language: user?.language || 'en',
    }
  });

  const selectedState = watch('state');
  const selectedDistrict = watch('district');
  const selectedBlock = watch('block');

  // Load States on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/regions/states');
        setStates(res.data.data);
      } catch (err) {
        console.error('Error fetching states', err);
      }
    };
    fetchStates();
  }, []);

  // Fetch Districts when State changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchDistricts = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/districts?state=${selectedState}`);
        setDistricts(res.data.data);
        setValue('district', '');
        setValue('block', '');
        setValue('village', '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchDistricts();
  }, [selectedState, setValue]);

  // Fetch Blocks when District changes
  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchBlocks = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/blocks?state=${selectedState}&district=${selectedDistrict}`);
        setBlocks(res.data.data);
        setValue('block', '');
        setValue('village', '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchBlocks();
  }, [selectedDistrict, selectedState, setValue]);

  // Fetch Villages when Block changes
  useEffect(() => {
    if (!selectedBlock) return;
    const fetchVillages = async () => {
      setLoadingRegions(true);
      try {
        const res = await api.get(`/regions/villages?state=${selectedState}&district=${selectedDistrict}&block=${selectedBlock}`);
        setVillages(res.data.data);
        setValue('village', '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchVillages();
  }, [selectedBlock, selectedDistrict, selectedState, setValue]);

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof OnboardingFormValues> = [];
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'phoneNumber', 'language'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['state', 'district', 'block', 'village', 'address'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    setSubmitting(true);
    setApiError(null);
    try {
      // 1. Save onboarding details
      await api.post('/farmers/onboard', {
        address: data.address,
        state: data.state,
        district: data.district,
        block: data.block,
        village: data.village,
        landSize: data.landSize,
        soilType: data.soilType,
        irrigationType: data.irrigationType,
        primaryCrop: data.primaryCrop,
        cropGrowthStage: data.cropGrowthStage,
      });

      // 2. Update user profile details
      await api.patch('/farmers/profile', {
        name: data.name,
        phoneNumber: data.phoneNumber,
        language: data.language,
      });

      await refreshUser(); // Sync auth context
      navigate('/farmer'); // Route to Dashboard
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Onboarding registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#fdfbf7] border-b border-stone-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-amber-100 flex items-center justify-center">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-emerald-800">ARVA Farmer Onboarding</span>
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-stone-600 hover:text-stone-850 flex items-center text-sm font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign Out
        </button>
      </header>

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <div className="bg-[#ffffff] p-6 sm:p-10 border border-stone-200 shadow-xl rounded-3xl space-y-6">
          {/* Progress Indicator */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-stone-400 mb-2.5">
              <span>STEP {currentStep} OF 3</span>
              <span>{Math.round(((currentStep - 1) / 2) * 100)}% COMPLETE</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-350"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              {currentStep === 1 && 'Personal Information'}
              {currentStep === 2 && 'Location & Coordinates'}
              {currentStep === 3 && 'Agricultural Farm Profile'}
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              {currentStep === 1 && 'Please configure your account name, phone details, and language preference.'}
              {currentStep === 2 && 'Set your geographic coordinates to automatically assign your block Agriculture Officer.'}
              {currentStep === 3 && 'Define your soil characteristics, crop profile, and irrigation system.'}
            </p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-250 text-red-800 p-4 rounded-xl flex items-start space-x-2 text-xs font-semibold shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-655 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* STEP 1: PERSONAL DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600">Full Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="Enter your full name"
                    className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600">Language Preference</label>
                  <select
                    {...register('language')}
                    className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                  </select>
                  {errors.language && <p className="text-xs text-red-600 mt-1">{errors.language.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600">Mobile Number</label>
                  <input
                    type="text"
                    {...register('phoneNumber')}
                    placeholder="+919876543210"
                    className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: LOCATION COORDINATES */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">State</label>
                    <select
                      {...register('state')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select State</option>
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">District</label>
                    <select
                      {...register('district')}
                      disabled={!selectedState}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {errors.district && <p className="text-xs text-red-600 mt-1">{errors.district.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Block</label>
                    <select
                      {...register('block')}
                      disabled={!selectedDistrict}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Block</option>
                      {blocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {errors.block && <p className="text-xs text-red-600 mt-1">{errors.block.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Village</label>
                    <select
                      {...register('village')}
                      disabled={!selectedBlock}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Village</option>
                      {villages.map((v) => (
                        <option key={v.id} value={v.village}>{v.village}</option>
                      ))}
                    </select>
                    {errors.village && <p className="text-xs text-red-600 mt-1">{errors.village.message}</p>}
                  </div>
                </div>

                {loadingRegions && (
                  <div className="flex items-center text-xs text-stone-400 font-semibold space-x-1.5 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching regional details...</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-600">Residential Address</label>
                  <input
                    type="text"
                    {...register('address')}
                    placeholder="Enter village street / house details"
                    className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-800 font-semibold shadow-sm mt-4">
                  <CheckCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>Important Jurisdiction Notice: Your designated local Agriculture Officer will be assigned automatically based on your registered region coordinates.</span>
                </div>
              </div>
            )}

            {/* STEP 3: AGRICULTURAL DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600">Land Size (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.5"
                      {...register('landSize', { valueAsNumber: true })}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {errors.landSize && <p className="text-xs text-red-600 mt-1">{errors.landSize.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Soil Category</label>
                    <select
                      {...register('soilType')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Loamy">Loamy (Mera)</option>
                      <option value="Sandy">Sandy (Retli)</option>
                      <option value="Clayey">Clayey (Cheeka)</option>
                      <option value="Silt">Silt Soil</option>
                    </select>
                    {errors.soilType && <p className="text-xs text-red-600 mt-1">{errors.soilType.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Irrigation System</label>
                    <select
                      {...register('irrigationType')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Tube Well">Tube Well Irrigation</option>
                      <option value="Canal System">Canal (Nahar) System</option>
                      <option value="Drip System">Drip Irrigation</option>
                      <option value="Sprinkler">Sprinkler Irrigation</option>
                      <option value="Rainfed">Rainfed</option>
                    </select>
                    {errors.irrigationType && <p className="text-xs text-red-600 mt-1">{errors.irrigationType.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Primary Sown Crop</label>
                    <select
                      {...register('primaryCrop')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Wheat">Wheat (Kanak)</option>
                      <option value="Paddy">Rice (Dhan/Paddy)</option>
                      <option value="Maize">Maize (Makki)</option>
                      <option value="Cotton">Cotton (Narma)</option>
                      <option value="Sugarcane">Sugarcane (Ganna)</option>
                    </select>
                    {errors.primaryCrop && <p className="text-xs text-red-600 mt-1">{errors.primaryCrop.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600">Growth Stage</label>
                    <select
                      {...register('cropGrowthStage')}
                      className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-55/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Sowing">Sowing</option>
                      <option value="Vegetative">Vegetative Growth</option>
                      <option value="Flowering">Flowering Stage</option>
                      <option value="Maturity">Maturity</option>
                      <option value="Harvesting">Harvesting</option>
                    </select>
                    {errors.cropGrowthStage && <p className="text-xs text-red-600 mt-1">{errors.cropGrowthStage.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Actions */}
            <div className="pt-6 border-t border-stone-200 flex justify-between gap-4">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-6 py-2.5 border border-stone-300 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-2.5 border border-transparent bg-emerald-600 hover:bg-emerald-700 text-stone-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 border border-transparent bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-stone-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  <span>Complete Onboarding</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
