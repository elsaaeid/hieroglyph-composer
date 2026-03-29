import * as React from 'react';

const PasteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="4" y="4" width="12" height="12" rx="2" fill="#FBBF24"/>
    <rect x="7" y="2" width="6" height="4" rx="1" fill="#059669"/>
  </svg>
);

export default PasteIcon;
