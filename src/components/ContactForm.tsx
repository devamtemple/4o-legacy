'use client';

import { useState, FormEvent } from 'react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-4">&#x2709;&#xFE0F;</div>
        <h3 className="text-lg font-semibold text-[#ededed] mb-2">Message sent</h3>
        <p className="text-[#a0a0a0] mb-6">
          Thank you for reaching out. A moderator will read your message.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-[#74AA9C] hover:text-[#8bc4b6] transition-colors text-sm"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="block text-sm text-[#a0a0a0] mb-1">
          Name <span className="text-[#666]">(optional)</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="How should we address you?"
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#444] rounded-md text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm text-[#a0a0a0] mb-1">
          Email <span className="text-[#666]">(optional — only if you want a reply)</span>
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          placeholder="your@email.com"
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#444] rounded-md text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm text-[#a0a0a0] mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="What would you like to tell us?"
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#444] rounded-md text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors resize-y"
        />
        <p className="text-xs text-[#666] mt-1">{message.length}/5000</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || message.trim().length < 10}
        className="w-full px-4 py-2 bg-[#74AA9C] text-[#141414] rounded-md hover:bg-[#5d9186] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
