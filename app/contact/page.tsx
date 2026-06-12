'use client';

import { useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import SocialButtons from '@/app/components/SocialButtons';
import GrokChat from '@/app/components/GrokChat';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const { content } = useSiteContent();

  return (
    <SiteLayout>
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">{content.contact.pageTitle}</h1>
        <p className="text-zinc-400 mb-10">{content.contact.pageSubtitle}</p>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-700 space-y-6 mb-10">
          <div>
            <p className="text-sm text-zinc-500">Email</p>
            <a href={`mailto:${content.contact.email}`} className="text-[#00ff9d] text-lg">
              {content.contact.email}
            </a>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Response Time</p>
            <p>Within {content.contact.responseTime}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-3">Follow Us</p>
            <SocialButtons />
          </div>
        </div>

        {content.features.grokAssistant.enabled && (
          <div className="mb-10">
            <GrokChat
              mode="support"
              title="Ask Grok"
              subtitle="Instant answers about orders, shipping, ID verification, loyalty points, and more."
              placeholder="e.g. How does ID verification work?"
              suggestedPrompts={[
                'How long does shipping take?',
                'What payment methods do you accept?',
                'How do loyalty points work?',
                'Why was my ID rejected?',
              ]}
            />
          </div>
        )}

        {!submitted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <input required placeholder="Your name" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <input required type="email" placeholder="Email" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <textarea required placeholder="Message" rows={5} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <button type="submit" className="w-full bg-[#00ff9d] text-black py-4 rounded-xl font-bold">
              Send Message
            </button>
          </form>
        ) : (
          <p className="text-center text-[#00ff9d] py-8">{content.contact.formSuccessMessage}</p>
        )}
      </div>
    </SiteLayout>
  );
}