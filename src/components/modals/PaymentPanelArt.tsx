// Decorative background for the checkout modal's brand panel: a cargo ship at sea being tracked
// by AI (radar rings + a dashed tracking path ending on the vessel), drawn as a self-contained SVG
// since there is no real photo asset available - kept subtle (low-opacity white-on-transparent) so
// a gradient/color overlay can sit on top and text stays readable.
export const PaymentPanelArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="ppa-scan-fade" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* faint scattered data dots */}
    {Array.from({ length: 26 }).map((_, index) => {
      const x = (index * 137) % 900;
      const y = 60 + ((index * 251) % 520);
      return <circle key={index} cx={x} cy={y} r={index % 5 === 0 ? 2.4 : 1.4} fill="#E0F2FE" opacity={index % 3 === 0 ? 0.22 : 0.12} />;
    })}

    {/* AI scan node, upper right */}
    <g opacity="0.9">
      <circle cx="650" cy="220" r="150" fill="url(#ppa-scan-fade)" />
      <circle cx="650" cy="220" r="120" fill="none" stroke="#E0F2FE" strokeOpacity="0.28" strokeWidth="1.5" />
      <circle cx="650" cy="220" r="82" fill="none" stroke="#E0F2FE" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="650" cy="220" r="46" fill="none" stroke="#E0F2FE" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx="650" cy="220" r="7" fill="#E0F2FE" fillOpacity="0.85" />
      <path d="M650 148 L662 172 L638 172 Z" fill="#E0F2FE" fillOpacity="0.55" />
    </g>

    {/* dashed AI tracking path curving down to the ship, with two ping markers */}
    <path
      d="M598 268 C 520 360, 470 430, 400 520 S 320 660, 330 760"
      fill="none"
      stroke="#E0F2FE"
      strokeOpacity="0.5"
      strokeWidth="2.5"
      strokeDasharray="2 14"
      strokeLinecap="round"
    />
    <circle cx="452" cy="464" r="5" fill="#E0F2FE" fillOpacity="0.5" />
    <circle cx="352" cy="646" r="5" fill="#E0F2FE" fillOpacity="0.5" />
    <g opacity="0.85">
      <circle cx="330" cy="760" r="20" fill="none" stroke="#E0F2FE" strokeOpacity="0.4" strokeWidth="1.5" />
      <circle cx="330" cy="760" r="10" fill="none" stroke="#E0F2FE" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="330" cy="760" r="4" fill="#E0F2FE" />
    </g>

    {/* cargo ship silhouette */}
    <g transform="translate(120 780)">
      {/* hull */}
      <path
        d="M10 130 L40 175 Q230 200 420 175 L450 130 Z"
        fill="#E0F2FE"
        fillOpacity="0.14"
        stroke="#E0F2FE"
        strokeOpacity="0.3"
        strokeWidth="2"
      />
      {/* deck line */}
      <path d="M10 130 L450 130" stroke="#E0F2FE" strokeOpacity="0.25" strokeWidth="2" />
      {/* bridge / tower */}
      <rect x="330" y="60" width="70" height="70" rx="4" fill="#E0F2FE" fillOpacity="0.16" stroke="#E0F2FE" strokeOpacity="0.3" strokeWidth="2" />
      <rect x="345" y="30" width="12" height="34" fill="#E0F2FE" fillOpacity="0.3" />
      {/* stacked containers on deck */}
      {[0, 1, 2, 3, 4].map((index) => (
        <rect key={index} x={40 + index * 58} y="88" width="48" height="42" rx="3" fill="#E0F2FE" fillOpacity={index % 2 === 0 ? 0.22 : 0.14} stroke="#E0F2FE" strokeOpacity="0.28" strokeWidth="1.5" />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <rect key={`b-${index}`} x={70 + index * 58} y="50" width="48" height="38" rx="3" fill="#E0F2FE" fillOpacity={index % 2 === 0 ? 0.18 : 0.1} stroke="#E0F2FE" strokeOpacity="0.24" strokeWidth="1.5" />
      ))}
    </g>

    {/* waves */}
    <g stroke="#E0F2FE" fill="none" strokeLinecap="round">
      <path d="M0 1000 Q 45 985 90 1000 T 180 1000 T 270 1000 T 360 1000 T 450 1000 T 540 1000 T 630 1000 T 720 1000 T 810 1000 T 900 1000" strokeOpacity="0.28" strokeWidth="3" />
      <path d="M0 1040 Q 60 1020 120 1040 T 240 1040 T 360 1040 T 480 1040 T 600 1040 T 720 1040 T 840 1040 T 900 1040" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M0 1085 Q 75 1060 150 1085 T 300 1085 T 450 1085 T 600 1085 T 750 1085 T 900 1085" strokeOpacity="0.14" strokeWidth="3" />
    </g>
  </svg>
);
