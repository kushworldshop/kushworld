'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SiteLayout from '@/app/components/SiteLayout';
import SpinWheel from '@/app/components/SpinWheel';
import type { PublicUserProfile, UserSocials } from '@/lib/users';
import { getSpinPrizeDaysRemaining } from '@/lib/spinWheelTypes';
import type { ReferralNotification } from '@/lib/referralNotifications';
import { SIGNUP_BONUS_DOLLARS, SIGNUP_BONUS_POINTS } from '@/lib/signupBonus';
import { useSiteContent } from '@/lib/useSiteContent';
import IdVerificationUpload from '@/app/components/IdVerificationUpload';
import OrderShippingStatus from '@/app/components/OrderShippingStatus';
import OrderTracker from '@/app/components/OrderTracker';

interface PromoTerms {
  customerDiscount: number;
  firstOrderOnly: boolean;
  minOrder: number;
  referrerCommissionPercent: number;
  referrerRewardPoints: number;
}

type Tab = 'profile' | 'loyalty' | 'wheel' | 'referrals' | 'orders';

const emptySocials: UserSocials = {
  instagram: '',
  twitter: '',
  tiktok: '',
  youtube: '',
  website: '',
};

export default function Account() {
  const { content } = useSiteContent();
  const { features } = content;
  const spinCost = features.spinWheel?.spinCost ?? 150;
  const [user, setUser] = useState<PublicUserProfile | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const loadingRef = useRef(loading);
  const authCheckedRef = useRef(authChecked);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    authCheckedRef.current = authChecked;
  }, [authChecked]);
  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [discordLoginEnabled, setDiscordLoginEnabled] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPromoCode, setSignupPromoCode] = useState('');

  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const [confirmingPhone, setConfirmingPhone] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    bio: '',
    avatarUrl: '',
    promoCode: '',
    socials: { ...emptySocials },
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });

  const [copied, setCopied] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [promoTerms, setPromoTerms] = useState<PromoTerms | null>(null);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);

  // Force exit loading to prevent infinite loading / crash - run once on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingRef.current || !authCheckedRef.current) {
        console.warn('Account load timeout - forcing end of loading state');
        setError('Loading account timed out. This may be a temporary network issue. Please refresh the page or try signing in again.');
        setUser(null);
        setLoading(false);
        setAuthChecked(true);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);
  const loadOrders = async () => {
    const res = await fetch('/api/orders/me');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/users/me');
      if (!res.ok) {
        localStorage.removeItem('currentUser');
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        hydrateForm(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        await loadOrders();
      } else {
        localStorage.removeItem('currentUser');
        setUser(null);
      }
    } catch (e) {
      localStorage.removeItem('currentUser');
      setError('Failed to load profile. Please refresh or sign in again.');
      setUser(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const hydrateForm = (profile: PublicUserProfile) => {
    setProfileForm({
      name: profile.name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      promoCode: profile.referralCode || '',
      socials: { ...emptySocials, ...profile.socials },
      address: profile.shippingAddress?.address || '',
      address2: profile.shippingAddress?.address2 || '',
      city: profile.shippingAddress?.city || '',
      state: profile.shippingAddress?.state || '',
      zip: profile.shippingAddress?.zip || '',
    });
  };

  useEffect(() => {
    // Always verify auth with server (via httpOnly session cookie) so account icon click
    // always works for logged-in users and guests. Brief "Loading account..." is expected and fast.
    loadProfile();
    fetch('/api/settings/public')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success !== false) setPromoTerms(data);
      })
      .catch(() => {});
    fetch('/api/auth/discord/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDiscordLoginEnabled(Boolean(data?.enabled)))
      .catch(() => setDiscordLoginEnabled(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'wheel' || tabParam === 'loyalty' || tabParam === 'referrals' || tabParam === 'orders' || tabParam === 'profile') {
      setTab(tabParam);
    }
    const resetParam = params.get('reset');
    if (resetParam) {
      setResetToken(resetParam);
      setAuthView('reset');
    }

    const discordParam = params.get('discord');
    const discordReason = params.get('reason');
    if (discordParam === 'success') {
      setMessage('Signed in with Discord.');
      loadProfile();
    } else if (discordParam === 'welcome') {
      setMessage('Welcome! Your Kush World account is linked to Discord.');
      loadProfile();
    } else if (discordParam === 'error') {
      const messages: Record<string, string> = {
        not_configured: 'Discord login is not configured on the server yet.',
        access_denied: 'Discord sign-in was cancelled.',
        invalid_state: 'Discord sign-in expired. Please try again.',
        expired_state: 'Discord sign-in expired. Please try again.',
        login_failed: 'Discord sign-in failed. Please try again.',
      };
      const decoded = discordReason ? decodeURIComponent(discordReason) : '';
      setError(messages[decoded] || messages[discordReason || ''] || decoded || 'Discord sign-in failed.');
    }

    if (discordParam) {
      params.delete('discord');
      params.delete('reason');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  const markReferralNotificationsRead = async (all = true) => {
    setMarkingNotificationsRead(true);
    try {
      const res = await fetch('/api/users/me/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) =>
          prev
            ? {
                ...prev,
                unreadReferralNotificationCount: data.unreadCount ?? 0,
                referralNotifications: prev.referralNotifications?.map((item) => ({ ...item, read: true })),
              }
            : prev
        );
      }
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  useEffect(() => {
    if (tab === 'referrals' && (user?.unreadReferralNotificationCount ?? 0) > 0) {
      markReferralNotificationsRead(true);
    }
  }, [tab, user?.unreadReferralNotificationCount]);

  const handleForgotPassword = async () => {
    setMessage('');
    setError('');
    if (!email.trim()) {
      setError('Enter your account email');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not send reset email');
        return;
      }
      setMessage(data.message);
      if (data.devResetUrl) {
        setMessage(`${data.message} Dev link: ${data.devResetUrl}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setMessage('');
    setError('');
    if (!resetToken) {
      setError('Reset link is invalid. Request a new one.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not reset password');
        return;
      }
      setMessage(data.message);
      setAuthView('login');
      setIsLogin(true);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      window.history.replaceState({}, '', '/account');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async () => {
    setMessage('');
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin
      ? { email, password }
      : {
          email,
          password,
          name: signupName || undefined,
          phone: signupPhone || undefined,
          promoCode: signupPromoCode.trim() || undefined,
        };

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
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        await loadOrders();
        if (isLogin) {
          setMessage('Welcome back!');
        } else {
          setMessage(data.message || 'Account created! Check your email or phone for a verification code.');
          if (data.verification?.devCode) {
            setEmailCode(data.verification.channel === 'email' ? data.verification.devCode : '');
            setPhoneCode(data.verification.channel === 'phone' ? data.verification.devCode : '');
          }
        }
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
      const payload: Record<string, unknown> = {
        name: profileForm.name,
        phone: profileForm.phone,
        bio: profileForm.bio,
        avatarUrl: profileForm.avatarUrl,
        socials: profileForm.socials,
        shippingAddress: {
          address: profileForm.address,
          address2: profileForm.address2,
          city: profileForm.city,
          state: profileForm.state,
          zip: profileForm.zip,
        },
      };

      const nextPromo = profileForm.promoCode.trim().toUpperCase();
      const currentPromo = (user?.referralCode || '').toUpperCase();
      if (nextPromo && nextPromo !== currentPromo) {
        payload.promoCode = nextPromo;
      }

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const copyPromoCode = async () => {
    if (!user?.referralCode) return;
    await navigator.clipboard.writeText(user.referralCode);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  const switchToEmailVerification = async () => {
    setMessage('');
    setError('');
    setSendingPhone(true);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use-email' }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not switch to email verification');
        return;
      }
      const profileRes = await fetch('/api/users/me');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.user) setUser(profileData.user);
      }
      setMessage(data.message || 'Switched to email verification.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSendingPhone(false);
    }
  };

  const sendVerificationCode = async (channel: 'email' | 'phone') => {
    setMessage('');
    setError('');
    const setSending = channel === 'email' ? setSendingEmail : setSendingPhone;
    setSending(true);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.devCode) {
          if (channel === 'email') setEmailCode(data.devCode);
          else setPhoneCode(data.devCode);
        }
        setMessage(
          data.devCode
            ? `Dev mode code: ${data.devCode}`
            : data.message || `Verification code sent to your ${channel}.`
        );
      } else {
        const err = data.error || 'Could not send code';
        setError(
          channel === 'phone' && !user?.emailVerified
            ? `${err} You can verify by email instead.`
            : err
        );
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const confirmVerificationCode = async (channel: 'email' | 'phone') => {
    setMessage('');
    setError('');
    const code = channel === 'email' ? emailCode : phoneCode;
    const setConfirming = channel === 'email' ? setConfirmingEmail : setConfirmingPhone;
    setConfirming(true);
    try {
      const res = await fetch('/api/auth/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, code }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) setUser(data.user);
        setMessage(data.message);
        if (channel === 'email') setEmailCode('');
        else setPhoneCode('');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (!authChecked) {
    return (
      <SiteLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-xl text-zinc-400">Loading account...</p>
            <div className="mt-4 w-8 h-8 border-4 border-[#00ff9d] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md border border-zinc-800">
            <h1 className="text-3xl font-bold text-center mb-2 text-[#00ff9d]">
              {authView === 'forgot'
                ? 'Forgot Password'
                : authView === 'reset'
                  ? 'Set New Password'
                  : isLogin
                    ? 'Login'
                    : 'Create Account'}
            </h1>
            <p className="text-center text-sm text-zinc-400 mb-8">
              {authView === 'forgot'
                ? "Enter your email and we'll send a reset link if an account exists."
                : authView === 'reset'
                  ? 'Choose a new password for your account.'
                  : 'Sign up to track loyalty points, referral commissions, and orders.'}
            </p>

            {authView === 'forgot' && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-6"
                />
                <button
                  onClick={handleForgotPassword}
                  disabled={authLoading}
                  className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold text-lg mb-4 disabled:opacity-50"
                >
                  {authLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <p className="text-center text-sm text-zinc-400">
                  <button
                    onClick={() => {
                      setAuthView('login');
                      setError('');
                      setMessage('');
                    }}
                    className="text-[#00ff9d] hover:underline font-medium"
                  >
                    Back to login
                  </button>
                </p>
              </>
            )}

            {authView === 'reset' && (
              <>
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-6"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={authLoading}
                  className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold text-lg mb-4 disabled:opacity-50"
                >
                  {authLoading ? 'Saving...' : 'Update Password'}
                </button>
                <p className="text-center text-sm text-zinc-400">
                  <button
                    onClick={() => {
                      setAuthView('forgot');
                      setError('');
                      setMessage('');
                    }}
                    className="text-[#00ff9d] hover:underline font-medium"
                  >
                    Request a new reset link
                  </button>
                </p>
              </>
            )}

            {(authView === 'login' || authView === 'signup') && (
              <>
                {!isLogin && (
                  <>
                    <p className="text-center text-sm text-[#00ff9d]/90 mb-4">
                      Verify your email or phone after signup to get ${SIGNUP_BONUS_DOLLARS} in points ({SIGNUP_BONUS_POINTS.toLocaleString()} pts). Unlocks after your first purchase.
                    </p>
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional — verify via SMS instead of email)"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
                    />
                    <input
                      type="text"
                      placeholder="Promo code (optional — e.g. MYNAME10)"
                      value={signupPromoCode}
                      onChange={(e) => setSignupPromoCode(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4 uppercase"
                    />
                    <p className="text-xs text-zinc-500 -mt-2 mb-4">
                      Pick your own referral code at signup, or customize it later in your account.
                    </p>
                  </>
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
                  className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
                />

                {isLogin && (
                  <p className="text-right text-sm mb-4">
                    <button
                      onClick={() => {
                        setAuthView('forgot');
                        setError('');
                        setMessage('');
                      }}
                      className="text-[#00ff9d] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </p>
                )}

                <button
                  onClick={handleAuth}
                  disabled={authLoading}
                  className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold text-lg mb-4 disabled:opacity-50"
                >
                  {isLogin ? 'Login' : 'Sign Up'}
                </button>

                {discordLoginEnabled && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-zinc-800" />
                      <span className="text-xs text-zinc-500 uppercase tracking-wide">or</span>
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>
                    <a
                      href="/api/auth/discord?returnTo=/account"
                      className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white py-4 rounded-2xl font-bold text-lg mb-4 transition"
                    >
                      <i className="fa-brands fa-discord text-xl" aria-hidden />
                      Continue with Discord
                    </a>
                  </>
                )}

                <p className="text-center text-sm text-zinc-400">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setAuthView(isLogin ? 'signup' : 'login');
                      setError('');
                      setMessage('');
                    }}
                    className="text-[#00ff9d] hover:underline font-medium"
                  >
                    {isLogin ? 'Sign up' : 'Login'}
                  </button>
                </p>
              </>
            )}

            {error && <p className="text-center mt-4 text-red-400 text-sm">{error}</p>}
            {message && <p className="text-center mt-4 text-[#00ff9d] text-sm">{message}</p>}
          </div>
        </div>
      </SiteLayout>
    );
  }

  const stats = user.referralStats;
  const referralNotifications = user.referralNotifications ?? [];
  const unreadReferralNotifications = user.unreadReferralNotificationCount ?? 0;
  const effectiveCommissionPercent = stats?.commissionPercent ?? promoTerms?.referrerCommissionPercent ?? 5;
  const effectiveRewardPoints = promoTerms?.referrerRewardPoints ?? 100;

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

        {(user.lockedLoyaltyPoints ?? 0) > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-5 py-3 mb-6 text-sm text-yellow-200">
            {(user.lockedLoyaltyPoints ?? 0).toLocaleString()} signup bonus points are locked until you complete your first purchase.
          </div>
        )}

        {unreadReferralNotifications > 0 && tab !== 'referrals' && features.referrals?.enabled && (
          <button
            type="button"
            onClick={() => setTab('referrals')}
            className="w-full text-left bg-[#00ff9d]/10 border border-[#00ff9d]/30 rounded-2xl px-5 py-4 mb-6 text-sm hover:bg-[#00ff9d]/15 transition"
          >
            <p className="font-medium text-[#00ff9d]">
              {unreadReferralNotifications} referral update{unreadReferralNotifications === 1 ? '' : 's'}
            </p>
            <p className="text-zinc-300 mt-1">
              Your promo code or commission settings changed — view details in Referrals.
            </p>
          </button>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Loyalty Points" value={(user.loyaltyPoints ?? 0).toLocaleString()} accent />
          <StatCard
            label="Commission Earned"
            value={`$${(stats?.commissionEarned ?? 0).toFixed(2)}`}
          />
          <StatCard label="Referrals" value={String(stats?.conversions ?? 0)} />
          <StatCard label="Link Clicks" value={String(stats?.clicks ?? 0)} />
        </div>

        {/* Prominent live trackers directly in the main account/profile view so customers always see their Kush Tracker without switching tabs */}
        {orders.length > 0 && tab !== 'orders' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-[2px] text-zinc-500">LIVE</div>
                <h3 className="text-xl font-bold">Your Kush Trackers</h3>
              </div>
              <button
                onClick={() => setTab('orders')}
                className="text-sm text-[#00ff9d] hover:underline font-medium"
              >
                View full order history →
              </button>
            </div>
            <div className="space-y-4">
              {orders.slice(0, 2).map((order: any) => (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4">
                  <div className="flex justify-between items-center mb-2 text-xs text-zinc-500">
                    <span className="font-mono text-[#00ff9d]">#{order.id}</span>
                    <span>{order.status || 'pending'}</span>
                  </div>
                  <OrderTracker
                    order={order}
                    showHeader={false}
                    compact={true}
                    refreshWith={{ orderId: order.id }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 text-center">Trackers update live. Click refresh or enable auto-updates inside each card. Full details in the Orders tab. <span className="text-zinc-600">Orders cannot be deleted by customers — contact support for changes.</span></p>
          </div>
        )}

        <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-zinc-700 -mx-1 px-1">
          {(
            [
              'profile',
              ...(features.loyaltyProgram?.enabled ? (['loyalty'] as Tab[]) : []),
              ...(features.spinWheel?.enabled ? (['wheel'] as Tab[]) : []),
              ...(features.referrals?.enabled ? (['referrals'] as Tab[]) : []),
              'orders',
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition relative ${
                tab === t ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {t}
              {t === 'referrals' && unreadReferralNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">
                  {unreadReferralNotifications > 9 ? '9+' : unreadReferralNotifications}
                </span>
              )}
            </button>
          ))}
        </div>

        {message && <p className="text-[#00ff9d] text-sm mb-4">{message}</p>}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {user.signupBonusEligible && (
          <div className="bg-gradient-to-r from-[#00ff9d]/10 to-transparent border border-[#00ff9d]/30 rounded-3xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-2">Unlock ${SIGNUP_BONUS_DOLLARS} in Loyalty Points</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Verify your {user.signupVerificationChannel === 'phone' ? 'phone number' : 'email address'} to receive{' '}
              {SIGNUP_BONUS_POINTS.toLocaleString()} points (${SIGNUP_BONUS_DOLLARS} off). Complete your first purchase to use them at checkout.
            </p>
            {user.signupVerificationChannel === 'phone' ? (
              <div className="space-y-4">
                <VerificationBlock
                  label="Phone"
                  value={user.phone || 'Add a phone number in your profile'}
                  verified={!!user.phoneVerified}
                  code={phoneCode}
                  onCodeChange={setPhoneCode}
                  onSend={() => sendVerificationCode('phone')}
                  onConfirm={() => confirmVerificationCode('phone')}
                  sending={sendingPhone}
                  confirming={confirmingPhone}
                  disabled={!user.phone?.trim()}
                />
                {!user.phoneVerified && !user.emailVerified && (
                  <button
                    type="button"
                    onClick={switchToEmailVerification}
                    disabled={sendingPhone}
                    className="text-sm text-[#00ff9d] hover:underline disabled:opacity-50"
                  >
                    Text not coming through? Verify by email instead
                  </button>
                )}
              </div>
            ) : (
              <VerificationBlock
                label="Email"
                value={user.email}
                verified={!!user.emailVerified}
                code={emailCode}
                onCodeChange={setEmailCode}
                onSend={() => sendVerificationCode('email')}
                onConfirm={() => confirmVerificationCode('email')}
                sending={sendingEmail}
                confirming={confirmingEmail}
              />
            )}
          </div>
        )}

        {user.signupBonusClaimed && !user.signupBonusEligible && (user.lockedLoyaltyPoints ?? 0) > 0 && (
          <div className="bg-zinc-900 border border-[#00ff9d]/20 rounded-2xl px-5 py-3 mb-8 text-sm text-zinc-300">
            Signup bonus claimed — ${SIGNUP_BONUS_DOLLARS} in points added. Place your first order to unlock them for checkout.
          </div>
        )}

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

            <h3 className="text-lg font-semibold pt-2">Wheel Coupons</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Accepted prizes save here for 7 days. Different types can stack (e.g. % off + free shipping) — pick one per checkout. A better % off coupon automatically replaces a lower one.
            </p>
            {user.pendingSpinPrize ? (
              <div className="bg-black border border-amber-400/30 rounded-2xl p-5 mb-4">
                <p className="text-xs text-amber-300 uppercase tracking-wider mb-2">Awaiting your decision</p>
                <p className="text-xl font-bold text-amber-300">{user.pendingSpinPrize.label}</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Go to the <button type="button" onClick={() => setTab('wheel')} className="text-[#00ff9d] hover:underline">Spin & Win</button> tab to accept or forfeit.
                </p>
              </div>
            ) : null}
            {user.savedSpinCoupons.length > 0 ? (
              <div className="space-y-3 mb-4">
                {user.savedSpinCoupons.map((coupon) => (
                  <div key={coupon.id} className="bg-black border border-[#00ff9d]/30 rounded-2xl p-5">
                    <p className="text-xl font-bold text-[#00ff9d]">{coupon.label}</p>
                    <p className="text-sm text-zinc-500 mt-2">
                      Expires {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'N/A'}
                      {getSpinPrizeDaysRemaining(coupon) !== null && (
                        <> · {getSpinPrizeDaysRemaining(coupon)} day{getSpinPrizeDaysRemaining(coupon) === 1 ? '' : 's'} left</>
                      )}
                    </p>
                  </div>
                ))}
                <Link href="/checkout" className="inline-block text-sm text-[#00ff9d] hover:underline">
                  Choose one at checkout →
                </Link>
              </div>
            ) : !user.pendingSpinPrize ? (
              <p className="text-sm text-zinc-500 mb-4">
                No saved coupons.{' '}
                <button type="button" onClick={() => setTab('wheel')} className="text-[#00ff9d] hover:underline">
                  Spin the wheel
                </button>{' '}
                to win one.
              </p>
            ) : null}

            <h3 className="text-lg font-semibold pt-2">Your Promo Code</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Create a custom code friends enter at checkout. You earn commission and loyalty points on each use.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-2">
              <Field
                label="Promo code"
                value={profileForm.promoCode}
                onChange={(v) => setProfileForm({ ...profileForm, promoCode: v.toUpperCase() })}
                placeholder="MY-CODE"
              />
              {user.referralLink && (
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Share link</label>
                  <input
                    value={user.referralLink}
                    readOnly
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-4 text-sm text-[#00ff9d]"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-6">4–20 characters. Letters, numbers, and hyphens only.</p>

            <h3 className="text-lg font-semibold pt-2">Social Links</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Instagram" value={profileForm.socials.instagram || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, instagram: v } })} placeholder="@yourhandle" />
              <Field label="X / Twitter" value={profileForm.socials.twitter || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, twitter: v } })} placeholder="@yourhandle" />
              <Field label="TikTok" value={profileForm.socials.tiktok || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, tiktok: v } })} placeholder="@yourhandle" />
              <Field label="YouTube" value={profileForm.socials.youtube || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, youtube: v } })} placeholder="Channel URL" />
              <Field label="Website" value={profileForm.socials.website || ''} onChange={(v) => setProfileForm({ ...profileForm, socials: { ...profileForm.socials, website: v } })} placeholder="https://yoursite.com" />
            </div>

            {features.idVerification?.enabled && (
              <IdVerificationUpload user={user} onUpdated={loadProfile} />
            )}

            <h3 className="text-lg font-semibold pt-2">Default Shipping</h3>
            <Field label="Street Address" value={profileForm.address} onChange={(v) => setProfileForm({ ...profileForm, address: v })} />
            <Field label="Address Line 2 (Apt, Suite, Unit, etc.)" value={profileForm.address2} onChange={(v) => setProfileForm({ ...profileForm, address2: v })} />
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
            <p className="text-5xl font-bold text-[#00ff9d] mb-2">{(user.loyaltyPoints ?? 0).toLocaleString()}</p>
            <p className="text-zinc-400 mb-2">
              total points · {(user.redeemableLoyaltyPoints ?? 0).toLocaleString()} redeemable
            </p>
            {(user.lockedLoyaltyPoints ?? 0) > 0 && (
              <p className="text-yellow-400 text-sm mb-8">
                {(user.lockedLoyaltyPoints ?? 0).toLocaleString()} pts locked until your first purchase
              </p>
            )}
            {(user.lockedLoyaltyPoints ?? 0) === 0 && <div className="mb-8" />}

            <div className="space-y-4 text-sm text-zinc-300">
              <p>• Earn <strong>1 point per $10</strong> spent on orders (logged-in checkout)</p>
              <p>• Earn <strong>{promoTerms?.referrerRewardPoints ?? 100} points</strong> per promo code use</p>
              <p>• Share your <strong>personal promo code</strong> — earn <strong>{promoTerms?.referrerCommissionPercent ?? 5}% commission</strong> on each order</p>
              <p>• Redeem <strong>100 points = $1 off</strong> at checkout when logged in</p>
              <p>• New members earn <strong>${SIGNUP_BONUS_DOLLARS} ({SIGNUP_BONUS_POINTS.toLocaleString()} pts)</strong> after verifying email or phone — unlocked after first purchase</p>
              <p>• Gamble <strong>{spinCost} points</strong> on the prize wheel for discounts, free shipping, and more</p>
            </div>

            <button
              onClick={() => setTab('wheel')}
              className="inline-block mt-6 mr-4 bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#00ff9d]/90 transition"
            >
              Spin the Wheel
            </button>
            <Link href="/shop" className="inline-block mt-6 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition">
              Shop & Earn Points
            </Link>
          </div>
        )}

        {tab === 'wheel' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-2 text-center">Spin & Win</h2>
            <p className="text-zinc-400 text-sm text-center mb-8">
              Spend {spinCost} points per spin.
            </p>
            <SpinWheel
              points={user.redeemableLoyaltyPoints}
              spinCost={spinCost}
              pendingPrize={user.pendingSpinPrize}
              savedCoupons={user.savedSpinCoupons}
              onPrizeChange={({ remainingPoints, pendingPrize, savedCoupons }) => {
                setUser((prev) =>
                  prev
                    ? {
                        ...prev,
                        ...(remainingPoints !== undefined
                          ? {
                              loyaltyPoints: remainingPoints + (prev.lockedLoyaltyPoints ?? 0),
                              redeemableLoyaltyPoints: remainingPoints,
                            }
                          : {}),
                        ...(pendingPrize !== undefined ? { pendingSpinPrize: pendingPrize } : {}),
                        ...(savedCoupons !== undefined ? { savedSpinCoupons: savedCoupons } : {}),
                      }
                    : prev
                );
              }}
            />
          </div>
        )}

        {tab === 'referrals' && (
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 space-y-6">
            <h2 className="text-2xl font-bold">Promo Codes & Commission</h2>
            <p className="text-zinc-400">
              Share your personal promo code at checkout. Friends get{' '}
              <strong>${promoTerms?.customerDiscount ?? 10} off</strong>
              {promoTerms?.firstOrderOnly ? ' their first order' : ''}. You earn{' '}
              <strong>{effectiveCommissionPercent}% commission</strong> on the order subtotal plus{' '}
              <strong>{effectiveRewardPoints} loyalty points</strong> per use.
            </p>

            {user.referralCode && (
              <div className="bg-black border border-[#00ff9d]/30 rounded-2xl p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Your promo code</p>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <code className="text-2xl font-bold text-[#00ff9d] tracking-wider">{user.referralCode}</code>
                  <button onClick={copyPromoCode} className="bg-[#00ff9d] text-black px-5 py-2 rounded-xl font-medium text-sm">
                    {copiedPromo ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-3">Friends enter this at checkout — or share your link below.</p>
              </div>
            )}

            <p className="text-sm text-zinc-500">
              Change your code anytime under the <button type="button" onClick={() => setTab('profile')} className="text-[#00ff9d] hover:underline">Profile</button> tab, then save.
            </p>

            {user.referralLink && (
              <div className="bg-black border border-zinc-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
                <code className="text-sm text-[#00ff9d] break-all flex-1">{user.referralLink}</code>
                <button onClick={copyReferralLink} className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-xl font-medium text-sm">
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

            <ReferralUpdatesPanel
              notifications={referralNotifications}
              markingRead={markingNotificationsRead}
              onMarkRead={() => markReferralNotificationsRead(true)}
            />
          </div>
        )}

        {tab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Order History</h2>
              <p className="text-xs text-zinc-500 -mt-5 mb-4">Orders cannot be self-deleted by customers (admin only). Use the trackers below for live status.</p>
              {orders.length === 0 ? (
                <div className="bg-zinc-900 p-12 rounded-3xl text-center border border-zinc-800">
                  <p className="text-xl mb-4">No orders yet</p>
                  <Link href="/shop" className="text-[#00ff9d] hover:underline">Start shopping</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                  <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                      <div>
                        <span className="font-mono text-[#00ff9d]">#{order.id}</span>
                        <p className="text-sm text-zinc-400">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(order.total ?? order.subtotal ?? 0).toFixed(2)}</p>
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
                    <OrderShippingStatus order={order} />

                    <div className="mt-4">
                      <Link
                        href={`/track/${order.id}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#00ff9d] hover:underline"
                      >
                        🌱 View full Kush Tracker (detailed page) →
                      </Link>
                    </div>

                    {/* Live tracker embedded directly in account panel for instant access + live updates (no need to leave) */}
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <OrderTracker
                        order={order}
                        showHeader={false}
                        compact={true}
                        refreshWith={{ orderId: order.id }}
                      />
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

function ReferralUpdatesPanel({
  notifications,
  markingRead,
  onMarkRead,
}: {
  notifications: ReferralNotification[];
  markingRead: boolean;
  onMarkRead: () => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-semibold mb-2">Program updates</h3>
        <p className="text-sm text-zinc-500">
          When your promo code, commission rate, or referral rewards change, updates appear here and we email you for admin changes.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800 pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Program updates</h3>
        {notifications.some((item) => !item.read) && (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={markingRead}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {markingRead ? 'Updating...' : 'Mark all read'}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-2xl border p-4 ${
              notification.read
                ? 'border-zinc-800 bg-black/40'
                : 'border-[#00ff9d]/30 bg-[#00ff9d]/5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{notification.title}</p>
                <p className="text-sm text-zinc-400 mt-1">{notification.message}</p>
              </div>
              {!notification.read && (
                <span className="text-[10px] uppercase tracking-wide text-[#00ff9d] flex-shrink-0">New</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              {new Date(notification.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {notification.meta?.changedBy === 'admin' && ' · Updated by Kush World'}
              {notification.meta?.changedBy === 'customer' && ' · Updated by you'}
            </p>
          </div>
        ))}
      </div>
    </div>
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

function VerificationBlock({
  label,
  value,
  verified,
  code,
  onCodeChange,
  onSend,
  onConfirm,
  sending,
  confirming,
  disabled,
}: {
  label: string;
  value: string;
  verified: boolean;
  code: string;
  onCodeChange: (v: string) => void;
  onSend: () => void;
  onConfirm: () => void;
  sending: boolean;
  confirming: boolean;
  disabled?: boolean;
}) {
  if (verified) {
    return (
      <div className="bg-black/50 rounded-2xl p-5 border border-[#00ff9d]/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-[#00ff9d] font-medium uppercase tracking-wide">Verified</span>
        </div>
        <p className="text-sm text-zinc-400 truncate">{value}</p>
      </div>
    );
  }

  return (
    <div className="bg-black/50 rounded-2xl p-5 border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-yellow-400 font-medium uppercase tracking-wide">Pending</span>
      </div>
      <p className="text-sm text-zinc-400 truncate mb-4">{value}</p>
      <p className="text-xs text-zinc-500 mb-3">
        Didn&apos;t get a code? Check spam/junk folders, then tap resend.
      </p>
      <div className="flex gap-2 mb-3">
        <button
          onClick={onSend}
          disabled={sending || disabled}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl disabled:opacity-40"
        >
          {sending ? 'Sending...' : 'Send Code'}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm tracking-widest"
          maxLength={6}
          disabled={disabled}
        />
        <button
          onClick={onConfirm}
          disabled={confirming || code.length !== 6 || disabled}
          className="text-xs bg-[#00ff9d] text-black px-4 py-2 rounded-xl font-medium disabled:opacity-40"
        >
          {confirming ? '...' : 'Verify'}
        </button>
      </div>
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