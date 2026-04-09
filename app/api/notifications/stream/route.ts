import { NextResponse } from 'next/server';
import { subscribe, unsubscribe } from '@/lib/sseHub';

export async function GET() {
  // clientId must be in outer scope so cancel() can access it
  const clientIdRef = { id: '' };

  const stream = new ReadableStream({
    start(controller) {
      clientIdRef.id = subscribe(controller);
      // Send initial connection confirmation
      controller.enqueue(`: connected\n\n`);
    },
    cancel() {
      // Called when client disconnects - clean up properly
      if (clientIdRef.id) {
        unsubscribe(clientIdRef.id);
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }
  });
}
