export const AGE_VERIFIED_KEY = 'ageVerified';
export const MERCH_ONLY_KEY = 'merchOnly';
export const AGE_ACCESS_EVENT = 'age-access-changed';

export type AgeAccessMode = 'unverified' | 'verified' | 'merch-only';

export function getAgeAccessMode(): AgeAccessMode {
  if (typeof window === 'undefined') return 'unverified';
  if (localStorage.getItem(AGE_VERIFIED_KEY) === 'true') return 'verified';
  if (localStorage.getItem(MERCH_ONLY_KEY) === 'true') return 'merch-only';
  return 'unverified';
}

export function setAgeVerified(): void {
  localStorage.setItem(AGE_VERIFIED_KEY, 'true');
  localStorage.removeItem(MERCH_ONLY_KEY);
  window.dispatchEvent(new CustomEvent(AGE_ACCESS_EVENT));
}

export function setMerchOnlyMode(): void {
  localStorage.setItem(MERCH_ONLY_KEY, 'true');
  localStorage.removeItem(AGE_VERIFIED_KEY);
  window.dispatchEvent(new CustomEvent(AGE_ACCESS_EVENT));
}

export function shouldShowAgeModal(): boolean {
  return getAgeAccessMode() === 'unverified';
}