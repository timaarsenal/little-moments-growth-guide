// Flat illustrations in the Balapan palette; fills are part of the artwork.
type P = { className?: string; preserve?: string };

export function Hero({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 390 250">
    <rect width="390" height="250" fill="#E8F0EA"/>
    <circle cx="318" cy="64" r="30" fill="#F3C9A8"/>
    <circle cx="318" cy="64" r="44" fill="#F3C9A8" opacity="0.3"/>
    <ellipse cx="80" cy="56" rx="34" ry="12" fill="#FFFFFF"/>
    <ellipse cx="104" cy="48" rx="22" ry="12" fill="#FFFFFF"/>
    <ellipse cx="236" cy="92" rx="26" ry="9" fill="#FFFFFF" opacity="0.8"/>
    <path d="M0 170 Q90 120 190 160 T390 140 L390 250 L0 250 Z" fill="#D3E3D7"/>
    <path d="M0 200 Q120 150 240 190 T390 180 L390 250 L0 250 Z" fill="#A9C7B2"/>
    <g transform="translate(-92 -16)">
    <path d="M262 168 Q290 138 318 168 Z" fill="#FFFFFF"/>
    <rect x="262" y="166" width="56" height="22" fill="#FFFFFF"/>
    <path d="M266 170 L314 170" stroke="#E59A7A" strokeWidth="3"/>
    <path d="M268 178 L312 178" stroke="#E59A7A" strokeWidth="2" strokeDasharray="4 4"/>
    <rect x="284" y="174" width="12" height="14" rx="2" fill="#E59A7A"/>
    </g>
    <path d="M0 225 Q140 190 270 222 T390 215 L390 250 L0 250 Z" fill="#7FA88C"/>
    <ellipse cx="98" cy="196" rx="26" ry="22" fill="#F5C66B"/>
    <circle cx="98" cy="170" r="17" fill="#F5C66B"/>
    <circle cx="92" cy="168" r="2.8" fill="#1F2328"/>
    <circle cx="104" cy="168" r="2.8" fill="#1F2328"/>
    <path d="M94 175 L98 180 L102 175 Z" fill="#E59A7A"/>
    <path d="M74 190 Q64 180 72 172" fill="none" stroke="#E59A7A" strokeWidth="3" strokeLinecap="round"/>
    <path d="M93 152 Q98 145 101 154" fill="none" stroke="#E59A7A" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="88" cy="174" r="3" fill="#F3A98A" opacity="0.6"/>
    <circle cx="108" cy="174" r="3" fill="#F3A98A" opacity="0.6"/>
    </svg>
  );
}

