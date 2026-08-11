import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, CheckCircle, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2">
          <div className="bg-emerald-600 p-2.5 rounded-2xl text-amber-100 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-800">ARVA</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
          Reset your password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#fdfbf7] py-8 px-4 border border-stone-200 shadow-md sm:rounded-3xl sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center bg-emerald-100 p-3 rounded-full text-emerald-700">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">Request Received</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                If the email <span className="font-semibold">{email}</span> exists in our system, we've sent reset instructions to it.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <p className="text-stone-600 text-sm leading-relaxed">
                Enter the email address associated with your ARVA profile. We'll send you a link to reset your password.
              </p>
              
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer"
                >
                  Send Reset Link
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Cancel and go back
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
