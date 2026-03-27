import { z } from "zod";

export const userRoleSchema = z.enum([
	"Director",
	"Division Head",
	"Risk Analyst",
	"Staff",
]);

export const userMeSchema = z.object({});

export const userUpdateSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	password: z.string().min(8).max(200).optional(),
}).refine((data) => !!data.name || !!data.password, {
	message: "At least one field must be provided",
});

export const userListQuerySchema = z.object({
	role: userRoleSchema.optional(),
});

export const userUpdateRoleSchema = z.object({
	userId: z.string().min(1),
	role: userRoleSchema,
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserUpdateRoleInput = z.infer<typeof userUpdateRoleSchema>;

