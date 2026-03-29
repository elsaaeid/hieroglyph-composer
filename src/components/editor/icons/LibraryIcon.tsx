import * as React from 'react';

function LibraryIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="#059669" fillOpacity="0.12" />
      <rect x="7" y="8" width="10" height="2" rx="1" fill="#059669" />
      <rect x="7" y="12" width="7" height="2" rx="1" fill="#059669" />
      <rect x="7" y="16" width="4" height="2" rx="1" fill="#059669" />
    </svg>
  );
}

export default LibraryIcon;
