import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'apps', 'web', 'public', 'assets');

const tiers = {
  bronze: {
    primary: '#b87333',
    secondary: '#8B5A2B',
    accent: '#d4a574',
    bg: '#1a1208',
    bg2: '#0d0906',
    glow: '#cd7f32',
    gem: '#e8a862'
  },
  silver: {
    primary: '#e8e8e8',
    secondary: '#a1a1aa',
    accent: '#d4d4d8',
    bg: '#1c1c24',
    bg2: '#09090b',
    glow: '#c0c0c0',
    gem: '#fafafa'
  },
  gold: {
    primary: '#e8c547',
    secondary: '#d4a017',
    accent: '#f5e6a8',
    bg: '#1a1408',
    bg2: '#0a0804',
    glow: '#ffd700',
    gem: '#f5d76e'
  },
  platinum: {
    primary: '#e8f4fc',
    secondary: '#a8c8e8',
    accent: '#c8e0f8',
    bg: '#141820',
    bg2: '#0a0c14',
    glow: '#b8d4f0',
    gem: '#d0e8ff'
  },
  diamond: {
    primary: '#22d3ee',
    secondary: '#06b6d4',
    accent: '#67e8f9',
    bg: '#0a1628',
    bg2: '#050d18',
    glow: '#22d3ee',
    gem: '#7dd3fc'
  },
  black: {
    primary: '#c9a227',
    secondary: '#8B7355',
    accent: '#f5e6a8',
    bg: '#0a0a0a',
    bg2: '#050505',
    glow: '#c9a227',
    gem: '#1a1a1a'
  }
};

const titleLabels = {
  bronze: 'DP CLUB BRONZE PLAYER',
  silver: 'DP CLUB SILVER PLAYER',
  gold: 'DP CLUB GOLD LEGEND',
  platinum: 'DP CLUB PLATINUM ELITE',
  diamond: 'DP CLUB DIAMOND MASTER',
  black: 'DP CLUB BLACK KING'
};

const tierNames = {
  bronze: 'Bronze Club',
  silver: 'Silver Club',
  gold: 'Gold Club',
  platinum: 'Platinum Club',
  diamond: 'Diamond Club',
  black: 'Black Club'
};

