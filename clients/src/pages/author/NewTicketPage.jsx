import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ticketsApi } from "../../api/tickets.api";
import { useBooks } from "../../hooks/useBooks";
import { TicketForm } from "../../components/tickets";
import { PageSpinner } from "../../components/common";
import "./NewTicketPage.css";

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, loading, error } = useBooks();

  if (loading) return <PageSpinner label="Loading your books" />;

  const books = data?.books ?? [];
  // ?book=BK001 preselects a book (e.g. from a link on a book card); ignore ids that aren't the author's
  const requested = params.get("book");
  const defaultBookId = books.some((b) => b.id === requested) ? requested : undefined;

  async function handleSubmit(payload) {
    const { ticket } = await ticketsApi.create(payload); // errors bubble up to TicketForm for display
    navigate(`/tickets/${ticket.id}`, { state: { justCreated: true } });
  }

  return (
    <div className="newticket">
      <p className="newticket__intro">
        Tell us what's going on and we'll route it to the right team. You can follow the reply under{" "}
        <Link to="/tickets">My tickets</Link>.
      </p>

      {error && (
        <p className="newticket__notice" role="status">
          We couldn't load your books, so you can only file this under General / Account level for now.
        </p>
      )}

      {/* Attachments aren't uploaded yet, so say so rather than letting files silently disappear */}
      <p className="newticket__notice" role="note">
        File uploads aren't active yet. Describe the issue in your message and the team will tell you how to share files if they're needed.
      </p>

      <TicketForm books={books} defaultBookId={defaultBookId} onSubmit={handleSubmit} />
    </div>
  );
}