export function isFigmaOAuthConfigured() {
  return Boolean(
    process.env.FIGMA_CLIENT_ID && process.env.FIGMA_CLIENT_SECRET,
  );
}

export function serverEnv() {
  return {
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
    figmaOAuthRedirectUri: process.env.FIGMA_OAUTH_REDIRECT_URI || "",
    figmaClientId: process.env.FIGMA_CLIENT_ID || "",
    figmaClientSecret: process.env.FIGMA_CLIENT_SECRET || "",
  };
}
