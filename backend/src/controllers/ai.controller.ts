import { Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { queryOpenRouterGemini, AIMessageInput } from '../services/ai.service';
import { generateSmartAdvisory } from '../services/advisory.service';
import { createNotification } from '../services/notification.service';
import { Role, CaseStatus } from '@prisma/client';
import { uploadToCloudinary } from '../config/cloudinary';
import { env } from '../config/env';

export const startOrContinueChat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { conversationId, message } = req.body;

  if (!message && !req.file) {
    return next(new AppError('Message or crop image attachment is required', 400));
  }

  try {
    let conversation;

    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId: req.user.id },
      });
      if (!conversation) {
        return next(new AppError('Conversation not found', 404));
      }
    } else {
      const title = message ? (message.substring(0, 30) + '...') : 'Image Analysis';
      conversation = await prisma.aIConversation.create({
        data: {
          userId: req.user.id,
          title,
        },
      });
    }

    // Load past messages
    const pastMessages = await prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    // Handle Image Upload if present
    let imageUrl: string | undefined = undefined;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, 'arva_ai_analysis');
    }

    // Format for Gemini API
    const formattedMessages: AIMessageInput[] = [];

    // Add conversation history
    for (const msg of pastMessages) {
      formattedMessages.push({
        role: msg.sender === Role.FARMER ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current user message
    if (imageUrl) {
      formattedMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Please analyze this crop leaf image for any visible disease or pest damage. Identify the symptoms, crop safety levels, and indicate if I should escalate this for expert verification.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else {
      formattedMessages.push({
        role: 'user',
        content: message,
      });
    }

    // Query Gemini
    const aiReply = await queryOpenRouterGemini(formattedMessages);

    // Save messages in database
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        sender: Role.FARMER,
        content: message || 'Image Attachment sent.',
        imageUrl,
      },
    });

    const savedAiMsg = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        sender: Role.ADMIN, // Storing AI responses as ADMIN/SYSTEM role
        content: aiReply,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        conversationId: conversation.id,
        reply: aiReply,
        imageUrl,
        messageId: savedAiMsg.id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const list = await prisma.aIConversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

export const getConversationDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id, userId: req.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    await prisma.aIConversation.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Conversation history deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getAdvisory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== Role.FARMER) {
    return next(new AppError('Only farmers can generate crop advisories', 403));
  }

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      include: { region: true },
    });

    if (!profile) {
      return next(new AppError('Farmer profile onboarding not completed yet.', 400));
    }

    const advisoryData = await generateSmartAdvisory({
      crop: profile.primaryCrop,
      stage: profile.cropGrowthStage,
      soil: profile.soilType,
      irrigation: profile.irrigationType,
      village: profile.region.village,
      block: profile.region.block,
      district: profile.region.district,
      state: profile.region.state,
      language: (req.user as any).language || 'en',
    });

    res.status(200).json({
      status: 'success',
      data: advisoryData,
    });
  } catch (err) {
    next(err);
  }
};

export const escalateCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== Role.FARMER) {
    return next(new AppError('Only farmers can escalate crop cases to officers', 403));
  }

  const { cropType, imageAnalysisUrl, aiDiagnosis, aiConfidence, farmerNotes } = req.body;

  if (!cropType || !aiDiagnosis) {
    return next(new AppError('Crop type and AI diagnosis details are required for escalation', 400));
  }

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      select: { assignedOfficerId: true },
    });

    if (!profile || !profile.assignedOfficerId) {
      return next(new AppError('You must have a designated Agriculture Officer to submit case escalations', 400));
    }

    const newCase = await prisma.diseaseCase.create({
      data: {
        farmerId: req.user.id,
        officerId: profile.assignedOfficerId,
        cropType,
        imageAnalysisUrl: imageAnalysisUrl || null,
        aiDiagnosis,
        aiConfidence: parseFloat(aiConfidence || '0.90'),
        farmerNotes: farmerNotes || null,
        status: CaseStatus.PENDING,
      },
    });

    await createNotification(
      profile.assignedOfficerId,
      'New Escalated Case',
      `Farmer ${req.user.name} has submitted a crop case for verification.`,
      'DISEASE',
      newCase.id
    );

    res.status(201).json({
      status: 'success',
      data: newCase,
    });
  } catch (err) {
    next(err);
  }
};

