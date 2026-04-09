type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController<string> | ReadableStreamDefaultController<any>;
  connectedAt: number;
};

// Use global to share clients across Next.js module instances in dev mode
declare global {
  var __sseClients: SSEClient[] | undefined;
  var __ssePingInterval: ReturnType<typeof setInterval> | undefined;
}

if (!global.__sseClients) {
  global.__sseClients = [];
}

const getClients = (): SSEClient[] => global.__sseClients!;

export function subscribe(controller: ReadableStreamDefaultController) {
  const id = String(Math.random()).slice(2);
  getClients().push({ id, controller, connectedAt: Date.now() });
  return id;
}

export function unsubscribe(id: string) {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcastEvent(event: string, data: any) {
  const clients = getClients();
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
  // Clean up dead connections immediately
  for (const id of dead) unsubscribe(id);
}

export function pingAll() {
  const clients = getClients();
  const dead: string[] = [];
  for (const c of clients) {
    try {
      // @ts-ignore
      c.controller.enqueue(`: ping\n\n`);
    } catch (err) {
      dead.push(c.id);
    }
  }
  // Clean up dead connections found during ping
  for (const id of dead) unsubscribe(id);
}

// Start periodic ping to detect and clean up dead connections
// Only start once globally
if (!global.__ssePingInterval) {
  global.__ssePingInterval = setInterval(() => {
    pingAll();
  }, 30000); // Ping every 30 seconds
}
