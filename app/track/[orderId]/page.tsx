import { notFound } from 'next/navigation';
import SiteLayout from '@/app/components/SiteLayout';
import OrderTracker from '@/app/components/OrderTracker';
import Link from 'next/link';

// Server page: supports token-based access (from checkout/email) + logged-in owner access.
// Returns a beautiful full-screen "Dominos-style but for weed" live tracker.

interface TrackPageProps {
  params: { orderId: string };
  searchParams: { token?: string; accessToken?: string };
}

export async function generateMetadata({ params }: { params: { orderId: string } }) {
  return {
    title: `Track Order #${params.orderId} | Kush World`,
    description: `Live order progress for #${params.orderId}. See exactly where your hemp & merch are in the grow-to-door journey.`,
    robots: { index: false, follow: false }, // private per-order
  };
}

async function fetchSafeOrder(orderId: string, token?: string) {
  // Relative fetch works in Next server components for same-origin API routes (secure + no CORS).
  const url = `/api/orders/track?id=${encodeURIComponent(orderId)}`;
  const headers: HeadersInit = {};
  // Pass token via query (already in url) — the API route reads searchParams.
  const finalUrl = token ? `${url}&token=${encodeURIComponent(token)}` : url;

  try {
    const res = await fetch(finalUrl, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      if (res.status === 401) return { unauthorized: true };
      return null;
    }
    const json = await res.json();
    return json.order ? { order: json.order } : null;
  } catch {
    return null;
  }
}

export default async function TrackOrderPage({ params, searchParams }: TrackPageProps) {
  const orderId = params.orderId;
  const token = searchParams.token || searchParams.accessToken;

  const data = await fetchSafeOrder(orderId, token);

  if (!data) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Order not found</h1>
          <p className="text-zinc-400 mb-6">Double-check the link from your confirmation email or log into your account.</p>
          <Link href="/account?tab=orders" className="inline-block px-6 py-3 rounded-2xl bg-[#00ff9d] text-black font-semibold">Go to My Orders</Link>
        </div>
      </SiteLayout>
    );
  }

  if ((data as any).unauthorized) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Access restricted</h1>
          <p className="text-zinc-400 mb-4">This tracker is private. Use the secure link we emailed you (includes the token), or log in to view your orders.</p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/account?tab=orders" className="inline-block px-6 py-3 rounded-2xl bg-[#00ff9d] text-black font-semibold">Log in / My Orders</Link>
            <Link href="/contact" className="text-sm text-zinc-400 hover:text-white">Need the link resent? Contact us</Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const { order } = data;

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
            ← Back to shop
          </Link>
          <Link href="/account?tab=orders" className="text-sm text-[#00ff9d] hover:underline">
            View all orders →
          </Link>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1 text-xs uppercase tracking-[2px] text-[#00ff9d]">
            LIVE • DISCREET • 21+
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mt-3">
            Track your order
          </h1>
          <p className="text-lg text-zinc-400 mt-2">
            Real-time view of your buds &amp; merch making the journey from our garden to you.
          </p>
        </div>

        <OrderTracker
          order={order}
          showHeader
          refreshWith={{ orderId, token }}
        />

        <div className="mt-8 text-center text-xs text-zinc-500 max-w-md mx-auto">
          This page updates when we advance your order. For carrier tracking use the link above once shipped.
          Questions about your order? <Link href="/contact" className="underline">Contact support</Link>.
        </div>

        {/* Fun extra: free 1/8th reminder if applicable */}
        {order.freeEighthBonus && (
          <div className="mt-6 max-w-md mx-auto bg-black border border-amber-400/30 rounded-2xl p-5 text-sm">
            <div className="font-semibold text-amber-300 mb-1">🌿 Free 1/8th Bonus</div>
            <p className="text-zinc-300">
              Because you purchased qualifying hemp, a free 1/8th was automatically added and is now locked in your profile.
              You can redeem it on a future eligible order from your account.
            </p>
            <Link href="/account?tab=orders" className="text-amber-400 text-xs mt-2 inline-block hover:underline">
              Go to account → view bonuses
            </Link>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
