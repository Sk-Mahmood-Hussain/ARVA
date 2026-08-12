import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CloudFog,
  CloudDrizzle
} from 'lucide-react';

interface ForecastDay {
  date: string;
  weathercode: number;
  tempMax: number;
  tempMin: number;
  rainSum: number;
  rainProbability: number;
  windspeedMax: number;
  description: string;
}

interface WeatherData {
  current: {
    temp: number;
    windspeed: number;
    weathercode: number;
    description: string;
  };
  forecast: ForecastDay[];
  district: string;
}

export const Weather: React.FC = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/weather');
      setWeather(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const getWeatherIcon = (code: number, className = "w-8 h-8") => {
    if (code === 0) return <Sun className={`${className} text-amber-500`} />;
    if (code >= 1 && code <= 3) return <Cloud className={`${className} text-stone-400`} />;
    if (code >= 45 && code <= 48) return <CloudFog className={`${className} text-stone-300`} />;
    if (code >= 51 && code <= 55) return <CloudDrizzle className={`${className} text-blue-300`} />;
    if (code >= 61 && code <= 65) return <CloudRain className={`${className} text-blue-500`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-600`} />;
    if (code >= 95 && code <= 99) return <CloudLightning className={`${className} text-amber-600`} />;
    return <Cloud className={`${className} text-stone-400`} />;
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(user?.language === 'pa' ? 'pa-IN' : user?.language === 'hi' ? 'hi-IN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Fetching real-time weather details...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-lg font-bold">Weather Data Unavailable</h3>
          <p className="text-sm">{error || 'Could not verify farmer region coordinates.'}</p>
          <button
            onClick={fetchWeather}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-bold text-stone-50 bg-red-750 hover:bg-red-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Cloud className="text-emerald-700 w-8 h-8" />
            {user?.language === 'pa' ? 'ਮੌਸਮ ਪੂਰਵ-ਅਨੁਮਾਨ' : user?.language === 'hi' ? 'मौसम पूर्वानुमान' : 'Live Weather Forecast'}
          </h1>
          <p className="text-stone-500 text-xs font-semibold mt-1">
            {user?.language === 'pa'
              ? 'ਤੁਹਾਡੇ ਬਲਾਕ ਅਤੇ ਪਿੰਡ ਖੇਤਰ ਦਾ ਸਥਾਨਕ ਮੌਸਮ ਅਪਡੇਟ।'
              : user?.language === 'hi'
              ? 'आपके ब्लॉक और गांव क्षेत्र का स्थानीय मौसम अपडेट।'
              : 'Location-aware weather parameters mapped to your block.'}
          </p>
        </div>
        <div className="flex items-center bg-white border border-stone-200 px-4 py-2 rounded-2xl shadow-sm text-xs font-bold text-stone-700">
          <MapPin className="w-4 h-4 text-emerald-600 mr-2" />
          <span>{weather.district}</span>
        </div>
      </div>

      {/* Current Weather Dashboard */}
      <div className="bg-white border border-stone-200 shadow-md rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Left main temp */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex flex-col justify-between space-y-6">
          <div>
            <span className="text-emerald-200 text-xs font-bold uppercase tracking-wider block">
              {user?.language === 'pa' ? 'ਅੱਜ ਦਾ ਮੌਸਮ' : user?.language === 'hi' ? 'आज का मौसम' : 'CURRENT STATUS'}
            </span>
            <div className="flex items-center gap-4 mt-2">
              {getGetWeatherIcon(weather.current.weathercode, "w-14 h-14")}
              <div>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">{weather.current.temp}°C</span>
              </div>
            </div>
          </div>
          <p className="text-sm font-semibold text-emerald-100 leading-relaxed">
            {weather.current.description}
          </p>
        </div>

        {/* Right metrics grid */}
        <div className="md:col-span-2 p-6 sm:p-8 grid grid-cols-2 gap-6 items-center">
          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center space-x-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-800">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase">Temperature</span>
              <span className="text-base font-extrabold text-stone-850">{weather.current.temp}°C</span>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center space-x-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-800">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase">Wind Speed</span>
              <span className="text-base font-extrabold text-stone-850">{weather.current.windspeed} km/h</span>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center space-x-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-800">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase">Rain Probability</span>
              <span className="text-base font-extrabold text-stone-850">
                {weather.forecast[0]?.rainProbability || 0}%
              </span>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center space-x-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-800">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase">Total Rainfall</span>
              <span className="text-base font-extrabold text-stone-850">
                {weather.forecast[0]?.rainSum || 0} mm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-1.5">
          <Calendar className="w-5 h-5 text-emerald-700" />
          {user?.language === 'pa' ? '7-ਦਿਨਾਂ ਦਾ ਪੂਰਵ-ਅਨੁਮਾਨ' : user?.language === 'hi' ? '7-दिनों का पूर्वानुमान' : '7-Day Future Forecast'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {weather.forecast.map((day, idx) => (
            <div
              key={day.date}
              className={`p-4 border shadow-sm rounded-2xl flex flex-col justify-between text-center space-y-3 transition-all hover:shadow-md ${
                idx === 0 ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-stone-200'
              }`}
            >
              <div className="space-y-1">
                <span className="block text-xs font-extrabold text-stone-850">{getDayName(day.date)}</span>
                <span className="block text-[9px] text-stone-400 font-bold uppercase">{day.date}</span>
              </div>

              <div className="py-2 flex justify-center">{getWeatherIcon(day.weathercode, "w-8 h-8")}</div>

              <div className="space-y-1">
                <div className="flex justify-center gap-1.5 text-xs font-extrabold">
                  <span className="text-stone-800">{Math.round(day.tempMax)}°</span>
                  <span className="text-stone-400">{Math.round(day.tempMin)}°</span>
                </div>
                <div className="text-[10px] text-stone-500 font-bold space-y-0.5">
                  <span className="block text-blue-600 font-extrabold">☔ {day.rainProbability}%</span>
                  <span className="block text-stone-400 font-semibold">{day.rainSum} mm</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

// Fallback helper to prevent compile errors
function getGetWeatherIcon(code: number, className = "w-8 h-8") {
  if (code === 0) return <Sun className={`${className} text-amber-300`} />;
  if (code >= 1 && code <= 3) return <Cloud className={`${className} text-emerald-200`} />;
  if (code >= 45 && code <= 48) return <CloudFog className={`${className} text-emerald-100`} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${className} text-blue-200`} />;
  if (code >= 61 && code <= 65) return <CloudRain className={`${className} text-blue-300`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-400`} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={`${className} text-amber-400`} />;
  return <Cloud className={`${className} text-emerald-200`} />;
}

export default Weather;
