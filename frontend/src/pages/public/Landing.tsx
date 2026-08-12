import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Users, ArrowRight, CheckCircle, Navigation } from 'lucide-react';

export const Landing: React.FC = () => {
  // Hook up IntersectionObserver for dynamic scroll reveal effects
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col selection:bg-emerald-200">
      {/* Landing Header */}
      <nav className="sticky top-0 z-50 bg-[#faf7f2]/85 backdrop-blur-md border-b border-stone-200 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-amber-100 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-emerald-800">
            ARVA
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="text-stone-700 hover:text-emerald-700 font-semibold px-4 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-bold px-5 py-2.5 rounded-full shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Register Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-100/80 border border-emerald-200 px-4 py-1.5 rounded-full text-emerald-800 text-sm font-semibold tracking-wide">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>Smart Crop Advisory System for Punjab (SIH25010)</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Empowering Punjab's Farmers with <span className="text-emerald-700">AI-Smart Advisory</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-medium">
            Bridging the gap between farmers, location-assigned Agricultural Officers, and state-of-the-art AI crop disease detection for crop yield optimization.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-bold px-8 py-4 rounded-full text-base shadow-lg hover:shadow-emerald-300/30 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Get Started as Farmer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-[#f0e9dc] hover:bg-[#e9e1c7] text-stone-800 font-bold px-8 py-4 rounded-full text-base shadow-sm transition-colors border border-stone-300"
            >
              Officer Portal
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid (Scroll Reveal Effect) */}
        <div className="scroll-reveal mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-700 mb-6">
              <Sprout className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-3">AI Disease Detection</h3>
            <p className="text-stone-600 leading-relaxed">
              Upload crop images to immediately identify leaf disease, generate treatment advice, and submit verified reports to experts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="bg-amber-100 p-4 rounded-2xl text-amber-700 mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-3">Assigned Region Officers</h3>
            <p className="text-stone-600 leading-relaxed">
              Onboarding automatically maps your location (State, District, Block, Village) to the designated local Agricultural Officer for personal advisory.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="bg-blue-100 p-4 rounded-2xl text-blue-700 mb-6">
              <Navigation className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-3">Targeted Broadcast Alerts</h3>
            <p className="text-stone-600 leading-relaxed">
              Receive weather notifications, heavy rain alerts, pest notices, and localized advisories directly from your block officer.
            </p>
          </div>
        </div>
      </section>

      {/* Relational Section (Scroll Reveal Effect) */}
      <section className="scroll-reveal bg-[#f2ebd9] border-y border-stone-300 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
              A Structured Relational Ecosystem for Agriculture
            </h2>
            <p className="text-stone-700 leading-relaxed text-lg font-medium">
              ARVA enforces a strict Role-Based Access Control (RBAC) architecture to link all actions back to verified resources.
            </p>
            <ul className="space-y-3.5">
              {[
                'Farmers only interact with their designated local Agricultural Officer.',
                'Officers are restricted to managing farmers inside their assigned region.',
                'Admins retain total administrative controls for region parameters and user moderation.',
                'All disease diagnostics flow strictly as: Farmer → AI → Officer Verification → Farmer.'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-stone-700 font-medium">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-stone-300 shadow-md">
            <h3 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center">
              <Navigation className="w-6 h-6 mr-2" />
              Punjab Geographic Mapping
            </h3>
            <p className="text-stone-600 mb-6 leading-relaxed">
              We cover all core agricultural blocks and villages in Amritsar, Ludhiana, Patiala, and expanding to additional Punjab districts.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fcfbf9] border border-stone-200 p-4 rounded-2xl">
                <span className="block text-xs font-bold text-stone-400 uppercase">District</span>
                <span className="text-lg font-bold text-stone-800">Amritsar</span>
                <span className="block text-xs text-emerald-600 font-medium mt-1">Block: Ajnala</span>
              </div>
              <div className="bg-[#fcfbf9] border border-stone-200 p-4 rounded-2xl">
                <span className="block text-xs font-bold text-stone-400 uppercase">District</span>
                <span className="text-lg font-bold text-stone-800">Ludhiana</span>
                <span className="block text-xs text-emerald-600 font-medium mt-1">Block: Jagraon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section (Scroll Reveal Effect) */}
      <section className="scroll-reveal max-w-7xl mx-auto px-6 md:px-12 py-20 text-center space-y-6">
        <h2 className="text-3xl md:text-5xl font-bold text-stone-900">
          Ready to Enhance Punjab's Crop Advisor?
        </h2>
        <p className="text-stone-600 max-w-xl mx-auto text-lg">
          Join the Smart India Hackathon agricultural dashboard today. Explore active regions and verified farmer profiles.
        </p>
        <div className="pt-4">
          <Link
            to="/register"
            className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-bold px-8 py-4 rounded-full text-base shadow-lg hover:shadow-emerald-300/30 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      <footer className="mt-auto bg-[#f0e9dc] border-t border-stone-300 py-8 px-6 text-center text-stone-500 text-sm font-semibold">
        <p>© {new Date().getFullYear()} ARVA Agriculture Advisory Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
