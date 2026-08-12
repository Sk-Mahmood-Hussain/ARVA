import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  AlertTriangle,
  Droplets,
  CloudSun,
  Shield,
  TrendingUp,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StructuredAdvisory {
  summary: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  weatherImpact: string;
  irrigation: string;
  cropCare: string;
  fertilizer: string;
  pestRisk: string;
  actions: string[];
  warning: string;
  contactOfficer: boolean;
}

export const Advisory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [advisory, setAdvisory] = useState<StructuredAdvisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speechActive, setSpeechActive] = useState(false);

  const fetchAdvisory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai/advisory');
      setAdvisory(res.data.data.advisory);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate advisory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisory();
  }, []);

  const handleSpeak = () => {
    if (!advisory) return;

    if ('speechSynthesis' in window) {
      if (speechActive) {
        window.speechSynthesis.cancel();
        setSpeechActive(false);
        return;
      }

      window.speechSynthesis.cancel();
      const parts = [
        advisory.summary,
        advisory.weatherImpact,
        advisory.irrigation,
        advisory.cropCare,
        advisory.fertilizer,
        advisory.pestRisk,
        ...advisory.actions
      ];
      const speechText = parts.join('. ').replace(/[*#_`-]/g, '');

      const utterance = new SpeechSynthesisUtterance(speechText);
      if (user?.language === 'hi') {
        utterance.lang = 'hi-IN';
      } else if (user?.language === 'pa') {
        utterance.lang = 'pa-IN';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => {
        setSpeechActive(false);
      };

      setSpeechActive(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-Speech is not supported in your browser.');
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Generating custom advisory...</span>
      </div>
    );
  }

  if (error || !advisory) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-lg font-bold">Advisory Generation Failed</h3>
          <p className="text-sm">{error || 'Please complete onboarding settings before generating crop advisories.'}</p>
          <button
            onClick={fetchAdvisory}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-bold text-stone-50 bg-red-750 hover:bg-red-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Advisory
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/farmer')}
            className="p-2 border border-stone-300 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-stone-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
              <Sprout className="text-emerald-700 w-7 h-7" />
              {user?.language === 'pa' ? 'ਸਮਾਰਟ ਫਸਲ ਸਲਾਹ' : user?.language === 'hi' ? 'स्मार्ट फसल सलाहकार' : 'Smart Crop Advisory'}
            </h1>
            <p className="text-stone-500 text-xs font-semibold mt-0.5">
              {user?.language === 'pa' ? 'ਮੌਸਮ ਅਤੇ ਮਿੱਟੀ ਮੁਤਾਬਕ ਫਸਲ ਦੀ ਦੇਖਭਾਲ।' : user?.language === 'hi' ? 'मौसम और मिट्टी के अनुकूल सलाह।' : 'Real-time AI recommendations.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSpeak}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            speechActive
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          {speechActive ? (
            <>
              <VolumeX className="w-4 h-4 text-red-600" />
              <span>Stop Reading</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>Listen Advisory</span>
            </>
          )}
        </button>
      </div>

      {/* Advisory Overview Card */}
      <div className="bg-[#ffffff] border border-stone-250 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-extrabold text-stone-850 uppercase tracking-widest">Advisory Overview</h2>
          <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold tracking-wider ${getPriorityColor(advisory.priority)}`}>
            {advisory.priority} PRIORITY
          </span>
        </div>
        <p className="text-sm font-semibold text-stone-800 leading-relaxed bg-stone-50/50 p-4 border border-stone-200 rounded-2xl">
          {advisory.summary}
        </p>
      </div>

      {/* Structured Advice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weather Impact */}
        <div className="bg-[#ffffff] border border-stone-200 p-5 rounded-2xl shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <CloudSun className="w-4 h-4 mr-1.5 text-emerald-700" />
            Weather Impact
          </h3>
          <p className="text-xs font-medium text-stone-750 leading-relaxed bg-[#faf9f5]/70 p-3.5 border border-stone-150 rounded-xl">
            {advisory.weatherImpact || 'No specific weather impact noted.'}
          </p>
        </div>

        {/* Irrigation */}
        <div className="bg-[#ffffff] border border-stone-200 p-5 rounded-2xl shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <Droplets className="w-4 h-4 mr-1.5 text-emerald-700" />
            Irrigation Water Estimate
          </h3>
          <p className="text-xs font-medium text-stone-750 leading-relaxed bg-[#faf9f5]/70 p-3.5 border border-stone-150 rounded-xl">
            {advisory.irrigation || 'Precipitation matches requirement.'}
          </p>
        </div>

        {/* Crop Care */}
        <div className="bg-[#ffffff] border border-stone-200 p-5 rounded-2xl shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <Sprout className="w-4 h-4 mr-1.5 text-emerald-700" />
            Crop Care Tip
          </h3>
          <p className="text-xs font-medium text-stone-750 leading-relaxed bg-[#faf9f5]/70 p-3.5 border border-stone-150 rounded-xl">
            {advisory.cropCare || 'Monitor general crop development.'}
          </p>
        </div>

        {/* Fertilizer & Soil */}
        <div className="bg-[#ffffff] border border-stone-200 p-5 rounded-2xl shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-700" />
            Fertilizer Doses
          </h3>
          <p className="text-xs font-medium text-stone-750 leading-relaxed bg-[#faf9f5]/70 p-3.5 border border-stone-150 rounded-xl">
            {advisory.fertilizer || 'Fertilization is not critical at this stage.'}
          </p>
        </div>

        {/* Pest Risk */}
        <div className="bg-[#ffffff] border border-stone-200 p-5 rounded-2xl shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <Shield className="w-4 h-4 mr-1.5 text-emerald-700" />
            Pest & Disease Risk
          </h3>
          <p className="text-xs font-medium text-stone-750 leading-relaxed bg-[#faf9f5]/70 p-3.5 border border-stone-150 rounded-xl">
            {advisory.pestRisk || 'No high pest risks detected.'}
          </p>
        </div>

        {/* Important Warning */}
        {advisory.warning && (
          <div className="bg-red-50/50 border border-red-200 p-5 rounded-2xl shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-red-900 flex items-center uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-red-700" />
              Critical Warning Alert
            </h3>
            <p className="text-xs font-bold text-red-800 leading-relaxed bg-[#ffffff] p-3.5 border border-red-200 rounded-xl">
              {advisory.warning}
            </p>
          </div>
        )}
      </div>

      {/* Action Items Checklist */}
      <div className="bg-white border border-stone-200 shadow-sm rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          Recommended Actions Checklist
        </h3>
        <div className="space-y-2.5">
          {advisory.actions.map((action, idx) => (
            <label key={idx} className="flex items-start space-x-3 p-3 border border-stone-150 rounded-2xl bg-stone-50/50 hover:bg-stone-50 transition-colors cursor-pointer text-xs font-semibold text-stone-750">
              <input type="checkbox" className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0" />
              <span>{action}</span>
            </label>
          ))}
          {advisory.actions.length === 0 && (
            <p className="text-stone-400 text-xs italic font-semibold text-center py-4">No specific action items listed today.</p>
          )}
        </div>
      </div>

      {/* Escalation Prompt */}
      {advisory.contactOfficer && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-700" /> Expert Assistance Recommended
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed font-semibold">
              The AI advisory suggests reaching out to your block Agriculture Officer for field diagnostics verification.
            </p>
          </div>
          <button
            onClick={() => navigate('/farmer/officers')}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 text-white font-bold rounded-xl text-xs hover:bg-amber-800 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            Contact Officer Directory
          </button>
        </div>
      )}
    </main>
  );
};

export default Advisory;
