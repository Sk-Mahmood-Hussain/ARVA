import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Home, AlertTriangle } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 text-center font-sans">
      <div className="bg-amber-100 p-4 rounded-3xl text-amber-700 mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      
      <p className="text-stone-600 max-w-md mb-8 leading-relaxed font-medium">
        Sorry, the page you are looking for does not exist or has been moved. Use the button below to return to safety.
      </p>
      
      <Link
        to="/"
        className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-bold px-6 py-3 rounded-full text-sm shadow-md hover:shadow-emerald-200 transition-all cursor-pointer"
      >
        <Home className="w-4 h-4 mr-2" />
        Return to Home
      </Link>
      
      <div className="mt-16 flex items-center space-x-2 text-stone-400 text-sm">
        <Sprout className="w-5 h-5 text-stone-300" />
        <span>ARVA Smart Crop Advisory</span>
      </div>
    </div>
  );
};

export default NotFound;
