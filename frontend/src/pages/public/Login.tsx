import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Sprout, AlertCircle, Loader2 } from 'lucide-react';

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

declare global {
  interface Window {
    google: any;
  }
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  // Handle traditional Login
  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data.data;
      
      login(token, user);

      // Route dynamically based on user role
      if (from) {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'OFFICER') navigate('/officer');
        else navigate('/farmer');
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google OAuth Success Callback
  const handleGoogleResponse = async (response: any) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const res = await api.post('/auth/google', {
        idToken: response.credential,
        role: 'FARMER', // Default role for new google signups
      });
      const { token, user } = res.data.data;
      
      login(token, user);
      
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'OFFICER') navigate('/officer');
      else navigate('/farmer');
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Google Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize Google Sign-in button
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: '384438798941-q4u6g02346nn8ptctqtfogvgovjgmp1b.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
      } else {
        // Retry if script has not finished loading
        setTimeout(initializeGoogleSignIn, 500);
      }
    };

    initializeGoogleSignIn();
  }, []);

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
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Or{' '}
          <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
            register a new profile
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#fdfbf7] py-8 px-4 border border-stone-200 shadow-md sm:rounded-3xl sm:px-10">
          {/* API Error Message */}
          {apiError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl flex items-start space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-stone-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300`}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-stone-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-stone-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-stone-50 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-55 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-1.5" />
                ) : null}
                Sign In
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#fdfbf7] text-stone-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <div className="mt-6 flex justify-center">
              <div id="google-login-btn" className="w-full min-h-[40px] flex justify-center"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
