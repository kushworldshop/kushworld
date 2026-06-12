'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteLayout from '@/app/components/SiteLayout';
import SpinWheel from '@/app/components/SpinWheel';
import type { PublicUserProfile, UserSocials } from '@/lib/users';
import { REFERRER_COMMISSION_USD, REFERRER_REWARD_POINTS } from '@/lib/referralConstants';
import { SPIN_COST } from '@/lib/spinWheelTypes';

type Tab = 'profile' | 'loyalty' | 'wheel' | 'referrals' | 'orders';

const emptySocials: UserSocials = {
  instagram: '',
  twitter: '',
  tiktok: '',
  youtube: '',
  website: '',
};

export default function Account() {
  const [user, setUser] = useState<PublicUserProfile | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [signupName, setSignupName] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    bio: '',
    avatarUrl: '',
    socials: { ...emptySocials },
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const [copied, setCopied] = useState(false);

  const loadProfile = async () => {
    const res = await fetch('/api/users/me');
    if (!res.ok) {
      setUser(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUser(data.user);
    hydrateForm(data.user);
    await loadOrders();
    setLoading(false);
  };

  const hydrateForm = (profile: PublicUserProfile) => {
    setProfileForm({
      name: profile.name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      socials: { ...emptySocials, ...profile.socials },
      address: profile.shippingAddress?.address || '',
      city: profile.shippingAddress?.city || '',
      state: profile.shippingAddress?.state || '',
      zip: profile.shippingAddress?.zip || '',
    });
  };

  const loadOrders = async () => {
    const res = await fetch('/api/orders/me');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'wheel' || tabParam === 'loyalty' || tabParam === 'referrals' || tabParam === 'orders' || tabParam === 'profile') {
      setTab(tabParam);
    }
  }, []);

  const handleAuth = async () => {
    setMessage('');
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin
      ? { email, password }
      : { email, password, name: signupName || undefined };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        hydrateForm(data.user);
        await loadOrders();
        setMessage(isLogin ? 'Welcome back!' : 'Account created — your referral link is ready.');
        setTab('profile');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOrders([]);
    localStorage.removeItem('currentUser');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          avatarUrl: profileForm.avatarUrl,
          socials: profileForm.socials,
          shippingAddress: {
            address: profileForm.address,
            city: profileForm.city,
            state: profileForm.state,
            zip: profileForm.zip,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setMessage('Profile saved.');
      } else {
        setError(data.error || 'Could not save profile');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyReferralLink = async () => {
    if (!user?.referralLink) return;
    await navigator.clipboard.writeText(user.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <SiteLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md border border-zinc-800">
            <h1 className="text-3xl font-bold text-center mb-2 text-[#00ff9d]">
              {isLogin ? 'Login' : 'Create Account'}
            </h1>
            <p className="text-center text-sm text-zinc-400 mb-8">
              Sign up to track loyalty points, referral commissions, and orders.
            </p>

            {!isLogin && (
              <input
                type="text"
                placeholder="Display Name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-6"
            />

            <button
              onClick={handleAuth}
              className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold text-lg mb-4"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>

            <p className="text-center text-sm text-zinc-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                className="text-[#00ff9d] hover:underline font-medium"
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </p>

            {error && <p className="text-center mt-4 text-red-400 text-sm">{error}</p>}
            {message && <p className="text-center mt-4 text-[#00ff9d] text-sm">{message}</p>}
          </div>
        </div>
      </SiteLayout>
    );
  }

  const stats = user.referralStats;

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Account</h1>
            <p className="text-zinc-400">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Loyalty Points" value={user.loyaltyPoints.toLocaleString()} accent />
          <StatCard
            label="Commission Earned"
            value={`$${(stats?.commissionEarned ?? 0).toFixed(2)}`}
          />
          <StatCard label="Referrals" value={String(stats?.conversions ?? 0)} />
          <StatCard label="Link Clicks" value={String(stats?.clicks ?? 0)} />
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-800 pb-4">
          {(['profile', 'loyalty', 'wheel', 'referrals', 'orders'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition ${
                tab === t ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {message && <p className="text-[#00ff9d] text-sm mb-4">{message}</p>}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {tab === 'profile' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 space-y-6">
            <h2 className="text-2xl font-bold">Profile & Socials</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Display Name" value={profileForm.name} onChange={(v) => setProfileForm({ ...profileForm, name: v })} />
              <Field label="Phone" value={profileForm.phone} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={3}
                className="w-full bg-black border border-zinc-700 rounded-2xl p-4"
                placeholder="Tell the Kush World community about yourself..."
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Avatar URL</label>
              <input
                value={profileForm.avatarUrl}
                onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-2xl p-4"
                placeholder="https://..."
              />
            </div>

            <h3 className="text-lg font-semibold pt-2">Social Links</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Instagram" value={profileForm.socials.instagram || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, instagram: v } })} placeholder="@yourhandle" />
              <Field label="X / Twitter" value={profileForm.socials.twitter || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, twitter: v } })} placeholder="@yourhandle" />
              <Field label="TikTok" value={profileForm.socials.tiktok || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, tiktok: v } })} placeholder="@yourhandle" />
              <Field label="YouTube" value={profileForm.socials.youtube || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, youtube: v } })} placeholder="Channel URL" />
              <Field label="Website" value={profileForm.socials.website || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, website: v } })} placeholder="https://yoursite.com" />
            </div>

            <h3 className="text-lg font-semibold pt-2">Default Shipping</h3>
            <Field label="Street Address" value={profileForm.address} onChange={(v) => setProfileForm({ ...profileForm, address: v })} />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="City" value={profileForm.city} onChange={(v) => setProfileForm({ ...profileForm, city: v })} />
              <Field label="State" value={profileForm.state} onChange={(v) => setProfileForm({ ...profileForm, state: v })} />
              <Field label="ZIP" value={profileForm.zip} onChange={(v) => setProfileForm({ ...profileForm, zip: v })} />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {tab === 'loyalty' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">Loyalty Rewards</h2>
            <p className="text-5xl font-bold text-[#00ff9d] mb-2">{user.loyaltyPoints.toLocaleString()}</p>
            <p className="text-zinc-400 mb-8">points available</p>

            <div className="space-y-4 text-sm text-zinc-300">
              <p>• Earn <strong>1 point per $10</strong> spent on orders (logged-in checkout)</p>
              <p>• Earn <strong>{REFERRER_REWARD_POINTS} points</strong> per successful referral</p>
              <p>• Redeem <strong>100 points = $1 off</strong> at checkout when logged in</p>
              <p>• Gamble <strong>{SPIN_COST} points</strong> on the prize wheel for discounts, free shipping, and more</p>
            </div>

            <button
              onClick={() => setTab('wheel')}
              className="inline-block mt-6 mr-4 bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#00ff9d]/90 transition"
            >
              Spin the Wheel
            </button>
            <Link href="/#shop" className="inline-block mt-6 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition">
              Shop & Earn Points
            </Link>
          </div>
        )}

        {tab === 'wheel' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-2 text-center">Prize Wheel</h2>
            <p className="text-zinc-400 text-sm text-center mb-8 max-w-md mx-auto">
              Spend {SPIN_COST} loyalty points per spin. Win discounts, free shipping, bonus points, or a free t-shirt.
              Prizes expire in 14 days — use them at checkout or forfeit to spin again.
            </p>
            <SpinWheel
              points={user.loyaltyPoints}
              activePrize={user.activeSpinPrize}
              onSpinComplete={(remainingPoints, prize) => {
                setUser((prev) =>
                  prev
                    ? { ...prev, loyaltyPoints: remainingPoints, activeSpinPrize: prize }
                    : prev
                );
              }}
            />
          </div>
        )}

        {tab === 'referrals' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 space-y-6">
            <h2 className="text-2xl font-bold">Referral & Commission</h2>
            <p className="text-zinc-400">
              Share your link. Friends get ${10} off their first order. You earn ${REFERRER_COMMISSION_USD} commission + {REFERRER_REWARD_POINTS} loyalty points per conversion.
            </p>

            {user.referralLink && (
              <div className="bg-black border border-zinc-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
                <code className="text-sm text-[#00ff9d] break-all flex-1">{user.referralLink}</code>
                <button onClick={copyReferralLink} className="bg-[#00ff9d] text-black px-5 py-2 rounded-xl font-medium text-sm">
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <MiniStat label="Total Clicks" value={stats?.clicks ?? 0} />
              <MiniStat label="Conversions" value={stats?.conversions ?? 0} />
              <MiniStat label="Points from Referrals" value={stats?.pointsEarned ?? 0} />
              <MiniStat label="Commission Earned" value={`$${(stats?.commissionEarned ?? 0).toFixed(2)}`} accent />
            </div>

            {(stats?.pendingPoints ?? 0) > 0 && (
              <p className="text-sm text-yellow-400">
                {stats?.pendingPoints} referral points pending — they credit automatically when friends complete orders.
              </p>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Order History</h2>
            {loading ? (
              <p className="text-zinc-400">Loading orders...</p>
            ) : orders.length === 0 ? (
              <div className="bg-zinc-900 p-12 rounded-3xl text-center border border-zinc-800">
                <p className="text-xl mb-4">No orders yet</p>
                <Link href="/#shop" className="text-[#00ff9d] hover:underline">Start shopping</Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                      <div>
                        <span className="font-mono text-[#00ff9d]">#{order.id}</span>
                        <p className="text-sm text-zinc-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total?.toFixed(2) ?? order.subtotal?.toFixed(2)}</p>
                        <span className="text-xs uppercase px-3 py-1 rounded-full bg-zinc-800">
                          {order.status || 'pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.items?.map((item: any, idx: number) => (
                        <span key={idx} className="text-xs bg-black px-3 py-1 rounded-full text-zinc-400">
                          {item.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-[#00ff9d]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-black rounded-2xl p-5 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-[#00ff9d]' : ''}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400 mb-2 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-zinc-700 rounded-2xl p-4"
      />
    </div>
  );
}