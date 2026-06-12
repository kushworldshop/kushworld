import fs from 'fs/promises';
import path from 'path';

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

async function ensureReviewsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(REVIEWS_FILE);
  } catch {
    await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2));
  }
}

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  await ensureReviewsFile();
  const data = await fs.readFile(REVIEWS_FILE, 'utf8');
  const reviews: Review[] = JSON.parse(data);
  return reviews.filter((r) => r.productId === productId);
}

export async function addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
  await ensureReviewsFile();
  const data = await fs.readFile(REVIEWS_FILE, 'utf8');
  const reviews: Review[] = JSON.parse(data);

  const newReview: Review = {
    ...review,
    id: `rev_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  reviews.push(newReview);
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
  return newReview;
}

export function getAverageRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}