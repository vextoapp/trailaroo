import { ImageResponse } from "next/og";

// App icons drawn from the brand mark in docs/mockups/icons.svg (#i-mark), Eucalyptus accent.
const SIZES = { "icon-192.png": [192, 0.62], "icon-512.png": [512, 0.62], "icon-maskable-512.png": [512, 0.46], "apple-touch-icon.png": [180, 0.62] } as const;
type IconFile = keyof typeof SIZES;

export const dynamic = "force-static";
export const generateStaticParams = () => Object.keys(SIZES).map((file) => ({ file }));

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!Object.hasOwn(SIZES, file)) return new Response("Not found", { status: 404 });
  const spec = SIZES[file as IconFile];
  const [size, scale] = spec;
  const mark = Math.round(size * scale);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C6956" }}>
      <svg aria-hidden="true" width={mark} height={mark} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19c3-1 4-5 7-5s3 3 6 3 4-3 5-4" />
        <path d="M8 9l3-5 3 5" />
        <circle cx="18" cy="6" r="1.5" />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
