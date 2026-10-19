import { Icon } from "./Icon";
import "./EmptyState.css";

/** An empty screen should say what's missing and offer the next action. */
export function EmptyState({ icon = "inboxEmpty", title, description, action }) {
  return (
    <section className="empty">
      <span className="empty__icon"><Icon name={icon} size={28} /></span>
      <div className="empty__text">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="empty__action">{action}</div>}
    </section>
  );
}