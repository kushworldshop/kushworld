import { readMaintenanceModeSync } from '@/lib/maintenanceMode';

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  const mode = readMaintenanceModeSync();
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-4">
          Kush World
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">We&apos;ll be right back</h1>
        <p className="text-zinc-400 text-lg leading-relaxed">
          {mode.message || "Kush World is updating. We'll be back shortly."}
        </p>
      </div>
    </main>
  );
}
