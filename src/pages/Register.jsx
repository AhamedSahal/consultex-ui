import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const platformFeatures = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'HR Agents',
    desc: 'AI agents for recruitment, onboarding, and employee support.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Job Descriptions',
    desc: 'Create structured, benchmarked JDs with smart workflows.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Integrations',
    desc: 'Connect HR systems and streamline operations.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    desc: 'Actionable insights for workforce decisions.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Paylense',
    desc: 'Compensation intelligence and pay benchmarking platform.',
  },
];

// TUSCAN CONSULTING logo: TUS black, CAN orange, CONSULTING black below
function TuscanLogo({ size = 'md' }) {
  const textSize = size === 'sm' ? 'text-lg' : 'text-2xl';
  const subSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]';
  return (
    <div className="flex flex-col items-start leading-none select-none">
      <div className={`${textSize} font-black tracking-tight`}>
        <span className="text-slate-900">TUS</span>
        <span className="text-brand-orange">CAN</span>
      </div>
      <div className={`${subSize} font-bold tracking-[0.18em] text-slate-900 uppercase mt-0.5`}>
        CONSULTING
      </div>
    </div>
  );
}

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      setRegistered(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      if (msg) setError(msg);
      else if (!err.response) setError('Unable to connect to the server. Check your connection or try again later.');
      else setError(`Registration failed (${err.response?.status || 'error'})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">

      {/* Left: Marketing / features panel */}
      <div className="hidden lg:flex flex-1 flex-col overflow-auto bg-gradient-to-br from-brand-orange-light via-white to-amber-50/80 p-12 xl:p-16 relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex flex-col h-full">
          {/* Centered content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight mb-3" style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Consultex AI
              </h1>
              <p className="text-sm text-slate-500 font-medium mb-0.5">An AI-powered HR platform by</p>
              <p className="text-sm font-bold text-brand-orange mb-8">Tuscan Consulting.</p>
              <p className="text-slate-600 leading-relaxed mb-10 text-sm">
                Smarter HR operations, powered by AI. One platform for job design, workforce intelligence, and hiring automation.
              </p>
              <ul className="space-y-5">
                {platformFeatures.map((f) => (
                  <li key={f.title} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/90 shadow-sm border border-slate-100 flex items-center justify-center text-brand-orange">
                      {f.icon}
                    </span>
                    <div>
                      <strong className="block text-slate-800 font-semibold text-sm mb-0.5">{f.title}</strong>
                      <span className="text-xs text-slate-500 leading-snug">{f.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="text-xs text-slate-400 pt-6 border-t border-slate-200/60">
            Trusted by HR leaders across the GCC. Built for enterprise HR transformation.
          </p>
        </div>
      </div>

      {/* Right: Register form panel */}
      <div className="w-full flex-shrink-0 flex flex-col lg:w-[480px] xl:w-[520px] bg-white border-l border-slate-100 shadow-xl overflow-auto">
        {/* Top logo bar */}
        <div className="flex flex-col items-center pt-10 pb-2 px-8">
          <TuscanLogo size="md" />
          <div className="text-[10px] tracking-[0.22em] font-semibold text-slate-400 uppercase mt-3">
            Consultex AI Platform
          </div>
          <div className="mt-5 w-px h-7 bg-slate-200" />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-6">
          <div className="w-full max-w-sm">
            {registered ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Account Created</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Your account is <strong className="text-slate-700">pending admin approval</strong>. You will receive access once an administrator activates your account.
                </p>
                <Link to="/login" className="inline-block mt-2 text-sm font-medium text-brand-orange hover:underline">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                {/* Avatar icon */}
                <div className="flex justify-center mb-5">
                  <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Create account</h2>
                <p className="text-sm text-slate-500 text-center mb-8">Join Consultex AI to get started</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        id="register-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-shadow"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-shadow"
                        placeholder="Enter your work email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-shadow"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-70 transition-colors mt-1"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>

                {/* Secure note */}
                <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Your account requires admin approval before access
                </div>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-brand-orange hover:underline">
                    Sign In
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="pb-6 px-8 text-center">
          <p className="text-xs text-slate-400">Secure, reliable, and built for enterprise HR teams.</p>
          <p className="text-xs text-slate-400 mt-0.5">© 2024 Tuscan Consulting. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}

export default Register;
