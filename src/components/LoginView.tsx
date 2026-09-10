"use client";

import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Key } from 'lucide-react';
import { User } from '../types';
import { setStoredSession } from '../lib/api';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onCancel: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      setStoredSession(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="private-login-container" className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden text-stone-900 dark:text-stone-100 transition-colors">
        {/* Top brand accent */}
        <div className="bg-stone-900 dark:bg-stone-950 px-8 py-8 text-center border-b border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-100">
            Staff Portal Access
          </h2>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Stasia Elegant Fabric • Staff & Inventory Terminal
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div
              id="login-error-message"
              className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5" htmlFor="email-input">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@stasiafabrigue.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 dark:bg-stone-950/70 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5" htmlFor="password-input">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 dark:bg-stone-950/70 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                />
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium"
            >
              ← Return to Public Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
