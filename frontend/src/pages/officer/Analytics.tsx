import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Activity,
  Award,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  totalFarmers: number;
  activeFarmers: number;
  newFarmers: number;
  registrationTrend: { month: string; count: number }[];
  totalDiseaseCases: number;
  pendingDiseaseCases: number;
  verifiedDiseaseCases: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  regionalBroadcasts: number;
  communityPostsCount: number;
  villageDistribution: { village: string; block: string; farmerCount: number }[];
}

export const OfficerAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/officers/analytics');
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load jurisdiction analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-amber-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Aggregating jurisdiction statistics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-3xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="text-lg font-bold">Analytics Unavailable</h3>
          <p className="text-sm">{error || 'Could not verify database sync.'}</p>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-bold text-stone-50 bg-amber-700 hover:bg-amber-850"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  // Calculate SVG dimensions for the 6-month registration trend
  const chartHeight = 150;
  const chartWidth = 500;
  const maxTrendVal = Math.max(...data.registrationTrend.map((t) => t.count), 5);
  const points = data.registrationTrend.map((t, i) => {
    const x = (i / (data.registrationTrend.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (t.count / maxTrendVal) * (chartHeight - 40) - 20;
    return { x, y, count: t.count, month: t.month };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <main className="max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/officer')}
            className="p-2 border border-stone-300 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-stone-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
              <BarChart3 className="text-amber-700 w-7 h-7" />
              Jurisdiction Performance Analytics
            </h1>
            <p className="text-stone-500 text-xs font-semibold mt-0.5">
              Farmers activity breakdown, crop registration timelines, and regional verified diagnostic counts.
            </p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 border border-stone-300 hover:bg-stone-55 rounded-xl transition-all cursor-pointer text-stone-600"
          title="Refresh Statistics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-700 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-400 uppercase">Farmers Assigned</span>
            <span className="text-xl font-extrabold text-stone-850 mt-0.5">{data.totalFarmers}</span>
          </div>
        </div>

        <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-700 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-400 uppercase">Active Farmers</span>
            <span className="text-xl font-extrabold text-stone-850 mt-0.5">{data.activeFarmers}</span>
          </div>
        </div>

        <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-700 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-400 uppercase">New Farmers (30d)</span>
            <span className="text-xl font-extrabold text-stone-850 mt-0.5">{data.newFarmers}</span>
          </div>
        </div>

        <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-sm rounded-3xl flex items-center space-x-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-700 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-stone-400 uppercase">Broadcast Alerts</span>
            <span className="text-xl font-extrabold text-stone-850 mt-0.5">{data.regionalBroadcasts}</span>
          </div>
        </div>
      </div>

      {/* SVG Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Trend Chart */}
        <div className="bg-white p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Farmer Growth Timeline</h3>
            <span className="text-[10px] text-stone-400 font-semibold">Jurisdiction profiles registered over the last 6 months</span>
          </div>
          
          <div className="w-full flex justify-center">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-lg h-auto overflow-visible">
              {/* Grid Lines */}
              <line x1="20" y1="130" x2="480" y2="130" stroke="#e5e5e0" strokeWidth="1" />
              <line x1="20" y1="75" x2="480" y2="75" stroke="#e5e5e0" strokeDasharray="4" />
              <line x1="20" y1="20" x2="480" y2="20" stroke="#e5e5e0" strokeDasharray="4" />

              {/* Trend Path */}
              {points.length > 1 && (
                <path d={linePath} fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Points & Labels */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#d97706" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#2d2d2d">{p.count}</text>
                  <text x={p.x} y="145" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#787870">{p.month}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Village Density Distribution */}
        <div className="bg-white p-6 border border-stone-200 shadow-sm rounded-3xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Village Density Breakdown</h3>
            <span className="text-[10px] text-stone-400 font-semibold">Farmers count distribution by village scope</span>
          </div>
          
          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {data.villageDistribution.map((dist, idx) => {
              const total = Math.max(data.villageDistribution.reduce((a, b) => a + b.farmerCount, 0), 1);
              const percentage = Math.round((dist.farmerCount / total) * 100);
              return (
                <div key={idx} className="space-y-1 text-xs font-semibold">
                  <div className="flex justify-between text-stone-850">
                    <span className="capitalize">{dist.village} ({dist.block})</span>
                    <span>{dist.farmerCount} farmers ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
            {data.villageDistribution.length === 0 && (
              <p className="text-xs text-stone-400 italic text-center py-4 font-semibold">No assigned villages mapped under profile.</p>
            )}
          </div>
        </div>
      </div>

      {/* Consultations and Disease verification stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointments Status */}
        <div className="bg-white p-5 border border-stone-200 shadow-sm rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <Calendar className="w-4 h-4 mr-1.5 text-amber-700" />
            Appointments breakdown
          </h3>
          <div className="space-y-3 font-semibold text-xs text-stone-700">
            <div className="flex justify-between items-center bg-stone-50 border p-2.5 rounded-xl">
              <span>Total Slots Booked</span>
              <strong className="text-stone-900">{data.totalAppointments}</strong>
            </div>
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl">
              <span>Consultations Completed</span>
              <strong className="text-stone-900">{data.completedAppointments}</strong>
            </div>
            <div className="flex justify-between items-center bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl">
              <span>Pending Slots</span>
              <strong className="text-stone-900">{data.pendingAppointments}</strong>
            </div>
          </div>
        </div>

        {/* Disease Cases */}
        <div className="bg-white p-5 border border-stone-200 shadow-sm rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-stone-900 flex items-center uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-700" />
            Disease verification status
          </h3>
          <div className="space-y-3 font-semibold text-xs text-stone-700">
            <div className="flex justify-between items-center bg-stone-50 border p-2.5 rounded-xl">
              <span>Total Reported Cases</span>
              <strong className="text-stone-900">{data.totalDiseaseCases}</strong>
            </div>
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl">
              <span>Verified (Resolved)</span>
              <strong className="text-stone-900">{data.verifiedDiseaseCases}</strong>
            </div>
            <div className="flex justify-between items-center bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-xl">
              <span>Pending Review Cases</span>
              <strong className="text-stone-900">{data.pendingDiseaseCases}</strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OfficerAnalytics;
