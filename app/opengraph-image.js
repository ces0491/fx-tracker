import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'FX Tracker: exchange rate forecasts, scored against what actually happened';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#13201e';
const MUTED = '#5b6b68';
const PAPER = '#f4f6f5';
const PETROL = '#0b6e69';
const FAN = '#00897b';

// Fonts are read from @fontsource at build time; the image is generated once,
// statically, so nothing is read at request time.
async function font(weight) {
  return readFile(join(process.cwd(), 'node_modules/@fontsource/ibm-plex-sans/files', `ibm-plex-sans-latin-${weight}-normal.woff`));
}

/** The product mark: a price line opening into a forecast fan. */
function Mark({ size: markSize }) {
  return (
    <svg width={markSize} height={markSize} viewBox="0 0 32 32">
      <path d="M17 13 L29 4 L29 25 Z" fill={PETROL} fillOpacity="0.22" />
      <path d="M17 13 L29 8 L29 20 Z" fill={PETROL} fillOpacity="0.45" />
      <path d="M17 13 L29 11 L29 16 Z" fill={PETROL} />
      <path d="M3 21 L8 16 L12 19 L17 13" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** An illustrative fan chart: a line, then three nested forecast bands. No axes or values. */
function FanIllustration() {
  const line = 'M0 150 L30 138 L60 160 L90 128 L120 142 L150 112 L180 130 L210 104 L240 122 L270 118';
  return (
    <svg width="440" height="300" viewBox="0 0 440 300">
      <path d="M270 118 L430 18 L430 250 Z" fill={FAN} fillOpacity="0.16" />
      <path d="M270 118 L430 58 L430 196 Z" fill={FAN} fillOpacity="0.16" />
      <path d="M270 118 L430 92 L430 152 Z" fill={FAN} fillOpacity="0.16" />
      <path d="M270 118 L430 122" stroke={FAN} strokeWidth="4" strokeDasharray="12 8" fill="none" />
      <path d="M270 6 L270 294" stroke="#b6c4bf" strokeWidth="2" />
      <path d={line} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Image() {
  const [regular, semibold] = await Promise.all([font(400), font(600)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          borderTop: `12px solid ${PETROL}`,
          padding: '56px 72px 60px',
          fontFamily: 'IBM Plex Sans',
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Mark size={60} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, letterSpacing: -0.5 }}>FX Tracker</div>
          <div style={{ display: 'flex', fontSize: 26, color: MUTED, marginTop: 8 }}>by Sheet Solved</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: 620 }}>
            <div style={{ display: 'flex', fontSize: 58, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.2 }}>
              Exchange rate forecasts, scored against what actually happened
            </div>
            <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.35, color: MUTED }}>
              Daily rates for any pair, six forecasting models, and each model&apos;s track record.
            </div>
          </div>
          <FanIllustration />
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>fx.sheetsolved.com</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'IBM Plex Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'IBM Plex Sans', data: semibold, weight: 600, style: 'normal' },
      ],
    }
  );
}
