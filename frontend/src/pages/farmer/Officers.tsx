import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OfficerDetail {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  status: string;
  designation?: string;
  qualification?: string;
  callingTime?: string;
  department?: string;
  experience?: string;
  availability?: string;
}

export const Officers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [officers, setOfficers] = useState<OfficerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Expanded officer details states (for showing history & ratings)
  const [expandedOfficerId, setExpandedOfficerId] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Review Form States
  const [ratingOfficerId, setRatingOfficerId] = useState<string | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Appointment Form States
  const [bookingOfficerId, setBookingOfficerId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState('');
  const [apptReason, setApptReason] = useState('');
  const [submittingAppt, setSubmittingAppt] = useState(false);

  // Report Form States
  const [reportOfficerId, setReportOfficerId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchProfileAndOfficers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/farmers/profile');
      const profile = res.data?.data;
      if (profile && profile.region?.officers) {
        const mapped = profile.region.officers.map((off: any) => ({
          id: off.user.id,
          name: off.user.name,
          email: off.user.email,
          phoneNumber: off.user.phoneNumber,
          profilePictureUrl: off.user.profilePictureUrl,
          status: off.user.status,
          designation: off.designation,
          qualification: off.qualification,
          callingTime: off.callingTime,
          department: off.department,
          experience: off.experience,
          availability: off.availability,
        }));
        setOfficers(mapped);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load mapped officers directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndOfficers();
  }, []);

  const handleToggleExpand = async (officerId: string) => {
    if (expandedOfficerId === officerId) {
      setExpandedOfficerId(null);
      return;
    }

    setExpandedOfficerId(officerId);
    setLoadingHistory(true);
    try {
      const res = await api.get('/ai/cases');
      const allCases = res.data.data;
      const history = allCases.filter((c: any) => c.officerId === officerId);
      setConsultations(history);
    } catch (err) {
      console.error('Failed to load consultation history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent, officerId: string) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.post(`/farmers/officers/${officerId}/reviews`, {
        rating: ratingVal,
        reviewText: reviewText.trim() ? reviewText : undefined,
      });
      alert('Thank you! Your feedback review has been submitted successfully.');
      setRatingOfficerId(null);
      setReviewText('');
      setRatingVal(5);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent, officerId: string) => {
    e.preventDefault();
    if (!apptDate || !apptReason.trim()) return;
    setSubmittingAppt(true);
    try {
      // In the database, appointments require date and reason
      await api.post('/appointments', {
        date: apptDate,
        reason: apptReason,
        // The API automatically maps designated officer or takes selected
        officerId,
      });
      alert('Consultation slot request submitted! The officer has been notified.');
      setBookingOfficerId(null);
      setApptDate('');
      setApptReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request consultation slot.');
    } finally {
      setSubmittingAppt(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent, officerId: string) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await api.post('/requests/ban', {
        targetUserId: officerId,
        reason: reportReason,
      });
      alert('Your report case has been submitted. The Administrator will review details.');
      setReportOfficerId(null);
      setReportReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mb-2" />
        <span className="text-stone-500 font-semibold text-sm">Syncing regional block officers...</span>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
          <Shield className="text-emerald-700 w-8 h-8" />
          {user?.language === 'pa' ? 'ਬਲਾਕ ਖੇਤੀਬਾੜੀ ਅਧਿਕਾਰੀ' : user?.language === 'hi' ? 'ब्लॉक कृषि अधिकारी' : 'Your Block Agriculture Officers'}
        </h1>
        <p className="text-stone-500 text-xs font-semibold mt-1">
          {user?.language === 'pa'
            ? 'ਤੁਹਾਡੇ ਪਿੰਡ ਅਤੇ ਬਲਾਕ ਖੇਤਰ ਵਿੱਚ ਤਾਇਨਾਤ ਅਧਿਕਾਰੀਆਂ ਦੀ ਸੂਚੀ।'
            : user?.language === 'hi'
            ? 'आपके गाँव और ब्लॉक क्षेत्र में तैनात अधिकारियों की सूची।'
            : 'Designated agricultural development officers assigned to your village region.'}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 text-sm font-semibold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Officers List */}
      <div className="space-y-6">
        {officers.map((officer) => (
          <div key={officer.id} className="bg-white border border-stone-250 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6">
            {/* Main Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0">
                  {officer.profilePictureUrl ? (
                    <img src={officer.profilePictureUrl} alt={officer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <UserIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">{officer.name}</h3>
                  <p className="text-xs text-emerald-800 font-bold">{officer.designation || 'Block Agriculture Officer'}</p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase mt-0.5">{officer.department || 'Department of Agriculture'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${officer.phoneNumber || ''}`}
                  className="px-3.5 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-750 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" /> Call
                </a>
                <a
                  href={`mailto:${officer.email}`}
                  className="px-3.5 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-750 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-700" /> Email
                </a>
                <button
                  onClick={() => navigate('/farmer/assistant')}
                  className="px-3.5 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-750 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Chat
                </button>
                <button
                  onClick={() => setBookingOfficerId(officer.id)}
                  className="px-3.5 py-1.5 border border-transparent bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-200" /> Book slot
                </button>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t border-stone-150 pt-4 text-xs font-semibold text-stone-700">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Calling Hours: <strong className="text-stone-900">{officer.callingTime || '9:00 AM - 5:00 PM'}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Availability: <strong className="text-stone-900">{officer.availability || 'Available'}</strong></span>
              </div>
              <div>
                <span>Qualification: <strong className="text-stone-900">{officer.qualification || 'B.Sc Agriculture'}</strong></span>
              </div>
              <div>
                <span>Experience: <strong className="text-stone-900">{officer.experience || 'Not specified'}</strong></span>
              </div>
            </div>

            {/* Toggle History & Reviews block */}
            <div className="pt-2">
              <button
                onClick={() => handleToggleExpand(officer.id)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                {expandedOfficerId === officer.id ? (
                  <>
                    <ChevronUp className="w-4 h-4" /> Hide History & Rating Options
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" /> View History & Rating Options
                  </>
                )}
              </button>

              {expandedOfficerId === officer.id && (
                <div className="mt-4 border-t border-stone-150 pt-4 space-y-6">
                  {/* Reviews & Reporting buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setRatingOfficerId(officer.id)}
                      className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> Rate & Review Officer
                    </button>
                    <button
                      onClick={() => setReportOfficerId(officer.id)}
                      className="px-4 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-600" /> Report Officer to Admin
                    </button>
                  </div>

                  {/* Consultation History */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-850 uppercase tracking-wide">Consultation Diagnostics History</h4>
                    {loadingHistory ? (
                      <div className="flex items-center text-xs text-stone-400 space-x-1.5 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Fetching cases...</span>
                      </div>
                    ) : consultations.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {consultations.map((h) => (
                          <div key={h.id} className="p-3.5 border border-stone-200 rounded-2xl bg-stone-50/50 text-[11px] font-semibold space-y-1">
                            <div className="flex justify-between font-bold text-stone-800">
                              <span>Crop: {h.cropType}</span>
                              <span className="text-stone-400">{new Date(h.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-stone-600 font-medium">Diagnosis: {h.aiDiagnosis}</p>
                            {h.officerFeedback ? (
                              <p className="text-emerald-800 font-bold bg-emerald-50 p-2 rounded-xl mt-1.5 border border-emerald-100">
                                Officer Verification: {h.officerFeedback}
                              </p>
                            ) : (
                              <p className="text-stone-400 italic mt-1 bg-stone-100 p-1 rounded">Verification pending from officer...</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic">No historical crop diagnostic escalations are logged with this officer.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {officers.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-stone-300 rounded-3xl bg-white space-y-2">
            <UserIcon className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-extrabold text-stone-800 text-sm">No Officers Assigned</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No agricultural development officers have been registered under your village region. Ensure your profile village coordinates are up to date.
            </p>
          </div>
        )}
      </div>

      {/* RATING REVIEW MODAL */}
      {ratingOfficerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-stone-250 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Rate Agriculture Officer</h3>
              <button onClick={() => setRatingOfficerId(null)} className="p-1 text-emerald-100 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => handleReviewSubmit(e, ratingOfficerId)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">Select Rating Stars</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingVal(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-8 h-8 ${star <= ratingVal ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Feedback Comments (Optional)</label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share details of your consultation experience..."
                  className="w-full p-3 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-stone-50"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingReview ? 'Submitting...' : 'Submit Feedback Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT BOOKING MODAL */}
      {bookingOfficerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-stone-250 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Request Consultation Slot</h3>
              <button onClick={() => setBookingOfficerId(null)} className="p-1 text-emerald-100 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => handleBookingSubmit(e, bookingOfficerId)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Select Consultation Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-xs bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Reason for consultation slot request</label>
                <textarea
                  rows={3}
                  required
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                  placeholder="Explain symptoms, disease issues, or guidance requirements..."
                  className="w-full p-3 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-stone-50"
                />
              </div>
              <button
                type="submit"
                disabled={submittingAppt}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingAppt ? 'Scheduling...' : 'Request Appointment Slot'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportOfficerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-stone-250 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-700 to-red-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Report Agricultural Officer</h3>
              <button onClick={() => setReportOfficerId(null)} className="p-1 text-red-100 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => handleReportSubmit(e, reportOfficerId)} className="p-6 space-y-4">
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-[10px] text-red-800 font-bold leading-relaxed">
                ⚠️ Warning: Only report officers for lack of availability, wrong guidance, or out-of-jurisdiction issues. Reviews are logged permanently.
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Reason for reporting this officer</label>
                <textarea
                  rows={4}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe details of the issue..."
                  className="w-full p-3 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-stone-50"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReport}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingReport ? 'Submitting Report...' : 'Submit Report case to Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Officers;
