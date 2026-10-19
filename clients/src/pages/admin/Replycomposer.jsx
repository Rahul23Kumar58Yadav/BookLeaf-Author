import { useEffect, useId, useRef, useState } from "react";
import { Button, Icon, Modal, SegmentedControl, Spinner } from "../common";
import "./ReplyComposer.css";

const MAX = 5000;
const MODES = [
  { value: "reply", label: "Reply to author" },
  { value: "note", label: "Internal note" },
];

/**
 * Reply editor with an AI draft, plus an internal-note tab so a note can't be sent to the author by mistake.
 *
 * draft: { state: "idle" | "loading" | "ready" | "error", body?, code?, message? }
 * onGenerate / onRegenerate: ask the page to (re)fetch a draft
 * onSendReply({ body, resolve }) / onAddNote(body): async; throw to show the error inline
 *
 * Rule: an AI draft only fills the editor while the admin hasn't typed anything. Their edits are never overwritten
 * silently; "Regenerate" asks for confirmation first.
 */
export function ReplyComposer({ draft, onGenerate, onRegenerate, onSendReply, onAddNote, closed }) {
  const uid = useId();
  const [mode, setMode] = useState("reply");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [resolve, setResolve] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirty = useRef(false); // true once the admin has edited the reply text

  useEffect(() => {
    if (draft.state === "ready" && !dirty.current) setReply(draft.body);
  }, [draft.state, draft.body]);

  const isNote = mode === "note";
  const text = isNote ? note : reply;
  const tooLong = text.length > MAX;

  async function send() {
    const body = text.trim();
    if (!body) return setError(isNote ? "Write a note first." : "Write a reply first, or edit the draft.");
    if (tooLong) return setError(`Please keep it under ${MAX} characters.`);
    setError("");
    setSending(true);
    try {
      if (isNote) { await onAddNote(body); setNote(""); }
      else { await onSendReply({ body, resolve }); setReply(""); setResolve(false); dirty.current = false; }
    } catch (e) {
      setError(e.message || "That didn't go through. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function regenerate() {
    if (dirty.current && reply.trim()) return setConfirmOpen(true);
    onRegenerate();
  }

  return (
    <section className="composer" data-mode={mode}>
      <SegmentedControl label="Message type" name={`${uid}-mode`} options={MODES} value={mode} onChange={setMode} />

      {!isNote && <DraftBanner draft={draft} onGenerate={onGenerate} onRegenerate={regenerate} closed={closed} />}
      {isNote && <p className="composer__hint"><Icon name="lock" size={14} /> Only BookLeaf staff can see notes. The author never does.</p>}

      <textarea
        aria-label={isNote ? "Internal note" : "Reply to author"}
        rows={isNote ? 4 : 10}
        value={text}
        placeholder={isNote ? "Context for the team: what you checked, who you spoke to…" : "Write your reply…"}
        onChange={(e) => {
          if (isNote) setNote(e.target.value);
          else { setReply(e.target.value); dirty.current = true; }
          if (error) setError("");
        }}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }}
        aria-invalid={tooLong || undefined}
      />

      {error && <p className="composer__error" role="alert">{error}</p>}

      <div className="composer__actions">
        <small className="composer__count" data-over={tooLong || undefined}>{text.length}/{MAX} · Ctrl+Enter to send</small>
        {!isNote && (
          <label className="composer__resolve">
            <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} /> Mark as resolved
          </label>
        )}
        <Button onClick={send} loading={sending} variant={isNote ? "secondary" : "primary"}>
          {isNote ? "Add note" : resolve ? "Send & resolve" : "Send reply"}
        </Button>
      </div>

      <Modal
        open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Replace your edits?"
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Keep my text</Button>
          <Button onClick={() => { dirty.current = false; setConfirmOpen(false); onRegenerate(); }}>Replace with new draft</Button>
        </>}
      >
        <p>Generating a new draft will replace what's currently in the reply box.</p>
      </Modal>
    </section>
  );
}

function DraftBanner({ draft, onGenerate, onRegenerate, closed }) {
  if (draft.state === "loading") {
    return <p className="draft" data-state="loading" role="status"><Spinner size={16} label="Drafting" /> Drafting a reply from the BookLeaf knowledge base…</p>;
  }
  if (draft.state === "ready") {
    return (
      <p className="draft" data-state="ready">
        <Icon name="sparkle" size={16} />
        <span>AI draft. Check the facts and edit before sending. Nothing goes out until you press Send.</span>
        <Button variant="ghost" size="sm" onClick={onRegenerate}>Regenerate</Button>
      </p>
    );
  }
  if (draft.state === "error") {
    const down = draft.code === "AI_UNAVAILABLE";
    return (
      <p className="draft" data-state="error" role="alert">
        <span>{down ? "AI drafting isn't available right now. You can write the reply yourself, or try again in a moment." : draft.message}</span>
        <Button variant="secondary" size="sm" onClick={onGenerate}>Try again</Button>
      </p>
    );
  }
  return (
    <p className="draft" data-state="idle">
      <span>{closed ? "This ticket is no longer active, so no draft was prepared." : "No draft yet."}</span>
      <Button variant="secondary" size="sm" onClick={onGenerate}>Generate AI draft</Button>
    </p>
  );
}