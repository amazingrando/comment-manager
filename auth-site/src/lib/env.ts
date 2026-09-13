function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function isFigmaOAuthConfigured() {
  return Boolean(
    process.env.FIGMA_CLIENT_ID && process.env.FIGMA_CLIENT_SECRET,
  );
}

export function publicEnv() {
  return {
    supabaseUrl: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabasePublishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

export function serverEnv() {
  return {
    ...publicEnv(),
    supabaseSecretKey: required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    tokenEncryptionKey: required(
      "TOKEN_ENCRYPTION_KEY",
      process.env.TOKEN_ENCRYPTION_KEY,
    ),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
    figmaOAuthRedirectUri: process.env.FIGMA_OAUTH_REDIRECT_URI || "",
    figmaClientId: process.env.FIGMA_CLIENT_ID || "",
    figmaClientSecret: process.env.FIGMA_CLIENT_SECRET || "",
  };
}
