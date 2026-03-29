import * as React from 'react';

const ImportIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="3" y="3" width="14" height="14" rx="2" fill="#059669"/>
    <path d="M10 7V13M10 13L7 10M10 13L13 10" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default ImportIcon;
