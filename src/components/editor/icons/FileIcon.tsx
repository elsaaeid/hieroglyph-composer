import * as React from 'react';

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    {...props}
  >
    <rect x="3" y="2" width="14" height="16" rx="2" fill="#059669"/>
    <path d="M7 2V6C7 7.10457 7.89543 8 9 8H13" stroke="#FBBF24" strokeWidth="1.5"/>
    <rect x="7" y="12" width="6" height="2" rx="1" fill="#FBBF24"/>
  </svg>
);

export default FileIcon;
