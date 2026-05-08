'use client';

import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const base: IconProps = {
  className: undefined,
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

const mk = (children: React.ReactNode) =>
  function Icon(props: IconProps) {
    return <svg {...base} {...props}>{children}</svg>;
  };

export const HomeIcon     = mk(<><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></>);
export const BookIcon     = mk(<><path d="M5 5h9a3 3 0 013 3v11H8a3 3 0 01-3-3z"/><path d="M5 5v13"/></>);
export const CalIcon      = mk(<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16"/><path d="M9 3v4M15 3v4"/></>);
export const ChartIcon    = mk(<><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/></>);
export const StarIcon     = mk(<path d="M12 4l2.5 5.5L20 11l-4 3.5L17 20l-5-3-5 3 1-5.5L4 11l5.5-1.5z"/>);
export const SparkIcon    = mk(<path d="M12 4v6M12 14v6M4 12h6M14 12h6"/>);
export const UserIcon     = mk(<><circle cx="12" cy="9" r="3.5"/><path d="M5 20a7 7 0 0114 0"/></>);
export const UsersIcon    = mk(<><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19a6 6 0 0112 0"/><path d="M14 19a4 4 0 017-2.5"/></>);
export const BellIcon     = mk(<><path d="M6 16V11a6 6 0 1112 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 004 0"/></>);
export const SearchIcon   = mk(<><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></>);
export const ArrowRIcon   = mk(<><path d="M5 12h14M13 6l6 6-6 6"/></>);
export const ArrowUIcon   = mk(<><path d="M12 19V5M6 11l6-6 6 6"/></>);
export const ArrowDIcon   = mk(<><path d="M12 5v14M6 13l6 6 6-6"/></>);
export const CheckIcon    = mk(<path d="M5 12l4.5 4.5L19 7.5"/>);
export const PlayIcon     = mk(<path d="M7 5v14l12-7z" fill="currentColor" stroke="none"/>);
export const MicIcon      = mk(<><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 12a7 7 0 0014 0"/><path d="M12 19v3"/></>);
export const CamIcon      = mk(<><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></>);
export const DocIcon      = mk(<><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></>);
export const FlagIcon     = mk(<><path d="M5 3v18"/><path d="M5 4h13l-3 5 3 5H5"/></>);
export const GlobeIcon    = mk(<><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.8 3 2.8 14 0 17"/><path d="M12 3.5c-2.8 3-2.8 14 0 17"/></>);
export const GearIcon     = mk(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></>);
export const CoinIcon     = mk(<><circle cx="12" cy="12" r="8.5"/><path d="M9.5 14a2.5 2.5 0 005 0c0-3-5-1.5-5-4a2.5 2.5 0 015 0"/><path d="M12 6v2M12 16v2"/></>);
export const TrophyIcon   = mk(<><path d="M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3"/><path d="M9 14v3h6v-3"/><path d="M7 21h10"/></>);
export const PlusIcon     = mk(<path d="M12 5v14M5 12h14"/>);
export const MoreIcon     = mk(<><circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/></>);
export const FilterIcon   = mk(<path d="M4 5h16l-6 8v6l-4-2v-4z"/>);
export const ClockIcon    = mk(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>);
export const PinIcon      = mk(<><path d="M12 21s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>);
export const DownloadIcon = mk(<><path d="M12 4v12M6 11l6 6 6-6"/><path d="M5 20h14"/></>);
export const FlameIcon    = mk(<path d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z"/>);
