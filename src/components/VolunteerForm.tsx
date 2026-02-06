'use client';

import { useState } from 'react';
import { ApiError } from '@/types';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function VolunteerForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [twitter, setTwitter] = useState('');
  const [reason, setReason] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = formState === 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !reason.trim()) {
      setErrorMessage('Please fill in all required fields');
      setFormState('error');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      setFormState('error');
      return;
    }

    setFormState('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          twitter: twitter.trim() || undefined,
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(errorData.error || 'Submission failed');
      }

      setFormState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(message);
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div
        className="bg-[#1e1e1e] border border-[#333] rounded-lg p-8 text-center"
        data-testid="volunteer-success"
      >
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-semibold text-[#ededed] mb-2">
          Thank You for Applying!
        </h3>
        <p className="text-[#a0a0a0]">
          We&apos;ve received your application to become a community volunteer.
          We&apos;ll review it and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 space-y-4"
      data-testid="volunteer-form"
    >
      <div>
        <label htmlFor="name" className="block text-sm text-[#a0a0a0] mb-1">
          Your Name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={100}
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666]"
          data-testid="volunteer-name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm text-[#a0a0a0] mb-1">
          Email Address <span className="text-red-400">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          maxLength={255}
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666]"
          data-testid="volunteer-email"
        />
      </div>

      <div>
        <label htmlFor="twitter" className="block text-sm text-[#a0a0a0] mb-1">
          X/Twitter Handle <span className="text-[#666]">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">@</span>
          <input
            id="twitter"
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value.replace(/^@/, ''))}
            placeholder="username"
            maxLength={50}
            className="w-full pl-7 pr-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666]"
            data-testid="volunteer-twitter"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm text-[#a0a0a0] mb-1">
          Why do you want to help? <span className="text-red-400">*</span>
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us about yourself and why you'd like to volunteer..."
          rows={4}
          maxLength={2000}
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] resize-none"
          data-testid="volunteer-reason"
        />
        <p className="text-xs text-[#666] mt-1 text-right">
          {reason.length}/2000
        </p>
      </div>

      {formState === 'error' && errorMessage && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !email.trim() || !reason.trim()}
        className="w-full py-2 bg-[#74AA9C] text-[#141414] font-medium rounded-md hover:bg-[#5d9186] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="volunteer-submit"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}
