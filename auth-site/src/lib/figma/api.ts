import { commentMessage, parseCommentPin } from "@comment-manager/shared";

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

async function figmaFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.figma.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new FigmaApiError(
      `Figma ${path} failed (${response.status}): ${text}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type FigmaApiComment = {
  id: string | number;
  message?: string | { text?: string; mention?: string }[];
  user?: {
    id: string | number;
    handle: string;
    img_url?: string;
  };
  created_at?: string;
  resolved_at?: string | null;
  parent_id?: string | number | null;
  client_meta?: unknown;
};

export async function listFileComments(accessToken: string, fileKey: string) {
  const data = await figmaFetch<{ comments: FigmaApiComment[] }>(
    `/v1/files/${fileKey}/comments`,
    accessToken,
  );
  return data.comments ?? [];
}

export function commentPin(comment: FigmaApiComment) {
  return parseCommentPin(comment.client_meta);
}

export function rootMessage(comment: FigmaApiComment): string {
  return commentMessage(comment.message);
}
