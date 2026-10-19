import { formatDate, formatINR, formatNumber } from "../../utils/format";
import "./TicketContext.css";

/**
 * The facts an admin needs to answer without opening another system.
 * `book` is the full book snapshot (same shape as GET /api/books items); null for General tickets.
 */
export function TicketContext({ author, book }) {
  return (
    <section className="tcontext" aria-label="Author and book details">
      <h3>Author</h3>
      <dl>
        <Row label="Name" value={author.name} />
        <Row label="Email" value={<a href={`mailto:${author.email}`}>{author.email}</a>} />
      </dl>

      <h3>Book</h3>
      {!book ? (
        <p className="tcontext__none">General / account-level query. No book attached.</p>
      ) : (
        <dl>
          <Row label="Title" value={book.title} />
          <Row label="ISBN" value={<code>{book.isbn}</code>} />
          <Row label="Status" value={book.status} />

          {book.isLive ? (
            <>
              <Row label="Copies sold" value={formatNumber(book.copiesSold)} />
              <Row label="Royalty earned" value={formatINR(book.royaltyEarned)} />
              <Row label="Royalty paid" value={formatINR(book.royaltyPaid)} />
              <Row label="Royalty pending" value={formatINR(book.royaltyPending)} emphasis={book.royaltyPending > 0} />
              <Row label="Last payout" value={book.payout?.lastPayoutDate ? formatDate(book.payout.lastPayoutDate) : "Never paid"} />
              {book.payout?.rollover && <Row label="Note" value={`Pending is under ${formatINR(book.payout.minThreshold)}, so it rolls over to the next quarter`} />}
              <Row label="Listed on" value={book.availableOn?.join(", ") || "—"} />
            </>
          ) : (
            <Row label="Production" value={book.production ? `${book.production.current} (step ${book.production.index + 1} of ${book.production.stages.length})` : "—"} />
          )}
          <Row label="Printed by" value={book.printPartner ?? "—"} />
        </dl>
      )}
    </section>
  );
}

function Row({ label, value, emphasis }) {
  return (
    <div className="tcontext__row" data-emphasis={emphasis || undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}