import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
	const url = process.env.REDIS_URL;
	if (!url) return null;

	if (client) return client;

	client = createClient({ url });

	client.on("error", () => {
		// swallow errors to avoid crashing the app; health checks will report issues
	});

	if (!client.isOpen) {
		await client.connect();
	}

	return client;
}

