import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Award,
  Bell,
  CloudSun,
  Filter,
  Loader2,
  AlertTriangle,
  FileText,
  Bookmark
} from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: 'Weather' | 'Pest/Disease' | 'Government' | 'Regional' | 'AI Advisory';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
  author: string;
}

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [weather, setWeather] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Weather' | 'Pest/Disease' | 'Government' | 'Regional' | 'AI Advisory'>('All');

  const fetchAlertsAndAdvisory = async () => {
    try {
      // 1. Fetch broadcasts
      const broadcastsRes = await api.get('/broadcasts');
      const broadcasts = broadcastsRes.data.data;

      // 2. Fetch AI Advisory (we do this in parallel, but handle gracefully if onboarding isn't done)
      let aiAdvisoryItem: AlertItem | null = null;
      try {
        const advisoryRes = await api.get('/ai/advisory');
        const data = advisoryRes.data.data;
        if (data.advisory) {
          aiAdvisoryItem = {
            id: 'ai-advisory-id',
            title: 'Personalized AI Crop Advisory Report',
            message: data.advisory,
            type: 'AI Advisory',
            priority: 'MEDIUM',
            timestamp: new Date().toISOString(),
            author: 'ARVA AI Advisor',
          };
        }
        if (data.weather) {
          setWeather(data.weather);
        }
      } catch (err) {
        console.log('AI Advisory not available yet (onboarding might be incomplete)');
      }

      // 3. Classify and map broadcasts
      const mappedAlerts: AlertItem[] = broadcasts.map((br: any) => {
        let type: 'Weather' | 'Pest/Disease' | 'Government' | 'Regional' = 'Regional';
        const msgLower = (br.message || '').toLowerCase() + (br.title || '').toLowerCase();
        
        if (br.authorRole === 'ADMIN') {
          type = 'Government';
        } else if (msgLower.includes('rain') || msgLower.includes('wind') || msgLower.includes('temp') || msgLower.includes('weather') || msgLower.includes('storm') || msgLower.includes('heat')) {
          type = 'Weather';
        } else if (msgLower.includes('pest') || msgLower.includes('worm') || msgLower.includes('rust') || msgLower.includes('insects') || msgLower.includes('disease') || msgLower.includes('fungus')) {
          type = 'Pest/Disease';
        } else if (br.targetScope === 'REGIONAL') {
          type = 'Regional';
        }

        return {
          id: br.id,
          title: br.title,
          message: br.message,
          type,
          priority: br.priority,
          timestamp: br.createdAt,
          author: br.author?.name || 'Smart Advisor',
        };
      });

      const allItems = aiAdvisoryItem ? [aiAdvisoryItem, ...mappedAlerts] : mappedAlerts;
      setAlerts(allItems);
    } catch (err) {
      console.error('Failed to load advisories and alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndAdvisory();
  }, []);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-55/75 text-stone-700 border-stone-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Weather':
        return <CloudSun className="w-5 h-5 text-sky-600" />;
      case 'Pest/Disease':
        return <AlertTriangle className="w-5 h-5 text-red-650" />;
      case 'Government':
        return <Bookmark className="w-5 h-5 text-blue-600" />;
      case 'AI Advisory':
        return <Award className="w-5 h-5 text-emerald-700" />;
      default:
        return <Bell className="w-5 h-5 text-stone-500" />;
    }
  };

  const filteredAlerts = alerts.filter(
    (item) => activeFilter === 'All' || item.type === activeFilter
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Fetching advisories and weather parameters...</span>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Live Weather Header Widget */}
      {weather && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl p-6 text-stone-50 border border-emerald-500 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Live Agricultural Weather Alert</span>
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center">
              <CloudSun className="w-6 h-6 mr-2 text-amber-300 animate-pulse" />
              {weather.description || 'Sunny / Moderate Wind'}
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              Wind Speed: {weather.windspeed || '0'} km/h • Highs of {weather.temp || '0'}°C. Perfect parameters for localized spraying check.
            </p>
          </div>
          <div className="bg-[#ffffff]/10 px-6 py-4 rounded-2xl border border-[#ffffff]/10 backdrop-blur-md self-stretch md:self-auto flex items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight">{weather.temp}°C</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters sidebar */}
        <div className="bg-[#ffffff] p-5 border border-stone-200 shadow-md rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center border-b border-stone-150 pb-2">
            <Filter className="w-4 h-4 mr-1.5 text-stone-500" />
            Advisory Filters
          </h3>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pr-2 pb-2 lg:pb-0">
            {(['All', 'Weather', 'Pest/Disease', 'Government', 'Regional', 'AI Advisory'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-emerald-600 text-stone-50 shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts list */}
        <div className="lg:col-span-3 space-y-4">
          {filteredAlerts.map((item) => (
            <div
              key={item.id}
              className="bg-[#ffffff] p-6 border border-stone-200 shadow-md rounded-3xl space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-150">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-stone-900 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                      Published by {item.author} • {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {item.type}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${getPriorityStyle(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
              </div>

              {/* Render advisory content */}
              <div className="text-stone-700 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line bg-stone-50/50 p-4 border border-stone-150 rounded-2xl">
                {item.message}
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="bg-[#ffffff] text-center py-20 px-4 border border-stone-200 shadow-md rounded-3xl flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-stone-100 rounded-full text-stone-400">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-stone-700">No matching advisories</h3>
              <p className="text-xs text-stone-500 max-w-[280px]">
                There are no active notices or advisories published under this filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Alerts;
