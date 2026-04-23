// API route to update user's lastActive timestamp (heartbeat)
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  await User.findOneAndUpdate(
    { email: session.user.email },
    { lastActive: new Date() }
  );
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}
