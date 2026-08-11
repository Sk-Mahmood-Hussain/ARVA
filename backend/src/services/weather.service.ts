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

export const fetchWeatherForDistrict = async (district: string): Promise<LiveWeatherData> => {
  const normDistrict = district.trim().toLowerCase();
  const coords = districtCoords[normDistrict] || { lat: 31.125, lon: 76.126 }; // Fallback coords

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
    };
  } catch (err: any) {
    console.error('Weather API query failed: ', err.message);
    return {
      temp: 32.5,
      windspeed: 12.0,
      weathercode: 1,
      description: 'Partly cloudy - suitable for general farm management.',
    };
  }
};
