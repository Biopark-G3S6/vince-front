import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

const paths = {
  undo: (
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </>
  ),
  redo: (
    <>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </>
  ),
  alignLeft: <path d="M3 6h18M3 12h12M3 18h16" />,
  alignCenter: <path d="M3 6h18M6 12h12M4 18h16" />,
  alignRight: <path d="M3 6h18M9 12h12M5 18h16" />,
  alignJustify: <path d="M3 6h18M3 12h18M3 18h18" />,
  listBullet: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  listNumber: <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 14h2l-2 4h2" />,
  indent: <path d="M3 6h18M11 12h10M11 18h10M3 9l3 3-3 3" />,
  outdent: <path d="M3 6h18M11 12h10M11 18h10M6 9l-3 3 3 3" />,
  lineHeight: <path d="M11 6h10M11 12h10M11 18h10M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2" />,
  image: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  table: (
    <>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5H4v6h4" />
      <path d="M14 21c3 0 7-1 7-8V5h-6v6h4" />
    </>
  ),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l4 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrowLeft: <path d="m12 19-7-7 7-7M19 12H5" />,
  page: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  flask: (
    <>
      <path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V2" />
      <path d="M8.5 2h7M7 16h10" />
    </>
  ),
  chart: <path d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7" />,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  checks: <path d="m2 12 5 5L18 6M13 17l1 1L22 7" />,
  cloud: <path d="M17.5 19a4.5 4.5 0 1 0-1-8.9A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z" />,
} as const;

export type EditorIconName = keyof typeof paths;

export function EditorIcon({ name, ...props }: IconProps & { name: EditorIconName }) {
  return <Icon {...props}>{paths[name]}</Icon>;
}
