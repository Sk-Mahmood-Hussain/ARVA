import { fetchWeatherForDistrict } from './weather.service';
import { queryOpenRouterGemini, AIMessageInput } from './ai.service';

interface FarmerProfileDetails {
  crop: string;
  stage: string;
  soil: string;
  irrigation: string;
  village: string;
  block: string;
  district: string;
  state: string;
  language: string;
}

export const generateSmartAdvisory = async (
  profile: FarmerProfileDetails
): Promise<{ advisory: string; weather: any }> => {
  // 1. Fetch live weather details
  const weather = await fetchWeatherForDistrict(profile.district);

  // 2. Build contextual prompt for Gemini
  const prompt = `
  Generate a customized, smart agricultural advisory report for a farmer with the following profile:
  - State: ${profile.state}
  - District: ${profile.district} (Block: ${profile.block}, Village: ${profile.village})
  - Crop: ${profile.crop}
  - Growth Stage: ${profile.stage}
  - Soil Type: ${profile.soil}
  - Irrigation Method: ${profile.irrigation}
  
  CURRENT LIVE WEATHER:
  - Temperature: ${weather.temp}°C
  - Wind Speed: ${weather.windspeed} km/h
  - Weather Description: ${weather.description}
  
  Please provide highly specific, actionable guidance structured in these exact sections:
  1. Irrigation guidance (tailored to growth stage, soil type, and weather temperature/rainfall conditions)
  2. Fertilizer and Soil guidance (tailored to growth stage, soil type)
  3. Crop-Care and Safety Warning alerts (checks weather description, whitefly/bollworm/rust risks)
  4. Seasonal advice (special recommendations based on temperature/wind)
  
  Important: Respond in the farmer's selected language: "${profile.language}" (use clear, simple Hindi, Punjabi, or English as requested).
  `;

  const messages: AIMessageInput[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  // 3. Query LLM
  const advisory = await queryOpenRouterGemini(messages);

  return {
    advisory,
    weather,
  };
};
