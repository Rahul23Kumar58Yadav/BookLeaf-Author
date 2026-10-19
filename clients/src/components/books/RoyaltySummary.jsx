import { formatDate, formatINR } from "../../utils/format";
import "./RoyaltySummary.css";

/**
 * Earned / paid / pending with a stacked bar. Used per book and, with totals, for the whole account.
 * `payout` (per-book only) adds a plain-language note explaining the payout situation.
 */
export function RoyaltySummary({ earned, paid, pending, payout }) {
  const hasEarnings = earned > 0;
  const paidPct = hasEarnings ? (paid / earned) * 100 : 0;
  const pendingPct = hasEarnings ? (pending / earned) * 100 : 0;

  return (
    <div className="royalty">
      <dl className="royalty__figures">
        <div><dt>Earned</dt><dd>{formatINR(earned)}</dd></div>
        <div><dt>Paid</dt><dd data-tone="paid">{formatINR(paid)}</dd></div>
        <div><dt>Pending</dt><dd data-tone="pending">{formatINR(pending)}</dd></div>
      </dl>

      {hasEarnings && (
        <div
          className="royalty__bar"
          role="img"
          aria-label={`${Math.round(paidPct)}% of earnings paid, ${Math.round(pendingPct)}% pending`}
          style={{ "--paid": paidPct, "--pending": pendingPct }}
        >
          <span className="royalty__seg" data-tone="paid" />
          <span className="royalty__seg" data-tone="pending" />
        </div>
      )}

      {payout && <p className="royalty__note">{payoutNote(payout, pending)}</p>}
    </div>
  );
}

/** Copy lives with the component; the server only supplies the state and the facts. */
function payoutNote({ state, rollover, lastPayoutDate, minThreshold }, pending) {
  if (state === "not_applicable") return "No royalties yet. Earnings appear here after your first sale.";
  if (state === "settled") return `Fully paid. Last payout on ${formatDate(lastPayoutDate)}.`;

  const rolloverText = rollover
    ? ` Your balance of ${formatINR(pending)} is below the ${formatINR(minThreshold)} minimum, so it rolls over to next quarter's payout.`
    : "";

  if (state === "none") {
    return `No payout yet. Royalties are calculated quarterly and paid within 45 days of the quarter ending.${rolloverText}`;
  }
  return `Last payout on ${formatDate(lastPayoutDate)}. The pending amount is paid in the next quarterly cycle.${rolloverText}`;
}