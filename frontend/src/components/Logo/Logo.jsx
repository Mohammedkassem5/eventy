import "./Logo.css";


export default function Logo({ showText = true, className = "" }) {
  return (
    <span className={`logo ${className}`}>
      <svg
        className="logo__mark"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Eventy"
      >
        <defs>
          <linearGradient id="eventyLogoOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6a1a" />
            <stop offset="1" stopColor="#f75200" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="26" fill="url(#eventyLogoOrange)" />
        <rect x="18" y="34" width="64" height="32" rx="9" fill="#fff" />
        <line
          x1="56"
          y1="39"
          x2="56"
          y2="61"
          stroke="#f75200"
          strokeWidth="3.2"
          strokeDasharray="3 4.5"
          strokeLinecap="round"
        />
        <circle cx="56" cy="34" r="5" fill="url(#eventyLogoOrange)" />
        <circle cx="56" cy="66" r="5" fill="url(#eventyLogoOrange)" />
      </svg>
      {showText && <span className="logo__text">Eventy</span>}
    </span>
  );
}
