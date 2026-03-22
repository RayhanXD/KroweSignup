type Props = {
  sessionId: string;
  platformBaseUrl: string;
};

export function ContinueToDashboardButton({ sessionId, platformBaseUrl }: Props) {
  const base = platformBaseUrl.replace(/\/$/, "");
  const href = `${base}/dashboard?session_id=${encodeURIComponent(sessionId)}`;

  return (
    <a
      href={href}
      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
    >
      Continue to dashboard
    </a>
  );
}
