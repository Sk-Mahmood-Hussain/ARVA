import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  Shield,
  Sprout,
  ArrowUpRight
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'FARMER' | 'ADMIN' | 'SYSTEM';
  content: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export const Assistant: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // States
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);

  // Speech APIs
  const [isListening, setIsListening] = useState(false);
  const [speechActiveId, setSpeechActiveId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load conversations initially
  const loadConversations = async () => {
    try {
      const res = await api.get('/ai/conversations');
      setConversations(res.data.data);
      if (res.data.data.length > 0 && !activeConvId) {
        setActiveConvId(res.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const loadDetails = async () => {
      setLoadingMsgs(true);
      try {
        const res = await api.get(`/ai/conversations/${activeConvId}`);
        setMessages(res.data.data.messages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMsgs(false);
      }
    };
    loadDetails();
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;

      // Set lang based on farmer preference
      if (user?.language === 'hi') {
        rec.lang = 'hi-IN';
      } else if (user?.language === 'pa') {
        rec.lang = 'pa-IN';
      } else {
        rec.lang = 'en-US';
      }

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText((prev) => prev + ' ' + text);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [user]);

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Text to Speech
  const handleSpeak = (textId: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speechActiveId === textId) {
        window.speechSynthesis.cancel();
        setSpeechActiveId(null);
        return;
      }
      
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`-]/g, ''); // strip markdown chars
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Set lang
      if (user?.language === 'hi') {
        utterance.lang = 'hi-IN';
      } else if (user?.language === 'pa') {
        utterance.lang = 'pa-IN';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => {
        setSpeechActiveId(null);
      };

      setSpeechActiveId(textId);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-Speech is not supported in your browser.');
    }
  };

  const handleCreateNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image attachments are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image exceeds the maximum size limit of 5MB.');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setSending(true);
    const msgText = inputText;
    setInputText('');

    try {
      const formData = new FormData();
      if (activeConvId) {
        formData.append('conversationId', activeConvId);
      }
      formData.append('message', msgText);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      setSelectedImage(null);
      setImagePreview(null);

      const res = await api.post('/ai/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newId = res.data.data.conversationId;
      if (!activeConvId) {
        setActiveConvId(newId);
        loadConversations();
      } else {
        // reload details
        const details = await api.get(`/ai/conversations/${activeConvId}`);
        setMessages(details.data.data.messages);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI assistant request failed.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation history?')) return;
    try {
      await api.delete(`/ai/conversations/${id}`);
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // Officer Escalation Flow
  const handleEscalateCase = async (msg: Message) => {
    setEscalating(true);
    try {
      // Prompt values
      const cropType = user?.language === 'hi' ? 'धान/गेंहू' : user?.language === 'pa' ? 'ਝੋਨਾ/ਕਣਕ' : 'Wheat/Paddy';
      const aiDiagnosis = msg.content;
      
      const payload = {
        cropType,
        imageAnalysisUrl: msg.imageUrl || '',
        aiDiagnosis,
        aiConfidence: 0.92,
        farmerNotes: 'Submitted via ARVA AI Assistant Case Escalation.',
      };

      await api.post('/ai/escalate', payload);
      alert('Your crop diagnostic case has been successfully escalated to your assigned Agriculture Officer! You will receive a notification once the officer provides feedback.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit case to officer.');
    } finally {
      setEscalating(false);
    }
  };

  const containsEscalationTrigger = (content: string): boolean => {
    return content.toLowerCase().includes('escalate') || 
           content.includes('uncertain') || 
           content.includes('ਅਧਿਕਾਰੀ') || 
           content.includes('अधिकारी') ||
           content.includes('officer');
  };

  return (
    <main className="max-w-6xl mx-auto py-2 px-2 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[75vh]">
        {/* Left conversations panel */}
        <div className="md:col-span-1 bg-[#ffffff] border border-stone-200 shadow-sm rounded-3xl p-4 flex flex-col space-y-4 max-h-[80vh] overflow-y-auto">
          <button
            onClick={handleCreateNewChat}
            className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Assistant Chat
          </button>

          <div className="flex-grow space-y-2 overflow-y-auto pr-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 px-2">History Log</span>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeConvId === conv.id
                    ? 'bg-emerald-600 border-emerald-500 text-stone-50'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div onClick={() => setActiveConvId(conv.id)} className="flex items-center space-x-2 flex-grow truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={() => handleDeleteChat(conv.id)}
                  className={`opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 ml-1 transition-opacity ${
                    activeConvId === conv.id ? 'text-emerald-100 hover:text-red-200' : 'text-stone-400'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {conversations.length === 0 && !loadingConv && (
              <p className="text-stone-400 text-center py-6 text-[10px] font-semibold">No persistent logs found.</p>
            )}
            {loadingConv && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            )}
          </div>
        </div>

        {/* Right chat interface */}
        <div className="md:col-span-3 bg-[#ffffff] border border-stone-200 shadow-sm rounded-3xl flex flex-col justify-between max-h-[80vh] relative overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-stone-200 bg-gradient-to-r from-emerald-800 to-[#064e3b] text-stone-50 flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="bg-emerald-600 p-2 rounded-xl text-amber-300">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">ARVA AI Smart Crop Advisor</h3>
                <span className="text-[10px] text-emerald-200 font-semibold block mt-0.5 uppercase tracking-widest">
                  Punjabi, Hindi & English crop advisory
                </span>
              </div>
            </div>
            <div className="bg-emerald-900/50 backdrop-blur-sm border border-emerald-700/30 px-3 py-1 rounded-full flex items-center space-x-1.5 text-[10px] font-bold">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Safety Verified</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#fdfbf7]/40">
            {messages.map((msg) => {
              const isUser = msg.sender === 'FARMER';
              const showEscalation = !isUser && containsEscalationTrigger(msg.content);
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  {/* Bubble */}
                  <div className="flex items-start space-x-2 max-w-[85%]">
                    {!isUser && (
                      <div className="bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg text-emerald-800 shrink-0">
                        <Sprout className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-3xl text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-emerald-600 text-stone-50 rounded-tr-none'
                          : 'bg-[#ffffff] border border-stone-200 text-stone-800 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="rounded-xl overflow-hidden mb-2.5 max-h-[180px] border border-stone-250">
                          <img src={msg.imageUrl} alt="uploaded visual" className="w-full object-cover" />
                        </div>
                      )}
                      <p>{msg.content}</p>

                      {/* Text-to-speech option */}
                      {!isUser && (
                        <div className="mt-2 pt-2 border-t border-stone-100 flex justify-end">
                          <button
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            className="inline-flex items-center space-x-1 text-[10px] text-emerald-800 font-extrabold hover:underline"
                          >
                            {speechActiveId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-red-600" />
                                <span>Stop Reading</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen Advice</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Escalation Banner if AI triggers uncertainty */}
                  {showEscalation && (
                    <div className="ml-8 mt-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl max-w-[80%] space-y-2 animate-pulse shadow-sm">
                      <div className="flex items-center space-x-2 text-xs font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Escalate crop diagnostics case for verification?</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        If the AI results are uncertain, you can escalate this case. Your assigned Agriculture Officer will review it.
                      </p>
                      <button
                        onClick={() => handleEscalateCase(msg)}
                        disabled={escalating}
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-stone-50 text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                      >
                        {escalating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-1" />}
                        Submit Case to Officer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {messages.length === 0 && !loadingMsgs && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto my-12 animate-fade-in">
                <div className="bg-emerald-50 p-4 rounded-full text-emerald-700 border border-emerald-100 shadow-inner">
                  <Sprout className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-850 text-base">ARVA Crop AI Advisory</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Ask weather-aware agricultural questions, upload leaf disease images for diagnosis, and escalate cases to crop experts in Punjabi, Hindi, or English.
                  </p>
                </div>
              </div>
            )}

            {loadingMsgs && (
              <div className="flex flex-col items-center justify-center h-full space-y-2 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-stone-400 text-xs font-bold">Synchronizing history...</span>
              </div>
            )}
          </div>

          {/* Chat Footer Input Area */}
          <div className="p-4 border-t border-stone-200 bg-[#ffffff]">
            {/* Image Preview attachment */}
            {imagePreview && (
              <div className="relative inline-block mb-3 bg-stone-50 p-1.5 border border-stone-200 rounded-xl">
                <img src={imagePreview} alt="crop visual attachment" className="w-16 h-16 object-cover rounded-lg" />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-stone-50 p-0.5 rounded-full hover:bg-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center space-x-2">
              <label className="p-2.5 border border-stone-300 hover:bg-stone-50 rounded-xl text-stone-500 transition-colors shrink-0 cursor-pointer">
                <ImageIcon className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-2.5 border rounded-xl transition-colors shrink-0 cursor-pointer ${
                  isListening
                    ? 'border-red-500 bg-red-50 text-red-600 animate-pulse'
                    : 'border-stone-300 hover:bg-stone-50 text-stone-500'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? 'Listening voice input...' : 'Ask crop query (English, Punjabi, Hindi)...'}
                className="flex-grow px-4 py-2.5 border border-stone-300 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !selectedImage)}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-stone-50 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Assistant;
