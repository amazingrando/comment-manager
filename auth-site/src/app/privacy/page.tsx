import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="leading-7 text-stone-700">
        Comment Manager is a Figma plugin. When you sign in, we store your
        Figma user id, email, handle, and avatar. We store encrypted Figma
        access tokens so we can read comments in the file you have open. We
        store your personal cards and column layout.
      </p>
      <p className="leading-7 text-stone-700">
        We do not sell this data. We do not share it with other users. A board
        is personal: another person who opens the same file has a separate
        board.
      </p>
      <p className="leading-7 text-stone-700">
        Sign out in the plugin to forget the session on that computer. Contact
        the plugin publisher if you want your account removed.
      </p>
      <p>
        <Link className="text-teal-800 underline" href="/">
          Home
        </Link>
      </p>
    </main>
  );
}
