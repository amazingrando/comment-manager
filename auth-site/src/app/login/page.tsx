import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ writeKey?: string; error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const writeKey = params.writeKey;
  const error = params.error;
  const ok = params.ok === "1";

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in with Figma</h1>
      {ok ? (
        <p className="leading-7 text-stone-700">
          Sign in is complete. Return to the Figma plugin. You can close this
          tab.
        </p>
      ) : writeKey ? (
        <>
          <p className="leading-7 text-stone-700">
            Comment Manager will read comments in the file you have open. Your
            personal board stays in the plugin on this computer.
          </p>
          {error ? (
            <p className="text-red-800">Sign in failed. Try again.</p>
          ) : null}
          <a
            className="inline-flex w-fit rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white"
            href={`/api/oauth/figma?writeKey=${encodeURIComponent(writeKey)}`}
          >
            Continue with Figma
          </a>
        </>
      ) : (
        <p className="leading-7 text-stone-700">
          Open Comment Manager from a Figma or FigJam file to sign in. This
          page does not have a web board.
        </p>
      )}
      <p>
        <Link className="text-teal-800 underline" href="/privacy">
          Privacy
        </Link>
      </p>
    </main>
  );
}
