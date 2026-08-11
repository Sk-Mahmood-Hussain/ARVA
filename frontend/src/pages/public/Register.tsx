import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Sprout, AlertCircle, Loader2 } from 'lucide-react';
const registerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FARMER', 'OFFICER'] as const, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  language: z.string().min(1, 'Language is required'),
  phoneNumber: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'FARMER',
      language: 'en',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    setSubmitting(true);

    // Clean phone number: remove empty string
    const payload = {
      ...data,
      phoneNumber: data.phoneNumber === '' ? undefined : data.phoneNumber,
    };

    try {
      const response = await api.post('/auth/register', payload);
      const { token, user } = response.data.data;
      
      login(token, user);

      // Farmers go to onboarding first, Officers go directly to Officer shell
      if (user.role === 'FARMER') {
        navigate('/onboarding');
      } else {
        navigate('/officer');
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Registration failed. Try a different email.');
    } finally {
      setSubmitting(false);
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
          Create your portal profile
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Or{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            sign in to your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#fdfbf7] py-8 px-4 border border-stone-200 shadow-md sm:rounded-3xl sm:px-10">
          {apiError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl flex items-start space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-stone-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300"
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
                  {...register('password')}
                  className="appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-stone-700">
                Portal Role
              </label>
              <div className="mt-1">
                <select
                  id="role"
                  {...register('role')}
                  className="block w-full px-4 py-3 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300 cursor-pointer"
                >
                  <option value="FARMER">👨🌾 Farmer (Requires Onboarding)</option>
                  <option value="OFFICER">👨💼 Agriculture Officer</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.role.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-stone-700">
                Mobile Number <span className="text-stone-400 text-xs font-normal">(Optional)</span>
              </label>
              <div className="mt-1">
                <input
                  id="phoneNumber"
                  type="text"
                  placeholder="+919876543210"
                  {...register('phoneNumber')}
                  className="appearance-none block w-full px-4 py-3 border rounded-2xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300"
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-semibold text-stone-700">
                Preferred Language
              </label>
              <div className="mt-1">
                <select
                  id="language"
                  {...register('language')}
                  className="block w-full px-4 py-3 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-stone-50 border-stone-300 cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
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
                Register Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
