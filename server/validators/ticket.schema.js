import { z } from "zod";
import { idString, singleLine, text } from "./common.js";

export const ticketIdParams = z.object({ id: idString() });

/**
 * Messages are written for people: TicketForm shows them under the matching field.
 * Limits mirror the client form (subject 120, description 20–2000).
 */
const SUBJECT_MSG = "Add a short subject so we can route this quickly.";
const DESC_MSG = "Tell us what's happening.";

export const createTicketBody = z.object({
  // null / absent = "General / Account level"
  bookId: idString("Choose one of your books, or General / Account level.").nullable().optional(),
  subject: singleLine(
    z.string({ required_error: SUBJECT_MSG, invalid_type_error: SUBJECT_MSG })
      .trim().min(1, SUBJECT_MSG).max(120, "Keep the subject under 120 characters.")
  ),
  description: text(
    z.string({ required_error: DESC_MSG, invalid_type_error: DESC_MSG })
      .trim().min(20, "Tell us a bit more (at least 20 characters) so we can help without follow-up questions.")
      .max(2000, "Please keep this under 2000 characters.")
  ),
});