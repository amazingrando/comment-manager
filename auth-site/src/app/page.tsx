import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-teal-800">
        Comment Manager
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        A personal Kanban for Figma comments
      </h1>
      <p className="text-base leading-7 text-stone-700">
        This site is the sign-in page for the Comment Manager plugin. Open a
        Figma or FigJam file, run the plugin, and sign in with Figma. There is
        no web board.
      </p>
      <p className="text-base leading-7 text-stone-700">
        We store your personal board and encrypted Figma tokens so the plugin
        can read comments in the file you have open.
      </p>
      <p>
        <Link className="text-teal-800 underline" href="/privacy">
          Privacy
        </Link>
      </p>
    </main>
  );
}