export function Obstacle({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 386 130">
    <rect width="386" height="130" fill="#FBE9DF"/>
    <rect x="0" y="104" width="386" height="26" fill="#F3C9A8"/>
    <rect x="40" y="76" width="80" height="34" rx="14" fill="#E59A7A"/>
    <rect x="126" y="62" width="90" height="48" rx="16" fill="#A9C7B2"/>
    <rect x="222" y="78" width="78" height="32" rx="14" fill="#E59A7A"/>
    <path d="M140 70 Q171 52 202 70" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="5 6" opacity="0.8"/>
    <path d="M306 104 L340 104 L340 70 Q323 56 306 70 Z" fill="#4F7A63"/>
    <rect x="316" y="84" width="14" height="20" fill="#34543F"/>
    <rect x="148" y="38" width="40" height="16" rx="6" fill="#4F7A63"/>
    <rect x="156" y="30" width="22" height="12" rx="4" fill="#7FA88C"/>
    <circle cx="157" cy="56" r="6" fill="#1F2328"/>
    <circle cx="180" cy="56" r="6" fill="#1F2328"/>
    <path d="M120 46 L136 46 M116 40 L132 40" stroke="#E59A7A" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function Kitchen({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#E6EFE8"/>
    <path d="M16 34 H48 V42 Q48 50 40 50 H24 Q16 50 16 42 Z" fill="#4F7A63"/>
    <path d="M28 24 L32 34 L36 24 Z" fill="#E59A7A"/>
    <path d="M30 24 Q32 18 34 24" fill="#7FA88C"/>
    <circle cx="42" cy="28" r="6" fill="#E8735A"/>
    </svg>
  );
}

export function Beads({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#FBE9DF"/>
    <path d="M10 18 Q32 40 54 20" fill="none" stroke="#34543F" strokeWidth="2"/>
    <rect x="14" y="20" width="9" height="6" rx="3" fill="#E59A7A" transform="rotate(35 18 23)"/>
    <rect x="24" y="27" width="9" height="6" rx="3" fill="#F5C66B" transform="rotate(20 28 30)"/>
    <rect x="34" y="28" width="9" height="6" rx="3" fill="#7FA88C" transform="rotate(-10 38 31)"/>
    <rect x="43" y="23" width="9" height="6" rx="3" fill="#E59A7A" transform="rotate(-30 47 26)"/>
    <circle cx="32" cy="48" r="7" fill="#F5C66B"/>
    <circle cx="30" cy="47" r="1.2" fill="#1F2328"/>
    <circle cx="34" cy="47" r="1.2" fill="#1F2328"/>
    </svg>
  );
}

export function BedtimeRitual({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 72 64">
    <circle cx="56" cy="14" r="9" fill="#FFF4D6"/>
    <circle cx="60" cy="11" r="8" fill="#ECE8F6"/>
    <circle cx="14" cy="10" r="1.5" fill="#B9AEE0"/>
    <circle cx="36" cy="6" r="1.5" fill="#B9AEE0"/>
    <path d="M6 34 H54 V40 Q54 52 42 52 H18 Q6 52 6 40 Z" fill="#FFFFFF"/>
    <circle cx="18" cy="30" r="5" fill="#FFFFFF"/>
    <circle cx="27" cy="27" r="6" fill="#FFFFFF"/>
    <circle cx="37" cy="30" r="5" fill="#FFFFFF"/>
    <rect x="44" y="40" width="22" height="16" rx="2" fill="#7A6BB8"/>
    <rect x="55" y="40" width="1.5" height="16" fill="#ECE8F6"/>
    </svg>
  );
}

export function Chick({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 120 120">
    <ellipse cx="60" cy="70" rx="38" ry="34" fill="#F5C66B"/>
    <circle cx="60" cy="44" r="24" fill="#F5C66B"/>
    <circle cx="52" cy="42" r="3.5" fill="#1F2328"/>
    <circle cx="68" cy="42" r="3.5" fill="#1F2328"/>
    <path d="M55 51 L60 57 L65 51 Z" fill="#E8894A"/>
    <path d="M30 70 Q22 60 30 52" fill="none" stroke="#E8894A" strokeWidth="4" strokeLinecap="round"/>
    <path d="M90 70 Q98 60 90 52" fill="none" stroke="#E8894A" strokeWidth="4" strokeLinecap="round"/>
    <path d="M54 20 Q60 12 62 22" fill="none" stroke="#E8894A" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function Creative({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#F8E6EA"/>
    <path d="M32 14 C18 14 12 24 12 33 C12 44 22 50 30 50 C34 50 34 46 32 43 C30 40 32 37 36 37 H42 C48 37 52 33 52 28 C52 20 44 14 32 14 Z" fill="#FFFFFF"/>
    <circle cx="24" cy="26" r="4" fill="#E59A7A"/>
    <circle cx="34" cy="22" r="4" fill="#F5C66B"/>
    <circle cx="43" cy="27" r="4" fill="#7FA88C"/>
    <circle cx="21" cy="37" r="4" fill="#7A6BB8"/>
    <rect x="40" y="42" width="16" height="5" rx="2.5" fill="#4F7A63" transform="rotate(-40 48 44)"/>
    </svg>
  );
}

export function Emotions({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#F7F0D8"/>
    <circle cx="24" cy="34" r="13" fill="#F5C66B"/>
    <circle cx="20" cy="31" r="1.8" fill="#1F2328"/>
    <circle cx="28" cy="31" r="1.8" fill="#1F2328"/>
    <path d="M19 38 Q24 43 29 38" fill="none" stroke="#1F2328" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="42" cy="28" r="10" fill="#A9C7B2"/>
    <circle cx="39" cy="26" r="1.5" fill="#1F2328"/>
    <circle cx="45" cy="26" r="1.5" fill="#1F2328"/>
    <path d="M39 31 Q42 33 45 31" fill="none" stroke="#1F2328" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M44 46 C44 42 50 42 50 46 C50 49 47 51 47 51 C47 51 44 49 44 46 Z" fill="#E59A7A"/>
    </svg>
  );
}

export function Book({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#ECE8F6"/>
    <path d="M12 20 Q22 16 32 21 V48 Q22 43 12 47 Z" fill="#FFFFFF"/>
    <path d="M52 20 Q42 16 32 21 V48 Q42 43 52 47 Z" fill="#F3C9A8"/>
    <path d="M32 21 V48" stroke="#4A3F86" strokeWidth="2"/>
    <path d="M16 27 H27 M16 32 H27 M16 37 H25" stroke="#4A3F86" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    <circle cx="42" cy="31" r="5" fill="#E59A7A"/>
    </svg>
  );
}

export function Ball({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#E6EFE8"/>
    <path d="M0 48 Q32 40 64 48 V64 H0 Z" fill="#A9C7B2"/>
    <circle cx="32" cy="32" r="14" fill="#E59A7A"/>
    <path d="M18 32 Q32 24 46 32 M32 18 Q26 32 32 46" fill="none" stroke="#FFFFFF" strokeWidth="2.5"/>
    <circle cx="50" cy="14" r="5" fill="#F5C66B"/>
    </svg>
  );
}

export function Water({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#E3EEF6"/>
    <path d="M32 12 Q42 26 42 33 A10 10 0 0 1 22 33 Q22 26 32 12 Z" fill="#7FB0D6"/>
    <path d="M10 46 Q16 42 22 46 T34 46 T46 46 T58 46" fill="none" stroke="#7FB0D6" strokeWidth="3" strokeLinecap="round"/>
    <path d="M10 53 Q16 49 22 53 T34 53 T46 53 T58 53" fill="none" stroke="#A9C7E2" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="28" cy="30" r="2.5" fill="#FFFFFF"/>
    </svg>
  );
}

export function Blocks({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#FBE9DF"/>
    <rect x="12" y="38" width="18" height="16" rx="3" fill="#4F7A63"/>
    <rect x="34" y="38" width="18" height="16" rx="3" fill="#F5C66B"/>
    <rect x="23" y="20" width="18" height="16" rx="3" fill="#E59A7A"/>
    <path d="M28 12 L32 6 L36 12 Z" fill="#4A3F86"/>
    </svg>
  );
}

export function Music({ className, preserve = "xMidYMid meet" }: P) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio={preserve} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#ECE8F6"/>
    <path d="M26 44 V18 L46 14 V40" fill="none" stroke="#4A3F86" strokeWidth="3" strokeLinejoin="round"/>
    <ellipse cx="21" cy="44" rx="6" ry="5" fill="#E59A7A"/>
    <ellipse cx="41" cy="40" rx="6" ry="5" fill="#E59A7A"/>
    <path d="M10 20 Q14 16 10 12 M54 52 Q58 48 54 44" fill="none" stroke="#7FA88C" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
