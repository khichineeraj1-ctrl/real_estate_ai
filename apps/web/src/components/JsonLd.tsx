export function JsonLd({ data }: { data: unknown }) {
  // Escape "<" so listing text can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
