import { getSessionUser, json } from '@/lib/auth';

export async function GET(request: Request) {
  return json({ user: await getSessionUser(request) });
}
