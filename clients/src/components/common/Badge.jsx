import "./Badge.css";

/** tone: neutral | info | success | warning | danger | critical */
export function Badge({ tone = "neutral", dot = false, children, title }) {
  return (
    <span className="badge" data-tone={tone} data-dot={dot || undefined} title={title}>
      {children}
    </span>
  );
}