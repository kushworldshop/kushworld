import fs from 'fs/promises';
import path from 'path';

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');
const FEATURED_FILE = path.join(process.cwd(), 'lib', 'featured-reviews.json');

import { MAX_REVIEW_LENGTH, MIN_REVIEW_LENGTH } from '@/lib/reviewConstants';

export { MAX_REVIEW_LENGTH, MIN_REVIEW_LENGTH };

export interface Review {
  id: string;
  productId: string | null;
  author: string;
  rating: number;
  comment: string;
  source: 'customer' | 'x';
  featured?: boolean;
  xHandle?: string;
  xUrl?: string;
  createdAt: string;
}

export interface ReviewStats {
  count: number;
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
}

async function ensureReviewsFile() {
  await ensureDataDir();
  try {
    await fs.access(REVIEWS_FILE);
  } catch {
    await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2));
  }
}

async function readCustomerReviews(): Promise<Review[]> {
  await ensureReviewsFile();
  const data = await fs.readFile(REVIEWS_FILE, 'utf8');
  return JSON.parse(data);
}

async function readFeaturedReviews(): Promise<Review[]> {
  try {
    const data = await fs.readFile(FEATURED_FILE, 'utf8');
    const featured: Review[] = JSON.parse(data);
    return featured.map((r) => ({ ...r, source: 'x' as const, featured: true }));
  } catch {
    return [];
  }
}

export async function getAllReviews(): Promise<Review[]> {
  const [customer, featured] = await Promise.all([
    readCustomerReviews(),
    readFeaturedReviews(),
  ]);

  return [...featured, ...customer].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  const all = await getAllReviews();
  return all.filter((r) => r.productId === productId);
}

export async function getFeaturedAndRecent(limit = 6): Promise<Review[]> {
  const all = await getAllReviews();
  const featured = all.filter((r) => r.featured || r.source === 'x');
  const recent = all.filter((r) => !(r.featured || r.source === 'x'));
  const combined = [...featured, ...recent];
  const seen = new Set<string>();
  const unique: Review[] = [];

  for (const review of combined) {
    if (!seen.has(review.id)) {
      seen.add(review.id);
      unique.push(review);
    }
    if (unique.length >= limit) break;
  }

  return unique;
}

export function getAverageRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

export function getReviewStats(reviews: Review[]): ReviewStats {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewStats['breakdown'];

  for (const review of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star] += 1;
  }

  return {
    count: reviews.length,
    average: getAverageRating(reviews),
    breakdown,
  };
}

export function validateReviewInput(
  author: string,
  comment: string,
  rating: number
): { valid: boolean; error?: string } {
  if (!author?.trim()) return { valid: false, error: 'Name is required' };
  if (author.trim().length > 50) return { valid: false, error: 'Name is too long' };
  if (!comment?.trim()) return { valid: false, error: 'Review is required' };
  if (comment.trim().length < MIN_REVIEW_LENGTH) {
    return { valid: false, error: `Review must be at least ${MIN_REVIEW_LENGTH} characters` };
  }
  if (comment.trim().length > MAX_REVIEW_LENGTH) {
    return { valid: false, error: `Review must be ${MAX_REVIEW_LENGTH} characters or less` };
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5 stars' };
  }
  return { valid: true };
}

export async function addReview(
  review: Omit<Review, 'id' | 'createdAt' | 'source'> & { source?: Review['source'] }
): Promise<Review> {
  await ensureReviewsFile();
  const reviews = await readCustomerReviews();

  const newReview: Review = {
    productId: review.productId ?? null,
    author: review.author.trim(),
    rating: Math.round(review.rating),
    comment: review.comment.trim(),
    source: review.source ?? 'customer',
    featured: review.featured ?? false,
    xHandle: review.xHandle,
    xUrl: review.xUrl,
    id: `rev_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  reviews.unshift(newReview);
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
  return newReview;
}