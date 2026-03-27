import { getRedisClient } from "./redis";

const CHANNEL = "insa:sse:broadcast";

export async function publishSseEvent(event: string, data: unknown) {
	const client = await getRedisClient();
	if (!client) return;

	const payload = JSON.stringify({ event, data });
	await client.publish(CHANNEL, payload);
}

export async function subscribeSseEvents(
	onMessage: (event: string, data: unknown) => void,
) {
	const client = await getRedisClient();
	if (!client) return null;

	const sub = client.duplicate();
	await sub.connect();

	await sub.subscribe(CHANNEL, (message) => {
		try {
			const parsed = JSON.parse(message) as { event: string; data: unknown };
			onMessage(parsed.event, parsed.data);
		} catch {
			// ignore malformed messages
		}
	});

	return async () => {
		await sub.unsubscribe(CHANNEL);
		await sub.disconnect();
	};
}

