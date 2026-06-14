export const metadata = { title: "Access Denied — Kyle's Media" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isAccessDenied = error === "AccessDenied";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-5xl">🚫</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          {isAccessDenied ? "Access Denied" : "Authentication Error"}
        </h1>
        <p className="text-white/50 text-sm mb-8">
          {isAccessDenied
            ? "That Google account isn't authorized to access this site."
            : "Something went wrong during sign-in. Please try again."}
        </p>
        <a
          href="/auth/signin"
          className="inline-flex items-center justify-center rounded-lg
                     border border-white/10 bg-white/5 px-6 py-2.5
                     text-sm font-medium text-white
                     hover:bg-white/10 transition-colors"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
