import * as React from 'react';

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="6" y="6" width="10" height="12" rx="2" fill="#059669"/>
    <rect x="2" y="2" width="10" height="12" rx="2" fill="#FBBF24"/>
  </svg>
);

export default CopyIcon;
