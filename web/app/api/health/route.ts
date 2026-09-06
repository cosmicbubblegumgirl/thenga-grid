import { json } from '@/lib/auth';

export async function GET() {
  return json({ ok: true, service: 'THENGA GRID', time: new Date().toISOString() });
}
