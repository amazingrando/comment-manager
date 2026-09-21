import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="leading-7 text-stone-700">
        Comment Manager is a Figma plugin. Sign in happens on this site so
        Figma can return an OAuth token. The plugin then stores that token and
        your personal board in Figma&apos;s plugin storage on this computer. We
        do not keep a copy of your comments, cards, or tokens after sign-in
        finishes.
      </p>
      <p className="leading-7 text-stone-700">
        We do not sell this data. We do not share it with other users. A board
        is personal: another person who opens the same file has a separate
        board.
      </p>
      <p className="leading-7 text-stone-700">
        Sign out in the plugin to forget the session on that computer.
      </p>
      <p>
        <Link className="text-teal-800 underline" href="/">
          Home
        </Link>
      </p>
    </main>
  );
}
