import { fetchWeatherForecastForDistrict } from './weather.service';
import { queryOpenRouterGemini, AIMessageInput } from './ai.service';
import { z } from 'zod';

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

export const advisorySchema = z.object({
  summary: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  weatherImpact: z.string(),
  irrigation: z.string(),
  cropCare: z.string(),
  fertilizer: z.string(),
  pestRisk: z.string(),
  actions: z.array(z.string()),
  warning: z.string(),
  contactOfficer: z.boolean(),
});

export type StructuredAdvisory = z.infer<typeof advisorySchema>;

// Deterministic irrigation calculation engine
const calculateIrrigationDecision = (
  crop: string,
  stage: string,
  soil: string,
  irrigationType: string,
  temp: number,
  forecastRainSum: number
): { decision: string; waterNeededMm: number } => {
  // 1. Reference ET0 estimation based on temperature (approx mm/day)
  let et0 = 4.0;
  if (temp > 35) et0 = 7.0;
  else if (temp > 30) et0 = 5.5;
  else if (temp > 25) et0 = 4.0;
  else if (temp > 15) et0 = 2.5;
  else et0 = 1.5;

  // 2. Crop Coefficient (Kc)
  let kc = 0.7;
  const normCrop = crop.toLowerCase();
  const normStage = stage.toLowerCase();

  if (normCrop.includes('wheat') || normCrop.includes('kanak')) {
    if (normStage.includes('sowing')) kc = 0.4;
    else if (normStage.includes('vegetative')) kc = 0.75;
    else if (normStage.includes('flowering')) kc = 1.15;
    else if (normStage.includes('maturity')) kc = 0.85;
    else if (normStage.includes('harvest')) kc = 0.3;
  } else if (normCrop.includes('rice') || normCrop.includes('paddy') || normCrop.includes('dhan')) {
    if (normStage.includes('sowing')) kc = 1.05;
    else if (normStage.includes('vegetative')) kc = 1.15;
    else if (normStage.includes('flowering')) kc = 1.20;
    else if (normStage.includes('maturity')) kc = 0.95;
    else if (normStage.includes('harvest')) kc = 0.2;
  } else if (normCrop.includes('cotton') || normCrop.includes('narma')) {
    if (normStage.includes('sowing')) kc = 0.35;
    else if (normStage.includes('vegetative')) kc = 0.75;
    else if (normStage.includes('flowering')) kc = 1.15;
    else if (normStage.includes('maturity')) kc = 0.9;
    else if (normStage.includes('harvest')) kc = 0.4;
  } else if (normCrop.includes('sugarcane') || normCrop.includes('ganna')) {
    kc = 1.1; // sugarcane needs high water consistently
  }

  // 3. Soil moisture retention factor
  let soilFactor = 1.0;
  const normSoil = soil.toLowerCase();
  if (normSoil.includes('sandy') || normSoil.includes('retli')) {
    soilFactor = 1.2; // sand drains quickly, needs more frequent water
  } else if (normSoil.includes('clay') || normSoil.includes('cheeka')) {
    soilFactor = 0.8; // clay retains water, prone to waterlogging
  }

  // 4. Irrigation Efficiency
  let efficiency = 0.50; // default flood
  const normIrrigation = irrigationType.toLowerCase();
  if (normIrrigation.includes('drip')) efficiency = 0.90;
  else if (normIrrigation.includes('sprinkler')) efficiency = 0.75;

  // 3-day water demand (ETc * 3)
  const etc = et0 * kc * soilFactor;
  const totalDemand = etc * 3;

  // Water Balance (Demand - expected rainfall)
  const deficit = totalDemand - forecastRainSum;

  let decision = '';
  let waterNeededMm = 0;

  if (forecastRainSum > totalDemand * 0.8) {
    decision = `Heavy rain forecast: ${forecastRainSum.toFixed(1)} mm rain is expected in the next 3 days. DO NOT irrigate. Keep field channels open for drainage.`;
  } else if (deficit <= 1.0) {
    decision = 'Precipitation is sufficient to cover crop water demand. No irrigation required today.';
  } else {
    waterNeededMm = deficit / efficiency;
    const minutes = Math.round(waterNeededMm * (efficiency === 0.9 ? 8 : efficiency === 0.75 ? 12 : 6));
    decision = `Deficit of ${deficit.toFixed(1)} mm water over 3 days. Irrigate for approx ${minutes} mins using ${irrigationType} to apply ${waterNeededMm.toFixed(1)} mm water.`;
    if (normSoil.includes('clay')) {
      decision += ' Avoid waterlogging in clayey soils.';
    } else if (normSoil.includes('sand')) {
      decision += ' Apply light and frequent irrigation.';
    }
  }

  return { decision, waterNeededMm };
};

