import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'path';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'products', 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

function parseByteRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return 'invalid';

  const startToken = match[1];
  const endToken = match[2];
  let start = startToken ? Number(startToken) : Number.NaN;
  let end = endToken ? Number(endToken) : Number.NaN;

  if (!startToken && !endToken) return 'invalid';
  if (!startToken) {
    const suffix = end;
    if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (!endToken) {
    if (!Number.isFinite(start) || start < 0) return 'invalid';
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return 'invalid';
  }

  return { start, end: Math.min(end, size - 1) };
}

function fileStream(filePath: string, start?: number, end?: number) {
  const stream =
    start !== undefined && end !== undefined
      ? createReadStream(filePath, { start, end })
      : createReadStream(filePath);
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filename = segments.join('/');

  if (!filename || filename.includes('..') || filename.includes('\\')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
    const size = fileStat.size;
    const range = parseByteRange(request.headers.get('range'), size);
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (range === 'invalid') {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...headers,
          'Content-Range': `bytes */${size}`,
        },
      });
    }

    if (range) {
      const { start, end } = range;
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      headers['Content-Length'] = String(end - start + 1);
      return new NextResponse(fileStream(filePath, start, end), {
        status: 206,
        headers,
      });
    }

    headers['Content-Length'] = String(size);
    return new NextResponse(fileStream(filePath), {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}