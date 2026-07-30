/** Split Wikipedia plaintext overview on newlines into real `<p>` elements. */
export function overviewParagraphs(overview: string): string[] {
  return overview
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function OverviewParagraphs({ overview }: { overview: string }) {
  return (
    <>
      {overviewParagraphs(overview).map((paragraph, i) => (
        <p key={i} className="overview-text">
          {paragraph}
        </p>
      ))}
    </>
  );
}
