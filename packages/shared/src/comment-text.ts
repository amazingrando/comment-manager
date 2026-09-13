export type CommentFragment = {
  text?: string;
  mention?: string;
};

export function flattenCommentFragments(fragments: CommentFragment[]): string {
  return fragments
    .map((fragment) => {
      if (fragment.text != null) return fragment.text;
      if (fragment.mention != null) return `@${fragment.mention}`;
      return "";
    })
    .join("");
}

export function commentMessage(
  message: string | CommentFragment[] | undefined,
): string {
  if (message == null) return "";
  if (typeof message === "string") return message;
  return flattenCommentFragments(message);
}
