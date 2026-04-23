import { z } from "zod";

export const mfaInitiateSchema = z.object({
	email: z.string().email(),
});

export const mfaVerifySchema = z.object({
	email: z.string().email(),
	code: z.string().min(4).max(10),
});

