import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Upload,
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle,
  MessageSquare,
  FileText
} from 'lucide-react';

interface AnalysisResult {
  suspectedDisease: string;
  confidence: number;
  observedSymptoms: string[];
  possibleCauses: string[];
  recommendedNextSteps: string[];
  preventionGuidance: string[];
  expertVerificationNeeded: boolean;
}

export const ImageDetection: React.FC = () => {
  const navigate = useNavigate();

  // Inputs
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [symptoms, setSymptoms] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // States
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file only');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysis(null);
      setImageUrl(null);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Please upload a leaf/crop image first');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('cropType', selectedCrop);
    formData.append('symptoms', symptoms);

    try {
      const res = await api.post('/ai/analyze-crop', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { imageUrl: uploadedUrl, analysis: result } = res.data.data;
      setImageUrl(uploadedUrl);
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Crop analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!analysis || !imageUrl) return;
    setEscalating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post('/ai/escalate', {
        cropType: selectedCrop,
        imageAnalysisUrl: imageUrl,
        aiDiagnosis: analysis.suspectedDisease,
        aiConfidence: String(analysis.confidence),
        farmerNotes: symptoms || 'Submitted via image detection portal.',
      });

      setSuccessMsg('This crop case has been escalated to your designated block Agriculture Officer. They will review it shortly.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Escalation failed. Verify you have a designated Agriculture Officer.');
    } finally {
      setEscalating(false);
    }
  };

  const handleAskARVA = () => {
    if (!analysis) return;
    const prefill = `I ran an image diagnosis for my ${selectedCrop} crop. The AI suspected: "${analysis.suspectedDisease}" with ${(analysis.confidence * 100).toFixed(0)}% confidence. Observed symptoms: ${analysis.observedSymptoms.join(', ')}. Can you help me understand the possible causes and treatment options in detail?`;
    navigate('/farmer/assistant', { state: { prefilledMessage: prefill } });
  };

  return (
    <main className="max-w-5xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      <div className="bg-[#ffffff] border border-stone-200 shadow-xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-stone-50 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Crop Disease & Pest Detection</h1>
          <p className="text-emerald-100/90 text-sm mt-1">
            Upload leaf photos to instantly run Gemini AI diagnostic models, identify pests, and get treatment advices.
          </p>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleAnalyze} className="space-y-5">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Analysis Parameters</h3>

            <div>
              <label className="block text-xs font-bold text-stone-600">Select Crop Category</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="Wheat">Wheat (Kanak)</option>
                <option value="Paddy">Rice (Dhan/Paddy)</option>
                <option value="Maize">Maize (Makki)</option>
                <option value="Cotton">Cotton (Narma)</option>
                <option value="Sugarcane">Sugarcane (Ganna)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600">Describe Symptoms (Optional)</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
                placeholder="Describe leaf yellowing, spots, holes, sticky secretions, or details..."
                className="mt-1 block w-full px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Photo Upload area */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Upload Leaf Photo</label>
              <div className="relative border-2 border-dashed border-stone-350 hover:border-emerald-500 bg-[#faf9f5] rounded-2xl p-6 text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {imagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Crop leaf preview"
                      className="max-h-[160px] mx-auto rounded-xl border border-stone-200 object-cover shadow-sm"
                    />
                    <p className="text-[10px] text-stone-500 font-bold">Click or drag another image to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-stone-100 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-stone-500 group-hover:text-emerald-700 group-hover:bg-emerald-100 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-stone-700">Select crop image files</p>
                    <p className="text-[10px] text-stone-400 font-semibold">Supports leaf spots, blight, or pest damage photos up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !imageFile}
              className="w-full py-3 border border-transparent rounded-xl shadow-md text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-755 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>Analyze Leaf Image</span>
            </button>
          </form>

          {/* Results display */}
          <div className="space-y-5">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-200 pb-2">Analysis Results</h3>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm animate-pulse">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
                <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {analysis ? (
              <div className="space-y-4">
                <div className="bg-[#faf9f5] border border-stone-200 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Suspected Diagnosis</span>
                      <h4 className="text-lg font-extrabold text-stone-900 leading-tight">
                        {analysis.suspectedDisease}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Confidence</span>
                      <span className="block text-base font-extrabold text-emerald-700">
                        {(analysis.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {analysis.expertVerificationNeeded && (
                    <div className="bg-amber-50 border border-amber-250 p-3 rounded-xl flex items-start space-x-2 text-[11px] font-bold text-amber-800">
                      <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>Warning: AI confidence is low or disease is critical. Manual officer verification is highly recommended.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Observed Symptoms</h5>
                    <ul className="list-disc list-inside text-xs text-stone-600 mt-1 space-y-1">
                      {analysis.observedSymptoms.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Possible Causes</h5>
                    <ul className="list-disc list-inside text-xs text-stone-600 mt-1 space-y-1">
                      {analysis.possibleCauses.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Recommended Next Steps</h5>
                    <ul className="list-disc list-inside text-xs text-stone-600 mt-1 space-y-1">
                      {analysis.recommendedNextSteps.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Prevention Guidance</h5>
                    <ul className="list-disc list-inside text-xs text-stone-600 mt-1 space-y-1">
                      {analysis.preventionGuidance.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    onClick={handleAskARVA}
                    className="py-2.5 border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-stone-500" />
                    <span>Ask ARVA AI</span>
                  </button>
                  <button
                    onClick={handleEscalate}
                    disabled={escalating}
                    className="py-2.5 border border-transparent text-stone-50 bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {escalating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 text-amber-300" />}
                    <span>Submit to Officer</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-stone-300 rounded-3xl p-12 text-center text-stone-400 flex flex-col items-center justify-center space-y-2 h-[400px]">
                <FileText className="w-8 h-8 text-stone-300" />
                <p className="text-xs font-bold">No Analysis Performed Yet</p>
                <p className="text-[10px] max-w-[200px] leading-relaxed">
                  Provide crop details and upload a photo on the left panel to trigger the AI diagnostic models.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ImageDetection;
