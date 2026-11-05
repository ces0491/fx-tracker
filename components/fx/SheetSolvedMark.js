/** Sheet Solved mark, as used on sheetsolved.com, for the maker credit in the footer. */
export default function SheetSolvedMark({ className }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.7"
      strokeLinejoin="round"
      strokeLinecap="square"
      className={className}
      aria-hidden
    >
      <path d="M13 4H28V19" />
      <path d="M19 28H4V13" />
      <path d="M20 10.5H10.5V21.5H16" />
      <path d="M16.5 16H24.5" />
      <path d="M21 16V24.5" />
    </svg>
  );
}
