import { Badge } from "../common";
import { formatDate, formatINR, formatNumber } from "../../utils/format";
import { ProductionTracker } from "./ProductionTracker";
import { RoyaltySummary } from "./RoyaltySummary";
import "./BookCard.css";

export function BookCard({ book }) {
  const { isLive } = book;

  return (
    <article className="book" data-live={isLive || undefined}>
      <header className="book__head">
        <div>
          <h2>{book.title}</h2>
          <p className="book__genre">{book.genre}</p>
        </div>
        <Badge tone={isLive ? "success" : "warning"} dot>
          {isLive ? "Live" : book.status.replace("In Production - ", "In production: ")}
        </Badge>
      </header>

      <div className="book__body">
        <dl className="book__meta">
          <Meta label="ISBN" value={book.isbn} mono />
          <Meta label="Published" value={isLive ? formatDate(book.publicationDate) : "Not yet published"} />
          <Meta label="MRP" value={formatINR(book.mrp)} />
          <Meta label="Copies sold" value={formatNumber(book.copiesSold)} />
          {book.printPartner && <Meta label="Printed by" value={book.printPartner} />}
        </dl>

        {isLive ? (
          <section className="book__section" aria-label="Royalties">
            <h3>Royalties</h3>
            <RoyaltySummary
              earned={book.royaltyEarned}
              paid={book.royaltyPaid}
              pending={book.royaltyPending}
              payout={book.payout}
            />
          </section>
        ) : (
          <section className="book__section" aria-label="Production progress">
            <h3>Production progress</h3>
            <ProductionTracker production={book.production} />
            <p className="book__muted">Price and royalties are set when your book goes live.</p>
          </section>
        )}
      </div>

      <footer className="book__foot">
        <span className="book__foot-label">Available on</span>
        {book.availableOn.length ? (
          <ul className="chips">
            {book.availableOn.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : (
          <span className="book__muted">Listings go live 7–10 business days after publication.</span>
        )}
      </footer>
    </article>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
  );
}