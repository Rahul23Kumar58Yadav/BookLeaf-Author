import "./SegmentedControl.css";

/** Native radio group styled as a pill switcher. options: [{ value, label, count? }] */
export function SegmentedControl({ label, name, options, value, onChange }) {
  return (
    <fieldset className="segmented">
      <legend className="visually-hidden">{label}</legend>
      {options.map((o) => (
        <label key={o.value}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            {o.label}
            {o.count != null && <em>{o.count}</em>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}