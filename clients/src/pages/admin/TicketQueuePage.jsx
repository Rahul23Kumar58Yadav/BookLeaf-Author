import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAdminTickets } from "../../hooks/useAdminTickets";
import { useNow } from "../../hooks/useNow";
import { waitState } from "../../utils/sla";
import { QueueTable, CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "../../components/tickets";
import { Button, EmptyState, LiveStatus, PageSpinner, SegmentedControl } from "../../components/common";
import "./TicketQueuePage.css";

const VIEWS = [
  { value: "active", label: "Active" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const SORTS = [
  { value: "urgency", label: "Most urgent first" },
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
];

/** Filters live in the URL: shareable, survives refresh, and the browser's Back button restores them. */
const DEFAULTS = { status: "active", category: "", priority: "", assignee: "", from: "", to: "", sort: "urgency" };

export default function TicketQueuePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const now = useNow();

  const filters = useMemo(
    () => Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, params.get(k) ?? d])),
    [params]
  );

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value === DEFAULTS[key] ? next.delete(key) : next.set(key, value);
    setParams(next, { replace: true });
  };
  const clearFilters = () => setParams({}, { replace: true });

  // Only non-empty filters go to the API
  const query = useMemo(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    return q.toString();
  }, [filters]);

  const { data, loading, error, reload, live } = useAdminTickets(query);
  const tickets = data?.tickets ?? [];
  const isFiltered = Object.keys(DEFAULTS).some((k) => k !== "sort" && filters[k] !== DEFAULTS[k]);

  const stats = useMemo(() => {
    let overdue = 0, unassigned = 0, critical = 0;
    for (const t of tickets) {
      if (waitState(t, now).overdue) overdue++;
      if (!t.assignee && (t.status === "open" || t.status === "in_progress")) unassigned++;
      if (t.priority === "critical" && (t.status === "open" || t.status === "in_progress")) critical++;
    }
    return { overdue, unassigned, critical };
  }, [tickets, now]);

  if (loading && !data) return <PageSpinner label="Loading tickets" />;

  if (error && !data) {
    return (
      <EmptyState icon="close" title="We couldn't load the queue" description={error.message}
        action={<Button onClick={reload}>Try again</Button>} />
    );
  }

  return (
    <div className="queue-page">
      <div className="queue-page__stats" aria-label="Summary of this view">
        <Stat value={tickets.length} label={tickets.length === 1 ? "ticket" : "tickets"} />
        <Stat value={stats.overdue} label="overdue" tone={stats.overdue ? "danger" : undefined} />
        <Stat value={stats.critical} label="critical" tone={stats.critical ? "danger" : undefined} />
        <Stat value={stats.unassigned} label="unassigned" />
        <LiveStatus live={live} liveText="Live" offlineText="Reconnecting…" />
      </div>

      <SegmentedControl label="Status" name="queue-status" options={VIEWS} value={filters.status} onChange={(v) => setFilter("status", v)} />

      <div className="queue-page__filters">
        <Filter label="Category" value={filters.category} onChange={(v) => setFilter("category", v)}
          options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS]} />
        <Filter label="Priority" value={filters.priority} onChange={(v) => setFilter("priority", v)}
          options={[{ value: "", label: "Any priority" }, ...PRIORITY_OPTIONS]} />
        <Filter label="Assignee" value={filters.assignee} onChange={(v) => setFilter("assignee", v)}
          options={[{ value: "", label: "Anyone" }, { value: "me", label: "Assigned to me" }, { value: "unassigned", label: "Unassigned" }]} />
        <label className="filter">
          <span>Opened from</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label className="filter">
          <span>to</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
        <Filter label="Sort" value={filters.sort} onChange={(v) => setFilter("sort", v)} options={SORTS} />
        {isFiltered && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
      </div>

      <div className="queue-page__results" aria-busy={loading || undefined} data-loading={loading || undefined}>
        {tickets.length === 0 ? (
          isFiltered ? (
            <EmptyState icon="inboxEmpty" title="No tickets match these filters" description="Try widening the date range or clearing a filter."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
          ) : (
            <EmptyState icon="inbox" title="The queue is clear" description="No active tickets right now. New ones appear here as soon as authors send them." />
          )
        ) : (
          <QueueTable tickets={tickets} meId={user.id} now={now} search={params.toString() ? `?${params}` : ""} />
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, tone }) {
  return (
    <p className="stat" data-tone={tone}>
      <strong>{value}</strong> {label}
    </p>
  );
}

function Filter({ label, value, onChange, options }) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}