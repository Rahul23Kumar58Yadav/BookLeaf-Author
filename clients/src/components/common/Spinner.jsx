import "./Spinner.css";

export function Spinner({ size = 20, label = "Loading" }) {
  return (
    <span className="spinner" style={{ "--size": `${size}px` }} role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

/** Full-area loader for route-level waits. */
export function PageSpinner({ label }) {
  return <div className="page-spinner"><Spinner size={32} label={label} /></div>;
}