export const getEscalatedCases = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    let whereClause: any = {};
    if (req.user.role === Role.FARMER) {
      whereClause.farmerId = req.user.id;
    } else if (req.user.role === Role.OFFICER) {
      whereClause.officerId = req.user.id;
    }

    const cases = await prisma.diseaseCase.findMany({
      where: whereClause,
      include: {
        farmer: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        officer: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: cases,
    });
  } catch (err) {
    next(err);
  }
};

export const provideFeedbackOnCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== Role.OFFICER) {
    return next(new AppError('Only agriculture officers can provide case feedback', 403));
  }

  const { id } = req.params;
  const { officerFeedback } = req.body;

  if (!officerFeedback) {
    return next(new AppError('Officer verification feedback content is required', 400));
  }

  try {
    const existing = await prisma.diseaseCase.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new AppError('Escalated crop case not found', 404));
    }

    if (existing.officerId !== req.user.id) {
      return next(new AppError('Forbidden: You can only review cases assigned to you', 403));
    }

    const updated = await prisma.diseaseCase.update({
      where: { id },
      data: {
        officerFeedback,
        status: CaseStatus.RESOLVED,
      },
    });

    await createNotification(
      existing.farmerId,
      'Crop Case Resolved',
      `Officer ${req.user.name} has provided verification feedback on your crop case.`,
      'DISEASE',
      id
    );

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const checkAIHealth = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const hasKey = !!env.GEMINI_API_KEY;
    const modelName = env.GEMINI_MODEL || 'gemini-3.6-flash';
    
    let apiStatus = 'unknown';
    let errorMessage = null;
    
    if (hasKey) {
      try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('ping');
        const response = await result.response;
        if (response.text()) {
          apiStatus = 'healthy';
        }
      } catch (err: any) {
        apiStatus = 'unhealthy';
        errorMessage = err.message || 'Error connecting to Gemini API';
      }
    } else {
      apiStatus = 'missing_key';
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        configured: hasKey,
        model: modelName,
        status: apiStatus,
        error: errorMessage,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const analyzeCropImage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { cropType, symptoms } = req.body;
  if (!req.file) {
    return next(new AppError('An image file is required for crop analysis', 400));
  }

  try {
    const imageUrl = await uploadToCloudinary(req.file.buffer, 'arva_disease_detection');
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: `You are the ARVA AI Crop Disease Diagnostic System. Your purpose is to analyze crop leaf images and provide structured, accurate diagnoses.
      
      You must respond in clean, raw JSON matching the following structure exactly. Do not wrap the JSON output in markdown codeblocks (no \`\`\`json).
      
      {
        "suspectedDisease": "Name of the disease (both common and scientific/punjabi name if applicable)",
        "confidence": 0.95, // numerical value between 0.0 and 1.0
        "observedSymptoms": ["symptom 1", "symptom 2"],
        "possibleCauses": ["cause 1", "cause 2"],
        "recommendedNextSteps": ["step 1", "step 2"],
        "preventionGuidance": ["prevention 1", "prevention 2"],
        "expertVerificationNeeded": true // boolean: true if confidence is low or disease is critical
      }`,
    });

    const promptText = `Analyze this leaf image of a ${cropType || 'unknown'} crop. Symptoms described by farmer: ${symptoms || 'none'}.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const rawText = response.text() || '{}';
    
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini JSON response:', cleanJson);
      parsedResult = {
        suspectedDisease: 'Unknown Disease / Unable to analyze',
        confidence: 0.0,
        observedSymptoms: ['Unable to read symptoms'],
        possibleCauses: ['Image unclear or invalid'],
        recommendedNextSteps: ['Retake the photo under better lighting', 'Escalate to an Officer for manual review'],
        preventionGuidance: ['Ensure good agricultural practices'],
        expertVerificationNeeded: true,
      };
    }

    res.status(200).json({
      status: 'success',
      data: {
        imageUrl,
        analysis: parsedResult,
      },
    });
  } catch (err) {
    next(err);
  }
};