function deckSvg(tier, c) {
  const hasCrown = tier === 'gold' || tier === 'black';
  const hasGems = tier === 'platinum' || tier === 'diamond';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 200" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="140" y2="200">
      <stop stop-color="${c.bg}"/><stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="140" y2="200">
      <stop stop-color="${c.accent}"/><stop offset="0.5" stop-color="${c.primary}"/><stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
    <pattern id="filigree" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M10 0 Q15 10 10 20 Q5 10 10 0" stroke="${c.primary}" stroke-opacity="0.15" fill="none" stroke-width="0.8"/>
      <circle cx="10" cy="10" r="1.5" fill="${c.primary}" fill-opacity="0.2"/>
    </pattern>
    ${hasGems ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
  </defs>
  <rect width="140" height="200" rx="10" fill="url(#bg)" stroke="url(#metal)" stroke-width="2"/>
  <rect x="6" y="6" width="128" height="188" rx="8" fill="url(#filigree)" opacity="0.6"/>
  <rect x="12" y="12" width="116" height="176" rx="6" stroke="url(#metal)" stroke-opacity="0.4" stroke-width="1"/>
  ${hasGems ? `<polygon points="70,28 78,44 70,60 62,44" fill="${c.gem}" fill-opacity="0.6" filter="url(#glow)"/>` : ''}
  ${hasCrown ? `<path d="M58 32 L62 24 L66 30 L70 22 L74 30 L78 24 L82 32 Z" fill="url(#metal)" stroke="${c.secondary}" stroke-width="0.5"/>` : ''}
  <circle cx="24" cy="24" r="3" fill="${c.primary}" fill-opacity="0.35"/>
  <circle cx="116" cy="176" r="3" fill="${c.primary}" fill-opacity="0.35"/>
  <circle cx="116" cy="24" r="2" fill="${c.accent}" fill-opacity="0.25"/>
  <circle cx="24" cy="176" r="2" fill="${c.accent}" fill-opacity="0.25"/>
  <path d="M30 100 Q70 80 110 100 Q70 120 30 100" stroke="url(#metal)" stroke-opacity="0.3" fill="none" stroke-width="1"/>
  <text x="70" y="96" text-anchor="middle" fill="url(#metal)" font-family="Georgia,serif" font-size="32" font-weight="700">DP</text>
  <text x="70" y="118" text-anchor="middle" fill="${c.accent}" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="0.34em">CLUB</text>
  <text x="70" y="168" text-anchor="middle" fill="${c.primary}" fill-opacity="0.5" font-family="system-ui,sans-serif" font-size="7" font-weight="600" letter-spacing="0.2em">${tierNames[tier].toUpperCase()}</text>
</svg>`;
}

function chipSvg(tier, c) {
  const hasCrown = tier === 'gold' || tier === 'black';
  const hasGlow = tier === 'diamond' || tier === 'platinum';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="120" y2="120">
      <stop stop-color="${c.bg}"/><stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="120" y2="120">
      <stop stop-color="${c.accent}"/><stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
    ${hasGlow ? `<filter id="glow"><feGaussianBlur stdDeviation="1.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
  </defs>
  <circle cx="60" cy="60" r="54" fill="url(#body)" stroke="url(#edge)" stroke-width="6" ${hasGlow ? 'filter="url(#glow)"' : ''}/>
  <circle cx="60" cy="60" r="44" fill="none" stroke="${c.primary}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 6"/>
  <circle cx="60" cy="60" r="28" fill="${c.bg2}" stroke="${c.primary}" stroke-opacity="0.25" stroke-width="1"/>
  ${hasCrown ? `<path d="M48 38 L52 30 L56 36 L60 28 L64 36 L68 30 L72 38 Z" fill="url(#edge)" opacity="0.8"/>` : ''}
  ${tier === 'diamond' ? `<polygon points="60,32 66,44 60,56 54,44" fill="${c.gem}" fill-opacity="0.7"/>` : ''}
  <text x="60" y="58" text-anchor="middle" fill="${c.accent}" font-family="Georgia,serif" font-size="14" font-weight="700">DP</text>
  <text x="60" y="70" text-anchor="middle" fill="${c.primary}" font-family="system-ui,sans-serif" font-size="5.5" font-weight="700" letter-spacing="0.28em">CLUB</text>
</svg>`;
}

function frameSvg(tier, c) {
  const hasCrown = tier === 'gold' || tier === 'black';
  const hasGems = tier === 'platinum' || tier === 'diamond';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="fG" x1="0" y1="0" x2="120" y2="120">
      <stop stop-color="${c.accent}"/><stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
    ${hasGems ? `<filter id="glow"><feGaussianBlur stdDeviation="1.2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
  </defs>
  ${hasCrown ? `<path d="M42 14 L48 4 L54 12 L60 2 L66 12 L72 4 L78 14 L72 18 L48 18 Z" fill="url(#fG)" stroke="${c.secondary}" stroke-width="0.5"/>` : ''}
  <circle cx="60" cy="60" r="52" fill="none" stroke="url(#fG)" stroke-width="${tier === 'black' || tier === 'gold' ? '5' : '4'}"/>
  <circle cx="60" cy="60" r="45" fill="none" stroke="${c.primary}" stroke-opacity="0.25" stroke-width="1"/>
  ${hasGems ? `
  <polygon points="60,10 64,18 60,26 56,18" fill="${c.gem}" fill-opacity="0.7" filter="url(#glow)"/>
  <polygon points="110,60 102,64 94,60 102,56" fill="${c.gem}" fill-opacity="0.5" filter="url(#glow)"/>
  <polygon points="60,110 56,102 60,94 64,102" fill="${c.gem}" fill-opacity="0.5" filter="url(#glow)"/>
  <polygon points="10,60 18,56 26,60 18,64" fill="${c.gem}" fill-opacity="0.5" filter="url(#glow)"/>
  ` : tier === 'bronze' ? `<polygon points="60,108 56,100 64,100" fill="url(#fG)"/>` : ''}
  ${tier === 'black' ? `<ellipse cx="60" cy="108" rx="20" ry="6" fill="${c.secondary}" fill-opacity="0.15"/>` : ''}
</svg>`;
}

function titleSvg(tier, c, label) {
  const hasCrown = tier === 'gold' || tier === 'black';
  const hasGem = tier === 'platinum' || tier === 'diamond';
  const w = 260;
  const h = 48;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="0">
      <stop stop-color="${c.bg}"/><stop offset="0.5" stop-color="${c.bg2}"/><stop offset="1" stop-color="${c.bg}"/>
    </linearGradient>
    <linearGradient id="border" x1="0" y1="0" x2="${w}" y2="0">
      <stop stop-color="${c.accent}"/><stop offset="0.5" stop-color="${c.primary}"/><stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="4" width="${w - 4}" height="${h - 8}" rx="6" fill="url(#bg)" stroke="url(#border)" stroke-width="2"/>
  <rect x="8" y="10" width="${w - 16}" height="${h - 20}" rx="4" stroke="${c.primary}" stroke-opacity="0.2" stroke-width="1"/>
  ${hasCrown ? `<path d="M118 6 L122 0 L126 6 L130 0 L134 6 L130 10 L118 10 Z" fill="url(#border)"/>` : ''}
  ${hasGem ? `<polygon points="130,4 134,12 130,20 126,12" fill="${c.gem}" fill-opacity="0.8"/>` : ''}
  <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" fill="${c.accent}" font-family="Georgia,serif" font-size="11" font-weight="700" letter-spacing="0.08em">${label}</text>
</svg>`;
}

function bannerSvg(tier, c) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="420" y2="180">
      <stop stop-color="${c.bg}"/><stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
    <linearGradient id="gem" x1="0" y1="0" x2="80" y2="80">
      <stop stop-color="${c.accent}"/><stop offset="0.5" stop-color="${c.primary}"/><stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
    <pattern id="p" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M15 0 Q22 15 15 30 Q8 15 15 0" stroke="${c.primary}" stroke-opacity="0.1" fill="none"/>
    </pattern>
  </defs>
  <rect width="420" height="180" fill="url(#bg)"/>
  <rect width="420" height="180" fill="url(#p)" opacity="0.5"/>
  <polygon points="60,90 90,50 120,90 90,130" fill="url(#gem)" stroke="${c.accent}" stroke-width="1"/>
  <polygon points="60,90 75,70 90,90 75,110" fill="${c.gem}" fill-opacity="0.4"/>
  <text x="150" y="78" fill="${c.accent}" font-family="Georgia,serif" font-size="28" font-weight="700">DP CLUB</text>
  <text x="150" y="108" fill="${c.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="600" letter-spacing="0.15em">${tierNames[tier].toUpperCase()}</text>
  <text x="150" y="138" fill="${c.secondary}" font-family="system-ui,sans-serif" font-size="11" opacity="0.7">Premium subscription tier</text>
</svg>`;
}

const dirs = {
  backs: join(root, 'cosmetics', 'backs'),
  chips: join(root, 'cosmetics', 'chips'),
  frames: join(root, 'cosmetics', 'frames'),
  titles: join(root, 'cosmetics', 'titles'),
  subs: join(root, 'subscriptions')
};

Object.values(dirs).forEach((d) => mkdirSync(d, { recursive: true }));

for (const [tier, colors] of Object.entries(tiers)) {
  writeFileSync(join(dirs.backs, `deck_${tier}.svg`), deckSvg(tier, colors));
  writeFileSync(join(dirs.chips, `chip_${tier}.svg`), chipSvg(tier, colors));
  writeFileSync(join(dirs.frames, `frame_${tier}.svg`), frameSvg(tier, colors));
  writeFileSync(join(dirs.titles, `title_${tier}.svg`), titleSvg(tier, colors, titleLabels[tier]));
  writeFileSync(join(dirs.subs, `${tier}.svg`), bannerSvg(tier, colors));
}

console.log('Generated DP CLUB assets for 6 tiers.');
