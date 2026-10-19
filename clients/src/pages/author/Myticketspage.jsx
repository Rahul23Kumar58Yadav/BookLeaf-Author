import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTickets } from "../../hooks/useTickets";
import { TicketRow, STATUS_OPTIONS } from "../../components/tickets";
import { Button, EmptyState, PageSpinner, SegmentedControl } from "../../components/common";
import "./MyTicketsPage.css";

export default function MyTicketsPage() {
  const { data, loading, error, reload } = useTickets();
  const [filter, setFilter] = useState("all");

  const tickets = data?.tickets ?? [];

  // Counts are derived from the live list, so they update when a status changes in real time
  const options = useMemo(() => {
    const count = (s) => tickets.filter((t) => t.status === s).length;
    return [
      { value: "all", label: "All", count: tickets.length },
      ...STATUS_OPTIONS.map((o) => ({ ...o, count: count(o.value) })),
    ];
  }, [tickets]);

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  if (loading) return <PageSpinner label="Loading your tickets" />;

  if (error) {
    return (
      <EmptyState
        icon="close" title="We couldn't load your tickets" description={error.message}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon="ticket" title="You haven't raised any queries yet"
        description="Questions about royalties, your ISBN, printing or distribution? Send them here and track the reply."
        action={<Button as={Link} to="/tickets/new">Ask for help</Button>}
      />
    );
  }

  return (
    <div className="tickets-page">
      <div className="tickets-page__bar">
        <SegmentedControl label="Filter by status" name="ticket-filter" options={options} value={filter} onChange={setFilter} />
        <Button as={Link} to="/tickets/new" size="sm">New query</Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="inboxEmpty" title="Nothing here"
          description={`You have no tickets with this status.`}
          action={<Button variant="secondary" onClick={() => setFilter("all")}>Show all tickets</Button>}
        />
      ) : (
        <ul className="tickets-page__list">
          {visible.map((t) => <TicketRow key={t.id} ticket={t} />)}
        </ul>
      )}
    </div>
  );
}