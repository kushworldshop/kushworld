import Link from 'next/link';
import SiteLayout from './SiteLayout';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-zinc-400 hover:text-[#00ff9d] mb-8 inline-block">
          ← Back to Shop
        </Link>
        <h1 className="text-4xl font-bold mb-8">{title}</h1>
        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-zinc-300 leading-relaxed">
          {children}
        </div>
      </div>
    </SiteLayout>
  );
}