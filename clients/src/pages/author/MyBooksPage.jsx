import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBooks } from "../../hooks/useBooks";
import { BookCard } from "../../components/books/BookCard";
import { RoyaltySummary } from "../../components/books/RoyaltySummary";
import { Button, EmptyState, PageSpinner, SegmentedControl } from "../../components/common";
import { formatNumber } from "../../utils/format";
import "./MyBooksPage.css";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "production", label: "In production" },
];

export default function MyBooksPage() {
  const { data, loading, error, reload } = useBooks();
  const [filter, setFilter] = useState("all");

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === "live") return data.books.filter((b) => b.isLive);
    if (filter === "production") return data.books.filter((b) => !b.isLive);
    return data.books;
  }, [data, filter]);

  if (loading) return <PageSpinner label="Loading your books" />;

  if (error) {
    return (
      <EmptyState
        icon="close"
        title="We couldn't load your books"
        description={error.message}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }

  const { books, summary } = data;

  if (books.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="No books on your account yet"
        description="If you've already submitted a manuscript and expected to see it here, our team can check your account."
        action={<Button as={Link} to="/tickets/new">Ask the team</Button>}
      />
    );
  }

  return (
    <div className="books-page">
      <section className="books-page__totals" aria-label="Account totals">
        <div className="books-page__count">
          <strong>{formatNumber(summary.copiesSold)}</strong>
          <span>copies sold across {summary.titles} {summary.titles === 1 ? "title" : "titles"}</span>
        </div>
        <RoyaltySummary earned={summary.royaltyEarned} paid={summary.royaltyPaid} pending={summary.royaltyPending} />
      </section>

      {summary.inProduction > 0 && (
        <SegmentedControl label="Filter books" name="book-filter" options={FILTERS} value={filter} onChange={setFilter} />
      )}

      <div className="books-page__list">
        {visible.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </div>
  );
}