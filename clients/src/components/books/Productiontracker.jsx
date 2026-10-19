import "./ProductionTracker.css";

/** Stage-specific context taken from the KB's production notes. */
const HINTS = {
  "Cover Design": "This stage often waits on your approval of the cover, so a quick review keeps things moving.",
  Proofreading: "Revision rounds happen here. Each round adds a few days, depending on how many changes you request.",
};

/** `production` = { current, index, stages } from the API (null for live books). */
export function ProductionTracker({ production }) {
  const { current, index, stages } = production;

  return (
    <div className="tracker">
      <p className="tracker__summary">
        <strong>{current}</strong>
        <span>Step {index + 1} of {stages.length}</span>
      </p>

      <ol className="tracker__steps" aria-label="Production stages">
        {stages.map((name, i) => (
          <li
            key={name}
            data-state={i < index ? "done" : i === index ? "current" : "todo"}
            aria-current={i === index ? "step" : undefined}
          >
            <span className="visually-hidden">{name}</span>
          </li>
        ))}
      </ol>

      {HINTS[current] && <p className="tracker__hint">{HINTS[current]}</p>}

      <details className="tracker__all">
        <summary>See all stages</summary>
        <ul>
          {stages.map((name, i) => (
            <li key={name} data-state={i < index ? "done" : i === index ? "current" : "todo"}>{name}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}