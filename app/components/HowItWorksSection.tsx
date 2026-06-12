'use client';

import type { HowItWorksStep } from '@/lib/featureTypes';

export default function HowItWorksSection({
  title,
  steps,
}: {
  title: string;
  steps: HowItWorksStep[];
}) {
  if (steps.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">{title}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={`${step.title}-${index}`}
              className="bg-black border border-zinc-800 rounded-3xl p-6 text-center"
            >
              <div className="text-4xl mb-4">{step.icon}</div>
              <p className="text-xs uppercase tracking-widest text-[#00ff9d] mb-2">
                Step {index + 1}
              </p>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}