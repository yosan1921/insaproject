import { z } from "zod";

export const healthCheckQuerySchema = z.object({
	verbose: z
		.string()
		.optional()
		.transform((v) => v === "1" || v === "true"),
});

