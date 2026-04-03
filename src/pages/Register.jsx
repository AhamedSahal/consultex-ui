import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const platformFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'HR Agents',
    desc: 'AI-powered agents for recruitment, onboarding, and employee support.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Job Descriptions',
    desc: 'Generate and manage JDs with smart templates and workflows.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Integrations',
    desc: 'Connect with external systems and streamline your HR stack.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    desc: 'Insights and dashboards to drive better people decisions.',
  },
];

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-shadow';

function Register() {
  const { login: setAuth } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      setAuth(data.user, data.accessToken);
      navigate('/', { replace: true });
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-stone-100">
      <div className="flex flex-1 min-h-0 w-full flex-col lg:flex-row">
        {/* Left: Platform / advertisement - same as login */}
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-auto bg-gradient-to-br from-brand-orange-light via-white to-amber-50/80 p-8 md:p-12 lg:p-16">
          <div className="relative w-full max-w-xl">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-logo-gradient">
                Consultex AI
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-md">
                Smarter HR operations powered by AI. One platform for agents, job descriptions, integrations, and insights.
              </p>
              <ul className="space-y-6">
                {platformFeatures.map((f) => (
                  <li key={f.title} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/90 shadow-sm border border-slate-100 flex items-center justify-center text-brand-orange">
                      {f.icon}
                    </span>
                    <div>
                      <strong className="block text-slate-800 font-semibold mb-1">{f.title}</strong>
                      <span className="text-sm text-slate-600 leading-snug">{f.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-10 pt-8 border-t border-slate-200/80 text-sm text-slate-500">
                Join teams that use Consultex AI to save time and improve outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Registration form */}
        <div className="w-full flex-shrink-0 flex items-center justify-center bg-white lg:border-l border-slate-200/60 shadow-xl lg:w-[480px] xl:w-[520px] p-8 md:p-12 overflow-auto">
          <div className="w-full max-w-sm my-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-8">Create Account</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-70 transition-colors"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand-orange hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
