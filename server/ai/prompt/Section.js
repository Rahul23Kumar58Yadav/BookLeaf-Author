/**
 * BookLeaf knowledge base, as given in the brief. The model may only state policy that appears here,
 * so wording stays close to the source. Edit here (and KB_VERSION changes automatically, which invalidates cached drafts).
 */
export const SECTIONS = {
  company: `Company overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Publishing packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid, with marketing and distribution add-ons).
- BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management.
- The in-house printing facility and warehouse are in Delhi. Print partners include Repro India and Epitome Books.`,

  royalty: `Royalty policy:
- 80/20 split: 80% of net profit per book goes to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold: ₹1,000. Below this, accumulated royalties roll over to the next quarter.
- Payouts are made by bank transfer to the account linked in the author's dashboard.
- Authors can view a detailed royalty breakdown in their dashboard, with sales figures per platform.`,

  isbn: `ISBN policy:
- Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.
- ISBNs are registered under BookLeaf's publisher imprint. An author who wants an ISBN under their own imprint must obtain it independently.
- An ISBN error (duplicate, wrong book linked) is treated as high priority and escalated to the production team.`,

  metadata: `Metadata updates:
- Updates to a live book's metadata (such as its description) can be submitted through the dashboard or by emailing the BookLeaf team.
- Changes typically reflect on platforms within 3-5 business days.`,

  printing: `Printing and quality:
- In-house printing handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
- Standard print turnaround is 5-7 business days from order confirmation.
- For a quality issue (misprints, binding defects, colour inconsistency) BookLeaf arranges a free reprint after verification. The author may need to share photos of the defective copy.`,

  distribution: `Distribution and availability:
- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings typically go live within 7-10 business days after publication is complete.
- A book showing as unavailable on a platform usually indicates a stock sync issue. BookLeaf's team can trigger a re-sync within 24-48 hours.`,

  production: `Production stages:
- Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
- Authors are updated at each stage by email.
- Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).`,
};

/** Which sections each category needs. Everything else is left out of the prompt to keep tokens down. */
export const SECTIONS_BY_CATEGORY = {
  royalty_payments: ["royalty"],
  isbn_metadata: ["isbn", "metadata"],
  printing_quality: ["printing"],
  distribution: ["distribution"],
  book_status: ["production"],
  general: ["company", "metadata"],
};

/** How BookLeaf handles each kind of query, taken from the brief's sample table. */
export const GUIDANCE = {
  royalty_payments: `- Acknowledge the frustration first.
- For "no royalty yet": explain the quarterly cycle and the 45-day payout window, mention that bank details must be linked in the dashboard, and give the specific payout date from the facts. If the facts say the payout is overdue, own it and escalate with a 48-hour resolution timeline.
- For "amount seems too low": explain net profit (MRP minus printing, platform commission and shipping), offer a detailed line-by-line royalty breakdown, and don't be defensive. Be transparent.`,
  isbn_metadata: `- Treat as high priority. Acknowledge that this is a serious data issue.
- Confirm you are escalating to the production team immediately and give a 48-hour resolution timeline.`,
  printing_quality: `- Apologise sincerely.
- Ask the author to share photos of the defective copies.
- Confirm BookLeaf will arrange a free reprint once verified, with a timeline of 5-7 business days for the reprint.`,
  distribution: `- Explain that this is typically a stock sync issue.
- Confirm you are triggering a re-sync with the distribution team and set the expectation: 24-48 hours for it to go live again.`,
  book_status: `- Use the actual production status from the facts. If it is delayed, be honest about why (for example waiting on author approval of proofs) and give a specific updated timeline.
- Never blame the author, even if the delay is on their side. Frame it collaboratively.`,
  general: `- Answer the question directly from the policies provided.
- For metadata updates: yes, they can be submitted through the dashboard or by emailing the team, and changes typically reflect on platforms within 3-5 business days.`,
};