export const generateSmartAdvisory = async (
  profile: FarmerProfileDetails
): Promise<{ advisory: StructuredAdvisory; weather: any }> => {
  // 1. Fetch live weather and forecast details
  const weatherData = await fetchWeatherForecastForDistrict(profile.district);
  const currentTemp = weatherData.current.temp;
  const forecastRainSum = weatherData.forecast.slice(0, 3).reduce((acc, curr) => acc + curr.rainSum, 0);

  // 2. Deterministic Irrigation Engine
  const irrigationCalculation = calculateIrrigationDecision(
    profile.crop,
    profile.stage,
    profile.soil,
    profile.irrigation,
    currentTemp,
    forecastRainSum
  );

  // 3. Build structured contextual prompt for Gemini
  const prompt = `
  Generate a customized, smart agricultural advisory report in JSON format for a farmer with this profile:
  - State: ${profile.state}
  - District: ${profile.district} (Block: ${profile.block}, Village: ${profile.village})
  - Crop: ${profile.crop}
  - Growth Stage: ${profile.stage}
  - Soil Type: ${profile.soil}
  - Irrigation Method: ${profile.irrigation}
  
  CURRENT LIVE WEATHER:
  - Temperature: ${currentTemp}°C
  - Wind Speed: ${weatherData.current.windspeed} km/h
  - Weather Description: ${weatherData.current.description}
  
  EXPECTED 3-DAY CUMULATIVE RAINFALL: ${forecastRainSum.toFixed(1)} mm
  
  DETERMINISTIC IRRIGATION RECOMMENDATION (EXPLAIN AND INCORPORATE THIS EXACTLY):
  - ${irrigationCalculation.decision}

  Please generate the response matching this schema exactly.
  You MUST translate all string values in the JSON (except the priority enum values 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL' and JSON keys) into the requested language preference: "${profile.language}" (use clear, simple Punjabi/Gurmukhi script if language is 'pa', Hindi/Devanagari if 'hi', or English if 'en').
  Do NOT include any markdown characters (no **, no ##, no ###, no ---, no \`\`) inside the text values. Make everything plain text.
  Keep sentences very short and simple. One instruction per card.

  JSON Schema to return:
  {
    "summary": "...",
    "priority": "LOW | MEDIUM | HIGH | CRITICAL",
    "weatherImpact": "...",
    "irrigation": "...",
    "cropCare": "...",
    "fertilizer": "...",
    "pestRisk": "...",
    "actions": [
      "...",
      "..."
    ],
    "warning": "...",
    "contactOfficer": false
  }
  `;

  // 4. Query LLM
  const messages: AIMessageInput[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const systemInstruction = `You are ARVA AI, a smart agricultural JSON api. You must only respond with raw JSON matching the requested schema. Do not enclose in markdown blocks. Do not add conversational text. Only valid JSON.`;
  const rawAdvisory = await queryOpenRouterGemini(messages, systemInstruction);

  let parsedAdvisory: StructuredAdvisory;
  try {
    let cleanJson = rawAdvisory.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    parsedAdvisory = JSON.parse(cleanJson);
    // Validate schema
    advisorySchema.parse(parsedAdvisory);
  } catch (err) {
    console.error('Failed to parse Gemini structured advisory JSON. Using fallback.', rawAdvisory);
    // Fallback advisory based on language
    const lang = profile.language;
    parsedAdvisory = {
      summary: lang === 'pa' ? 'ਮੌਸਮ ਅਨੁਸਾਰ ਅਨੁਕੂਲ ਸਲਾਹ।' : lang === 'hi' ? 'मौसम के अनुसार सलाह।' : 'General crop advisory updated.',
      priority: 'MEDIUM',
      weatherImpact: lang === 'pa' ? 'ਮੌਸਮ ਆਮ ਹੈ।' : lang === 'hi' ? 'मौसम सामान्य है।' : `Weather is currently ${weatherData.current.description}`,
      irrigation: irrigationCalculation.decision,
      cropCare: lang === 'pa' ? 'ਫਸਲ ਦੀ ਸਹੀ ਦੇਖਭਾਲ ਕਰੋ।' : lang === 'hi' ? 'फसल की देखभाल करें।' : 'Monitor crop growth closely.',
      fertilizer: lang === 'pa' ? 'ਨਾਈਟ੍ਰੋਜਨ ਯੂਰੀਆ ਸਿਫਾਰਸ਼ ਅਨੁਸਾਰ ਪਾਓ।' : lang === 'hi' ? 'उर्वरक का उपयोग करें।' : 'Apply standard fertilizer doses.',
      pestRisk: lang === 'pa' ? 'ਕੀੜਿਆਂ ਦਾ ਖਤਰਾ ਘੱਟ ਹੈ।' : lang === 'hi' ? 'कीटों का जोखिम कम है।' : 'Low risk of immediate pests.',
      actions: [
        irrigationCalculation.decision,
        lang === 'pa' ? 'ਖੇਤ ਦਾ ਨਿਰੀਖਣ ਕਰੋ।' : lang === 'hi' ? 'खेत का निरीक्षण करें।' : 'Regularly inspect field coordinates.'
      ],
      warning: '',
      contactOfficer: false
    };
  }

  return {
    advisory: parsedAdvisory,
    weather: weatherData.current,
  };
};
