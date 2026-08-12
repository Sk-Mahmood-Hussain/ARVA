import axios from 'axios';

// Static coordinates mapping for Punjab districts
const districtCoords: { [key: string]: { lat: number; lon: number } } = {
  amritsar: { lat: 31.634, lon: 74.872 },
  ludhiana: { lat: 30.901, lon: 75.857 },
  patiala: { lat: 30.34, lon: 76.387 },
  jalandhar: { lat: 31.326, lon: 75.579 },
  bathinda: { lat: 30.211, lon: 74.945 },
  gurdaspur: { lat: 32.041, lon: 75.405 },
  firozpur: { lat: 30.927, lon: 74.612 },
  hoshiarpur: { lat: 31.514, lon: 75.911 },
  sangrur: { lat: 30.229, lon: 75.841 },
  moga: { lat: 30.817, lon: 75.17 },
  pathankot: { lat: 32.264, lon: 75.637 },
  'tarn taran': { lat: 31.452, lon: 74.922 },
  rupnagar: { lat: 30.966, lon: 76.533 },
  mohali: { lat: 30.697, lon: 76.696 },
  barnala: { lat: 30.381, lon: 75.547 },
  faridkot: { lat: 30.677, lon: 74.757 },
  'fatehgarh sahib': { lat: 30.655, lon: 76.386 },
  fazilka: { lat: 30.403, lon: 74.02 },
  kapurthala: { lat: 31.383, lon: 75.383 },
  mansa: { lat: 29.986, lon: 75.394 },
  'sri muktsar sahib': { lat: 30.478, lon: 74.514 },
  nawanshahr: { lat: 31.125, lon: 76.126 },
  malerkotla: { lat: 30.526, lon: 75.885 },
};

export interface LiveWeatherData {
  temp: number;
  windspeed: number;
  weathercode: number;
  description: string;
  humidity?: number;
}

export interface ForecastDay {
  date: string;
  weathercode: number;
  tempMax: number;
  tempMin: number;
  rainSum: number;
  rainProbability: number;
  windspeedMax: number;
  description: string;
}

export interface FullWeatherData {
  current: LiveWeatherData;
  forecast: ForecastDay[];
  district: string;
}

// Map Open-Meteo weather codes to short agricultural advisory descriptions
const mapWeatherCode = (code: number): string => {
  if (code === 0) return 'Clear sky - ideal for field spraying and crop harvesting.';
  if (code >= 1 && code <= 3) return 'Partly cloudy - suitable for irrigation and field works.';
  if (code >= 45 && code <= 48) return 'Foggy conditions - high moisture, monitor closely for fungal pests.';
  if (code >= 51 && code <= 55) return 'Drizzle rain - high relative humidity, avoid nitrogen fertilizers application.';
  if (code >= 61 && code <= 65) return 'Rainfall - suspend field watering operations. Check for drainage.';
  if (code >= 71 && code <= 77) return 'Snow fall or hail risk - shield sensitive seedlings.';
  if (code >= 80 && code <= 82) return 'Rain showers - moisture accumulation, restrict chemical spraying.';
  if (code >= 95 && code <= 99) return 'Thunderstorm warning - seek shelter, secure loose machinery.';
  return 'Overcast conditions - general agricultural operations can proceed.';
};

const getOpenWeatherForecast = async (lat: number, lon: number, apiKey: string): Promise<{ current: LiveWeatherData & { humidity?: number }; forecast: ForecastDay[] }> => {
  // Fetch current weather
  const currentRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
  const currentData = currentRes.data;
  
  const currentTemp = currentData.main.temp;
  const currentHumidity = currentData.main.humidity;
  const currentWindSpeed = currentData.wind.speed * 3.6; // m/s to km/h
  const currentDescription = `Current conditions: ${currentData.weather[0].description}. Humidity is ${currentHumidity}%.`;
  
  // Fetch 5-day forecast
  const forecastRes = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
  const forecastList = forecastRes.data.list;
  
  // Group forecast points by date string (YYYY-MM-DD)
  const grouped: { [date: string]: any[] } = {};
  for (const item of forecastList) {
    const dateStr = item.dt_txt.split(' ')[0];
    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }
    grouped[dateStr].push(item);
  }
  
  const forecastDays: ForecastDay[] = Object.keys(grouped).slice(0, 7).map((dateStr) => {
    const items = grouped[dateStr];
    let tempMax = -999;
    let tempMin = 999;
    let rainSum = 0;
    let maxPop = 0;
    let maxWind = 0;
    const descCounts: { [desc: string]: number } = {};
    
    for (const item of items) {
      if (item.main.temp_max > tempMax) tempMax = item.main.temp_max;
      if (item.main.temp_min < tempMin) tempMin = item.main.temp_min;
      if (item.rain && item.rain['3h']) rainSum += item.rain['3h'];
      if (item.pop > maxPop) maxPop = item.pop;
      const windKmh = item.wind.speed * 3.6;
      if (windKmh > maxWind) maxWind = windKmh;
      
      const mainDesc = item.weather[0].main;
      descCounts[mainDesc] = (descCounts[mainDesc] || 0) + 1;
    }
    
    let bestDesc = 'Clear';
    let maxCount = 0;
    for (const desc of Object.keys(descCounts)) {
      if (descCounts[desc] > maxCount) {
        maxCount = descCounts[desc];
        bestDesc = desc;
      }
    }
    
    let description = 'Clear sky - ideal for field work.';
    if (bestDesc.toLowerCase().includes('rain')) {
      description = 'Rainfall - suspend field watering operations. Check drainage.';
    } else if (bestDesc.toLowerCase().includes('cloud')) {
      description = 'Partly cloudy - suitable for irrigation and general maintenance.';
    } else if (bestDesc.toLowerCase().includes('clear')) {
      description = 'Clear sky - ideal for spraying and crop harvesting.';
    } else if (bestDesc.toLowerCase().includes('mist') || bestDesc.toLowerCase().includes('fog')) {
      description = 'Foggy conditions - high moisture, monitor closely for fungal pests.';
    }
    
    return {
      date: dateStr,
      weathercode: bestDesc === 'Rain' ? 61 : bestDesc === 'Clouds' ? 3 : 0,
      tempMax: Math.round(tempMax * 10) / 10,
      tempMin: Math.round(tempMin * 10) / 10,
      rainSum: Math.round(rainSum * 10) / 10,
      rainProbability: Math.round(maxPop * 100),
      windspeedMax: Math.round(maxWind * 10) / 10,
      description,
      humidity: items[0]?.main?.humidity || 65,
    } as any;
  });
  
  return {
    current: {
      temp: Math.round(currentTemp * 10) / 10,
      windspeed: Math.round(currentWindSpeed * 10) / 10,
      weathercode: currentData.weather[0].main === 'Rain' ? 61 : currentData.weather[0].main === 'Clouds' ? 3 : 0,
      description: currentDescription,
      humidity: currentHumidity,
    },
    forecast: forecastDays
  };
};

