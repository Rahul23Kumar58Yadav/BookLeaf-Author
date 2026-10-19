import { useId, useMemo, useRef, useState } from "react";
import { Button, Icon } from "../common";
import "./TicketForm.css";

const LIMITS = { subject: 120, descMin: 20, descMax: 2000, files: 3, fileBytes: 5 * 1024 * 1024 };
const ACCEPT = ["image/png", "image/jpeg", "application/pdf"];
const GENERAL = "general";

/** Returns { field: message } for anything invalid. Mirrors the server's zod rules; the server stays the authority. */
function validate({ subject, description }) {
  const e = {};
  if (!subject.trim()) e.subject = "Add a short subject so we can route this quickly.";
  else if (subject.length > LIMITS.subject) e.subject = `Keep the subject under ${LIMITS.subject} characters.`;

  if (description.trim().length < LIMITS.descMin) e.description = `Tell us a bit more (at least ${LIMITS.descMin} characters) so we can help without follow-up questions.`;
  else if (description.length > LIMITS.descMax) e.description = `Please keep this under ${LIMITS.descMax} characters.`;
  return e;
}

const prettySize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/**
 * Props:
 *  books            [{ id, title, isLive }]
 *  defaultBookId    preselect a book (e.g. from "Ask about this book")
 *  onSubmit(payload) async; payload = { bookId|null, subject, description, attachments: File[] }
 *                    Throw an error with `.details = [{ field, message }]` to show server-side field errors.
 * Attachments are UI-only for now: files are validated and listed, then handed to onSubmit untouched.
 */
export function TicketForm({ books = [], defaultBookId, onSubmit }) {
  const uid = useId();
  const [values, setValues] = useState({ bookId: defaultBookId ?? GENERAL, subject: "", description: "" });
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const errors = useMemo(() => validate(values), [values]);
  const shown = (f) => (touched[f] ? errors[f] : undefined) ?? serverErrors[f];

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (serverErrors[field]) setServerErrors(({ [field]: _drop, ...rest }) => rest);
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  function addFiles(list) {
    const next = [...files];
    let problem = "";
    for (const f of list) {
      if (!ACCEPT.includes(f.type)) problem = `${f.name}: only PNG, JPG or PDF files are supported.`;
      else if (f.size > LIMITS.fileBytes) problem = `${f.name} is over ${prettySize(LIMITS.fileBytes)}.`;
      else if (next.length >= LIMITS.files) problem = `You can attach up to ${LIMITS.files} files.`;
      else if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
    setFileError(problem);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ subject: true, description: true });
    setFormError("");
    if (Object.keys(errors).length) {
      // Move focus to the first problem so keyboard and screen-reader users land on it
      document.getElementById(`${uid}-${errors.subject ? "subject" : "description"}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        bookId: values.bookId === GENERAL ? null : values.bookId,
        subject: values.subject.trim(),
        description: values.description.trim(),
        attachments: files,
      });
    } catch (err) {
      if (err.details?.length) setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      else setFormError(err.message || "We couldn't submit your query. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="tform" onSubmit={handleSubmit} noValidate>
      <Field id={`${uid}-book`} label="What is this about?">
        <select id={`${uid}-book`} value={values.bookId} onChange={set("bookId")}>
          <option value={GENERAL}>General / Account level</option>
          {books.length > 0 && (
            <optgroup label="Your books">
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title}{b.isLive ? "" : " (in production)"}</option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>

      <Field id={`${uid}-subject`} label="Subject" error={shown("subject")}
        counter={`${values.subject.length}/${LIMITS.subject}`}>
        <input
          id={`${uid}-subject`} value={values.subject} onChange={set("subject")} onBlur={blur("subject")}
          maxLength={LIMITS.subject + 20} placeholder="e.g. No royalty received since publication"
          aria-invalid={!!shown("subject")} aria-describedby={`${uid}-subject-msg`}
        />
      </Field>

      <Field id={`${uid}-description`} label="What happened?" error={shown("description")}
        hint="Include dates, amounts or platform names if you have them. It helps us answer in one go."
        counter={`${values.description.length}/${LIMITS.descMax}`}>
        <textarea
          id={`${uid}-description`} rows={7} value={values.description} onChange={set("description")}
          onBlur={blur("description")} aria-invalid={!!shown("description")} aria-describedby={`${uid}-description-msg`}
        />
      </Field>

      <div className="field">
        <span className="field__label">Attachments <small>(optional)</small></span>
        <label
          className="drop" data-dragging={dragging || undefined}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles([...e.dataTransfer.files]); }}
        >
          <input ref={inputRef} type="file" multiple accept={ACCEPT.join(",")}
            onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} />
          <Icon name="upload" />
          <span><strong>Choose files</strong> or drop them here</span>
          <small>PNG, JPG or PDF · up to {LIMITS.files} files · {prettySize(LIMITS.fileBytes)} each</small>
        </label>
        <p className="field__hint">Reporting a print problem? Photos of the damaged copy let us arrange a free reprint sooner.</p>
        {fileError && <p className="field__error" role="alert">{fileError}</p>}

        {files.length > 0 && (
          <ul className="files">
            {files.map((f) => (
              <li key={f.name + f.size}>
                <Icon name="paperclip" size={16} />
                <span className="files__name">{f.name}</span>
                <small>{prettySize(f.size)}</small>
                <Button variant="ghost" size="icon" aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((all) => all.filter((x) => x !== f))}>
                  <Icon name="close" size={16} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formError && <p className="tform__error" role="alert">{formError}</p>}

      <div className="tform__actions">
        <Button type="submit" loading={submitting}>Send query</Button>
      </div>
    </form>
  );
}

/** Label + control + hint/error wiring. `children` must carry the matching id and aria-describedby. */
function Field({ id, label, hint, error, counter, children }) {
  return (
    <div className="field" data-invalid={!!error || undefined}>
      <div className="field__top">
        <label className="field__label" htmlFor={id}>{label}</label>
        {counter && <small className="field__counter">{counter}</small>}
      </div>
      {children}
      <p id={`${id}-msg`} className={error ? "field__error" : "field__hint"} role={error ? "alert" : undefined}>
        {error ?? hint}
      </p>
    </div>
  );
}