const PATHS = {
  book:    "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm2 14h11M8 7h6",
  plus:    "M12 5v14M5 12h14",
  ticket:  "M4 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v1h16v-1a2 2 0 0 1 0-4v0a2 2 0 0 1 0-4V7H4v1Z",
  inbox:   "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5a3 3 0 0 0 6 0h5",
  menu:    "M4 7h16M4 12h16M4 17h16",
  close:   "M6 6l12 12M18 6L6 18",
  sun:     "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon:    "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  logout:  "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  chevron: "m6 9 6 6 6-6",
  inboxEmpty: "M3 12l3-8h12l3 8v7H3v-7Zm0 0h5l1 2h6l1-2h5",
  sparkle: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Zm7 11 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z",
  paperclip: "m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7",
  upload:  "M12 16V4m0 0-4 4m4-4 4 4M4 16v4h16v-4",
  lock:    "M6 11h12v9H6v-9Zm3 0V8a3 3 0 0 1 6 0v3",
};

export function Icon({ name, size = 20, ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}