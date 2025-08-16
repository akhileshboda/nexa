import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import logo from "../assets/logo.png";

const btnBase = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98]";
const inputBase = "w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => boolean;
  onRegister: (name: string, email: string, password: string) => boolean;
}

export default function AuthScreen({ onSignIn, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      if (mode === 'login') {
        const success = onSignIn(formData.email, formData.password);
        if (!success) {
          setErrors({ form: 'Invalid email or password' });
        }
      } else {
        const success = onRegister(formData.name, formData.email, formData.password);
        if (!success) {
          setErrors({ form: 'Registration failed. Email may already exist.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Nexa Logo" className="h-52 w-52 rounded-xl" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome</h1>
          <p className="text-neutral-600 text-sm">
            {mode === 'login' 
              ? 'Sign in to continue your study journey' 
              : 'Create your account to get started'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white/80 backdrop-blur border rounded-3xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  className={`${inputBase} ${errors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className={`${inputBase} ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputBase} pr-12 ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className={`${inputBase} ${errors.confirmPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Form-level error */}
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="text-red-600 text-sm">{errors.form}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`${btnBase} w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </div>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={switchMode}
                className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-xs text-amber-800">
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
            Demo Mode - Data stored locally
          </div>
        </div>
      </div>
    </div>
  );
}