type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController<string> | ReadableStreamDefaultController<any>;
};

// Use global to share clients across Next.js module instances in dev mode
declare global {
  var __sseClients: SSEClient[] | undefined;
}

if (!global.__sseClients) {
  global.__sseClients = [];
}

const getClients = (): SSEClient[] => global.__sseClients!;

export function subscribe(controller: ReadableStreamDefaultController) {
  const id = String(Math.random()).slice(2);
  getClients().push({ id, controller });
  console.log(`[SSE] Client connected. Total clients: ${getClients().length}`);
  return id;
}

export function unsubscribe(id: string) {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
  console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
}

export function broadcastEvent(event: string, data: any) {
  const clients = getClients();
  console.log(`[SSE] Broadcasting '${event}' to ${clients.length} client(s)`);
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: string[] = [];
  for (const c of clients) {
    try {
      // @ts-ignore
      c.controller.enqueue(payload);
    } catch (err) {
      dead.push(c.id);
    }
  }
  // Clean up dead connections
  for (const id of dead) unsubscribe(id);
}

export function pingAll() {
  const clients = getClients();
  for (const c of clients) {
    try {
      // @ts-ignore
      c.controller.enqueue(`: ping\n\n`);
    } catch (err) { }
  }
}
