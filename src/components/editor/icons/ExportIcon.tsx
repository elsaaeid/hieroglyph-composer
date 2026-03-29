import * as React from 'react';

const ExportIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="3" y="3" width="14" height="14" rx="2" fill="#FBBF24"/>
    <path d="M10 13V7M10 7L7 10M10 7L13 10" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default ExportIcon;
