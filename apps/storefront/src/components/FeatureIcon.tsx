export type FeatureIconName =
  | 'bolt'
  | 'shield'
  | 'tag'
  | 'lock'
  | 'chat'
  | 'box'
  | 'doc'
  | 'list';

const PATHS: Record<FeatureIconName, string[]> = {
  doc: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6M10 17h6'],
  list: ['M9 6h11M9 12h11M9 18h11', 'M4.5 6h.01M4.5 12h.01M4.5 18h.01'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7l1-8z'],
  shield: ['M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3z', 'm9 12 2 2 4-4'],
  tag: ['M3 12V4h8l10 10-8 8L3 12z', 'M7.5 8.5h.01'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  chat: ['M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-5.5A8 8 0 1 1 21 12z'],
  box: ['M21 8 12 3 3 8v8l9 5 9-5V8z', 'm3 8 9 5 9-5', 'M12 13v8'],
};

export default function FeatureIcon({
  name,
  size = 26,
}: {
  name: FeatureIconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
