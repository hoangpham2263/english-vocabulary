// The English Lab mark: "EL" in white on the brand tile. Shared by the header,
// the login page and the generated favicons, so they always match.

const SIZE = 64;
const RADIUS = 16; // tile corner

export const BRAND_BLUE = "#1877f2";

// "EL" drawn from bars rather than a font, so it stays crisp at 16px and needs
// no font file: one stroke, one end radius, one letter gap.
const EL_STROKE = 5.5;
const EL_END = 1.5; // corner radius of every bar end
const EL_HEIGHT = 24; // cap height
const E_WIDTH = 14.5;
const E_MID = 12; // middle arm, a little shorter, as in most sans serifs
const L_WIDTH = 13.5;
const EL_GAP = 5;
const EL_LEFT = (SIZE - (E_WIDTH + EL_GAP + L_WIDTH)) / 2;
const EL_TOP = (SIZE - EL_HEIGHT) / 2;
const EL_BARS: [x: number, y: number, w: number, h: number][] = [
  // E: stem and three arms
  [EL_LEFT, EL_TOP, EL_STROKE, EL_HEIGHT],
  [EL_LEFT, EL_TOP, E_WIDTH, EL_STROKE],
  [EL_LEFT, EL_TOP + (EL_HEIGHT - EL_STROKE) / 2, E_MID, EL_STROKE],
  [EL_LEFT, EL_TOP + EL_HEIGHT - EL_STROKE, E_WIDTH, EL_STROKE],
  // L: stem and foot
  [EL_LEFT + E_WIDTH + EL_GAP, EL_TOP, EL_STROKE, EL_HEIGHT],
  [EL_LEFT + E_WIDTH + EL_GAP, EL_TOP + EL_HEIGHT - EL_STROKE, L_WIDTH, EL_STROKE],
];

/**
 * Bump when the favicon's look changes. The icons are cached for a day, so the
 * URL has to change for browsers to fetch the new one.
 */
export const FAVICON_VERSION = "el-3";

/**
 * `fullBleed` draws a square tile with no rounded corners. Home-screen icons
 * need it: iOS and Android round the icon with their own mask, and a tile that
 * is already rounded leaves transparent corners they fill with white.
 */
export function BrandMark({
  size = 32,
  className,
  fullBleed = false,
}: {
  size?: number;
  className?: string;
  fullBleed?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} aria-hidden="true">
      <rect width={SIZE} height={SIZE} rx={fullBleed ? 0 : RADIUS} fill={BRAND_BLUE} />
      {EL_BARS.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={EL_END} fill="#ffffff" />
      ))}
    </svg>
  );
}
