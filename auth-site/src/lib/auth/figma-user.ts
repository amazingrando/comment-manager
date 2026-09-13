import { createAdminClient } from "@/lib/supabase/admin";
import { createDefaultColumns, type Column } from "@comment-manager/shared";
import { z } from "zod";

const columnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.number(),
});

export const columnsSchema = z.array(columnSchema).min(1);

export function parseColumns(value: unknown): Column[] {
  return columnsSchema.parse(value);
}

export async function resolveFigmaAuthUserId(input: {
  figmaUserId: string;
  email: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("users")
    .select("id")
    .eq("figma_user_id", input.figmaUserId)
    .maybeSingle();

  if (existingProfile?.id) {
    const { error } = await admin.auth.admin.updateUserById(existingProfile.id, {
      email: input.email,
      email_confirm: true,
      app_metadata: { figma_user_id: input.figmaUserId },
    });
    if (error) throw error;
    return existingProfile.id;
  }

  const created = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    app_metadata: { figma_user_id: input.figmaUserId },
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error("Could not create auth user");
  }

  return created.data.user.id;
}

export async function ensureDefaultColumnSet(userId: string): Promise<Column[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("column_sets")
    .select("columns")
    .eq("user_id", userId)
    .is("file_key", null)
    .maybeSingle();
  if (error) throw error;
  if (data) return parseColumns(data.columns);

  const columns = createDefaultColumns(() => crypto.randomUUID());
  const { error: insertError } = await admin.from("column_sets").insert({
    user_id: userId,
    file_key: null,
    columns,
  });
  if (insertError) throw insertError;
  return columns;
}

export async function createSupabaseSession(email: string) {
  const admin = createAdminClient();
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    throw link.error ?? new Error("Could not establish session");
  }

  const verified = await admin.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  if (verified.error || !verified.data.session) {
    throw verified.error ?? new Error("Could not verify session");
  }
  return verified.data.session;
}
