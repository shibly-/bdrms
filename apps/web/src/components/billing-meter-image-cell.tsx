export function isPersistedMeterImageUrl(
  src: string | null | undefined,
): src is string {
  return Boolean(src && (src.startsWith("data:") || src.startsWith("http")));
}

type Props = {
  src: string | null | undefined;
};

export function BillingMeterImageCell({ src }: Props) {
  if (!isPersistedMeterImageUrl(src)) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
      title="Open stored meter image"
    >
      <img
        src={src}
        alt="Meter capture"
        className="h-12 max-w-[72px] rounded border border-zinc-200 object-cover dark:border-zinc-600"
      />
    </a>
  );
}
