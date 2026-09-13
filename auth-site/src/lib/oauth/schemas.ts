import { z } from "zod";

export const figmaTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().optional(),
});

export type FigmaTokenResponse = z.infer<typeof figmaTokenResponseSchema>;

export const figmaMeSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().email(),
  handle: z.string().min(1),
  img_url: z.string().optional().default(""),
});

export type FigmaUser = z.infer<typeof figmaMeSchema>;
