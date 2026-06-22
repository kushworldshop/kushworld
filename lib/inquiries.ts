import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const INQUIRIES_FILE = path.join(process.cwd(), 'data', 'inquiries.json');

export type InquiryType = 'contact' | 'wholesale';

export interface InquiryRecord {
  id: string;
  type: InquiryType;
  name: string;
  email: string;
  message: string;
  businessName?: string;
  phone?: string;
  createdAt: string;
  emailSent: boolean;
}

async function ensureInquiriesFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(INQUIRIES_FILE);
  } catch {
    await fs.writeFile(INQUIRIES_FILE, JSON.stringify([], null, 2));
  }
}

export async function saveInquiry(
  input: Omit<InquiryRecord, 'id' | 'createdAt' | 'emailSent'> & { emailSent: boolean }
): Promise<InquiryRecord> {
  await ensureInquiriesFile();
  const data = await fs.readFile(INQUIRIES_FILE, 'utf8');
  const records = JSON.parse(data) as InquiryRecord[];
  const record: InquiryRecord = {
    id: `inq_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  records.push(record);
  await fs.writeFile(INQUIRIES_FILE, JSON.stringify(records, null, 2));
  return record;
}