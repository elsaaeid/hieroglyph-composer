import * as React from 'react';

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="3" y="3" width="14" height="14" rx="2" fill="#FBBF24"/>
    <circle cx="7" cy="8" r="2" fill="#059669"/>
    <path d="M5 15l4-5 3 4 3-4v5H5z" fill="#059669"/>
  </svg>
);

export default ImageIcon;
