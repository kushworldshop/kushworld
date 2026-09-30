'use client';

import Link from 'next/link';
import type { PublicTdPost } from '@/lib/tdRewards';

export default function TouchdownWall({ posts }: { posts: PublicTdPost[] }) {
  return (
    <section className="py-16 md:py-20 px-6 bg-zinc-950 border-y border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-2">
              Touchdowns
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Pack landings, paid</h2>
            <p className="text-zinc-400 mt-2 max-w-xl">
              Post the TD with #KushWorldTD, paste the link on your account, get 500 loyalty points. Real posts —
              not a fake review count.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-[#00ff9d] hover:underline font-medium shrink-0"
          >
            Submit your TD
            <i className="fa-solid fa-arrow-right text-sm" />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-black/40 p-8 md:p-12 text-center">
            <p className="text-lg font-semibold mb-2">Board&apos;s waiting on the next landing</p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              Save your X username, drop #KushWorldTD on the post, then paste the URL under Account → TouchDown.
            </p>
            <Link
              href="/account"
              className="inline-block bg-[#00ff9d] text-black px-6 py-3 rounded-2xl font-bold"
            >
              Get 500 points
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-zinc-800 hover:border-[#00ff9d]/40 rounded-3xl p-5 transition"
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">TD</p>
                <p className="font-semibold text-[#00ff9d] mb-1">{post.handle}</p>
                <p className="text-xs text-zinc-500 mb-4">
                  {new Date(post.createdAt).toLocaleDateString()}
                  {post.pointsAwarded > 0 ? ` · +${post.pointsAwarded.toLocaleString()} pts` : ''}
                </p>
                <p className="text-sm text-zinc-300">
                  View post <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-1" />
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