export const fetchWeatherForDistrict = async (district: string): Promise<LiveWeatherData & { humidity?: number }> => {
  const normDistrict = district.trim().toLowerCase();
  const coords = districtCoords[normDistrict] || { lat: 31.125, lon: 76.126 };

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey) {
    try {
      console.log('Using OpenWeather API key for district current weather...');
      const data = await getOpenWeatherForecast(coords.lat, coords.lon, apiKey);
      return data.current;
    } catch (err: any) {
      console.error('OpenWeather query failed, falling back to Open-Meteo: ', err.message);
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
    const res = await axios.get(url);
    const current = res.data?.current_weather;

    if (!current) {
      throw new Error('Weather payload empty');
    }

    return {
      temp: current.temperature,
      windspeed: current.windspeed,
      weathercode: current.weathercode,
      description: mapWeatherCode(current.weathercode),
      humidity: 60, // fallback humidity for Open-Meteo
    };
  } catch (err: any) {
    console.error('Weather API query failed: ', err.message);
    return {
      temp: 32.5,
      windspeed: 12.0,
      weathercode: 1,
      description: 'Partly cloudy - suitable for general farm management.',
      humidity: 65,
    };
  }
};

export const fetchWeatherForecastForDistrict = async (district: string): Promise<FullWeatherData> => {
  const normDistrict = district.trim().toLowerCase();
  const coords = districtCoords[normDistrict] || { lat: 31.125, lon: 76.126 };

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey) {
    try {
      console.log('Using OpenWeather API key for district forecast...');
      const data = await getOpenWeatherForecast(coords.lat, coords.lon, apiKey);
      return {
        current: data.current,
        forecast: data.forecast,
        district,
      };
    } catch (err: any) {
      console.error('OpenWeather forecast query failed, falling back to Open-Meteo: ', err.message);
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,rain_sum,precipitation_probability_max,windspeed_10m_max&current_weather=true&timezone=auto`;
    const res = await axios.get(url);
    const data = res.data;

    const current = {
      temp: data.current_weather.temperature,
      windspeed: data.current_weather.windspeed,
      weathercode: data.current_weather.weathercode,
      description: mapWeatherCode(data.current_weather.weathercode),
      humidity: 60,
    };

    const forecast: ForecastDay[] = [];
    if (data.daily && data.daily.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        forecast.push({
          date: data.daily.time[i],
          weathercode: data.daily.weathercode[i],
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          rainSum: data.daily.rain_sum[i] || 0,
          rainProbability: data.daily.precipitation_probability_max[i] || 0,
          windspeedMax: data.daily.windspeed_10m_max[i] || 0,
          description: mapWeatherCode(data.daily.weathercode[i]),
        });
      }
    }

    return {
      current,
      forecast,
      district,
    };
  } catch (err: any) {
    console.error('Weather forecast query failed: ', err.message);
    return {
      current: {
        temp: 30.0,
        windspeed: 10.0,
        weathercode: 0,
        description: 'Clear sky - ideal for field spraying and crop harvesting.',
        humidity: 60,
      },
      forecast: Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          date: d.toISOString().split('T')[0],
          weathercode: 0,
          tempMax: 32 - i % 3,
          tempMin: 24 - i % 2,
          rainSum: 0,
          rainProbability: 0,
          windspeedMax: 12,
          description: 'Clear sky - ideal for field spraying.',
        };
      }),
      district,
    };
  }
};
