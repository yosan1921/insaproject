import Message from '../../../../lib/models/Message';
import dbConnect from '../../../../lib/mongodb';

export async function POST(req: Request) {
  await dbConnect();
  const { messageId, status } = await req.json();
  if (!messageId || !['sent', 'delivered', 'read'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }
  await Message.findByIdAndUpdate(messageId, { status });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}