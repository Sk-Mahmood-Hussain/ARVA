import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middlewares/error';

export class GeminiError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = 'GeminiError';
  }
}

// Agricultural Knowledge Base
const verifiedAgriKB = `
VERIFIED AGRICULTURAL KNOWLEDGE FOR PUNJAB (ARVA SAFETY LAYER):
1. Crop: Wheat (Kanak)
   - Major Disease: Yellow Rust (Peelee Kungi)
     * Symptoms: Yellow or orange pustules arranged in linear stripes on leaf surfaces. Common in cool, moist conditions in Punjab.
     * Treatment: Spray Propiconazole 25 EC @ 200 ml in 200 liters of water per acre. Ensure proper plant spacing.
2. Crop: Paddy (Dhan)
   - Major Disease: Root Rot / Bakanae
     * Symptoms: Yellowing of leaves, abnormal elongation of seedlings, root rot.
     * Treatment: Seed treatment with Trichoderma viride or Carbendazim. Maintain proper field drainage.
   - Major Disease: Rice Blast (Huldi Rog)
     * Symptoms: Diamond-shaped lesions with grey centers on leaves and neck rot.
     * Treatment: Spray Tricyclazole 75 WP @ 120g per acre in 200 liters of water.
3. Crop: Cotton (Narma)
   - Major Disease/Pest: Cotton Bollworm & Whitefly
     * Symptoms: Dropping of flowers, holes in cotton bolls, sticky leaves due to honeydew.
     * Treatment: Bt cotton seeds are recommended. For whitefly, spray Neem oil @ 1 liter per acre, or Imidacloprid 17.8 SL @ 40 ml/acre under supervision.
4. Crop: Sugarcane (Ganna)
   - Major Disease: Red Rot (Kanna Rog)
     * Symptoms: Reddish discolouration inside the split cane with white transverse bands, sour smell.
     * Treatment: Plant disease-free seed canes of resistant varieties like Co 0238 (with supervision). Drench soil with copper oxychloride.
5. Soil Types in Punjab:
   - Sandy (Retli): Low moisture retention. Needs frequent, light irrigation.
   - Loamy (Mera): Excellent for most crops (Wheat, Paddy). Moderate irrigation.
   - Clayey (Cheeka): High retention, prone to waterlogging. Needs deep drainage.
`;

export interface AIMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

const fetchImageAsBase64 = async (url: string): Promise<{ data: string; mimeType: string }> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const contentType = String(response.headers['content-type'] || 'image/jpeg');
  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  return { data: base64, mimeType: contentType };
};

const convertToGeminiMessages = async (messages: AIMessageInput[]) => {
  const contents: any[] = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      continue;
    }
    
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts: any[] = [];
    
    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'text') {
          parts.push({ text: item.text });
        } else if (item.type === 'image_url' && item.image_url?.url) {
          try {
            const { data, mimeType } = await fetchImageAsBase64(item.image_url.url);
            parts.push({
              inlineData: {
                data,
                mimeType
              }
            });
          } catch (err) {
            console.error('Failed to fetch image for Gemini:', err);
          }
        }
      }
    }
    
    contents.push({ role, parts });
  }
  
  return contents;
};

export const queryOpenRouterGemini = async (
  messages: AIMessageInput[],
  systemInstruction?: string
): Promise<string> => {
  const defaultSystem = `You are ARVA AI, a smart crop advisory assistant for farmers in Punjab.
  ${verifiedAgriKB}
  
  AI SAFETY INSTRUCTIONS:
  1. You must prioritize the verified agricultural knowledge listed above. Do not recommend unverified chemical formulas.
  2. If the user query is about crop diseases or pest identification and you are not 100% sure based on the local knowledge, you MUST clearly state: 'I am not fully certain about this diagnosis. I highly recommend requesting officer verification by clicking the "Escalate to Officer" button below.'
  3. If recommending chemical pesticides, always add a safety warning: 'Always read label instructions, wear protective gear, and consult your assigned Agriculture Officer before spraying.'
  4. Generate your response in the language chosen by the user (English, Hindi, or Punjabi). Provide simple, clear, actionable bullet points.`;

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: systemInstruction || defaultSystem,
    });

    const geminiMessages = await convertToGeminiMessages(messages);

    const result = await model.generateContent({
      contents: geminiMessages,
    });

    const response = await result.response;
    const reply = response.text();
    if (!reply) {
      throw new Error('No completion content returned from Gemini API');
    }

    return reply;
  } catch (err: any) {
    console.error('Gemini API call failed:', err);
    
    let status = 500;
    let userMessage = 'AI Assistant is currently busy. Please try again shortly.';
    const errMessage = err.message || '';
    const errStatus = err.status || err.response?.status;
    
    if (errStatus === 401 || errStatus === 403 || errMessage.includes('API key') || errMessage.includes('auth') || errMessage.includes('API_KEY_INVALID')) {
      status = 401;
      userMessage = 'Authentication failed with the AI Service. Please contact support or verify configuration.';
    } else if (errStatus === 429 || errMessage.includes('429') || errMessage.includes('Quota') || errMessage.includes('rate limit') || errMessage.includes('RESOURCE_EXHAUSTED')) {
      status = 429;
      userMessage = 'The AI service rate limit has been exceeded. Please wait a moment before trying again.';
    } else if (errStatus === 400 || errMessage.includes('400') || errMessage.includes('InvalidArgument') || errMessage.includes('blocked') || errMessage.includes('SAFETY')) {
      status = 400;
      userMessage = 'Invalid request parameters or input content was flagged by safety filters.';
    }
    
    throw new GeminiError(userMessage, status);
  }
};
