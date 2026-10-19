# BookLeaf Author Support & Communication Portal

A web app that helps BookLeaf's operations team answer author support queries faster and more consistently. Authors raise tickets about royalties, ISBNs, printing, distribution and production status. The system classifies and prioritises each ticket with AI and drafts a reply from the BookLeaf knowledge base. A human always reviews and sends the reply.

**Live demo:** `<ADD DEPLOYED URL>`  
**API docs:** `<ADD LINK TO openapi.yaml / Postman collection, or see "API" below>`

## Test logins

| Role | Email | Password |
|---|---|---|
| Admin | `<ADD ADMIN EMAIL>` | `<ADD PASSWORD>` |
| Author | `priya.sharma@email.com` | `<ADD PASSWORD>` |
| Author, book in production | `sneha.kulkarni@email.com` | `<ADD PASSWORD>` |
| Author, zero payouts | `ananya.reddy@email.com` | `<ADD PASSWORD>` |

All 10 authors and 18 books from the provided dataset are seeded.

## Features

**Author portal**
- Email/password login. Each author sees only their own data.
- **My Books:** title, ISBN, genre, publication date, status, MRP, copies sold, royalty earned / paid / pending. Books in production show a stage tracker instead of sales figures. Payout state (none, partial, settled, rollover under the ₹1,000 threshold) is computed on the server.
- **Submit a query:** book dropdown (or General / Account Level), subject, description, optional attachment (UI only).
- **My Tickets:** status, original query and admin replies, updated live without a page refresh.

**Admin portal**
- Ticket queue filterable by status, category, priority, assignee and date. Unresolved tickets sort first, then by urgency, then by age.
- AI category and priority for every ticket, with a one-line reason. The admin can override both. An admin choice is never overwritten by the AI.
- AI-drafted reply built from the knowledge base and the author's real book data. Editable before sending.
- Status updates, assignment, and internal notes the author never sees.

## Architecture

```
React client  ──HTTP/JSON──▶  Express API  ──Prisma──▶  PostgreSQL
      ▲                          │   │
      └────── SSE (events) ──────┘   └── AI layer ──▶ LLM API
```

The API follows a layered design:

```
routes → controllers → services → repositories → database
                         └── ai/ (classifier, drafter, fallback, cache)
```

- **Routes** declare paths, auth, role checks and validation.
- **Controllers** are thin: validated input in, one service call, HTTP response out.
- **Services** hold business rules (access scoping, status transitions, payout logic).
- **Repositories** are the only code that touches Prisma.

### Key decisions

- **Ticket creation never waits on AI.** The ticket is saved and returned immediately. An in-process event bus triggers classification in the background (`jobs/ticketAiProcessor.js`). Tickets left unclassified by a crash are picked up on the next start and every 5 minutes.
- **Real-time via Server-Sent Events.** Events carry only a ticket id, and clients refetch. No ticket content travels on the stream, and `realtime.service.js` is the single place that decides who may hear what (authors: their own tickets only, never staff-only changes).
- **404, not 403,** when an author asks for someone else's ticket or book, so ids can't be probed.
- **Authors never see admin names.** Replies show as "BookLeaf Support".
- **Duplicate-submit protection.** An identical ticket from the same author within 2 minutes returns the original.
- **Graceful shutdown.** Open SSE streams are ended, in-flight requests finish within a grace period, then the database disconnects.

## AI integration

| Concern | Approach |
|---|---|
| Classification | One call returns category and priority together (half the cost of two). Output is validated against our own enums, never trusted. |
| Policy rules | `enforcePolicyFloors` applies business minimums on top of the model (for example, ISBN errors are at least High priority). |
| Drafting | The prompt contains the tone guidelines, only the knowledge-base section for the ticket's category, the relevant book's data and recent messages. It does not contain the full knowledge base or full ticket history. |
| Cost control | Classification results are cached by hash of the prompt version and normalised text. Drafts are cached and only regenerated on request. Token limits are set per call. |
| Failure handling | If the AI is down, rate-limited, slow or returns something unusable, keyword rules classify the ticket and the draft endpoint returns `503 AI_UNAVAILABLE`. Admins can always write replies by hand. |
| Key security | The API key lives in environment variables on the server only. It is never sent to the client. |
| Model choice | `<ADD MODEL NAME>`: `<ONE-LINE JUSTIFICATION: cost, latency, reliable structured output>` |

## Tech stack

- **Frontend:** React (`<Vite / CRA>`)
- **Backend:** Node.js, Express
- **Database:** PostgreSQL via Prisma
- **Auth:** JWT (HS256, pinned algorithm), bcrypt password hashing
- **Real time:** Server-Sent Events
- **AI:** `<PROVIDER / MODEL>`

## Project structure

```
server/
├── server.js                  # boot, DB retry, graceful shutdown
├── app.js                     # express app, middleware, routes
├── config/                    # env validation, constants, prisma client
├── routes/                    # path + auth + validation wiring
├── controllers/               # HTTP in/out only
├── services/
│   ├── ai/                    # classifier, drafter, fallback rules, cache, prompts, knowledge base
│   ├── auth.service.js
│   ├── books.service.js
│   ├── tickets.service.js
│   ├── admin.tickets.service.js
│   └── realtime.service.js
├── repositories/              # all database access
├── jobs/ticketAiProcessor.js  # background classification + recovery
├── middleware/                # authenticate, authorize, validate, rateLimiter, errorHandler
└── utils/                     # AppError, jwt, logger, event bus, asyncHandler
client/                        # React app
```

## Getting started

**Prerequisites:** Node.js 20+, PostgreSQL 14+, an API key for your AI provider.

```bash
# 1. Clone
git clone <REPO URL>
cd <REPO NAME>

# 2. Backend
cd server
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate dev      # create tables
npx prisma generate
npm run seed                # load the 10 authors and 18 books
npm run dev                 # API on http://localhost:<PORT>

# 3. Frontend (new terminal)
cd client
npm install
npm run dev
```

### Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `12h` |
| `PORT` | API port |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Allowed frontend origin(s) |
| `AI_MODEL` | Model name |
| `<AI API KEY NAME>` | Provider API key. **Server only. Never commit it.** |
| `DB_CONNECT_ATTEMPTS`, `DB_CONNECT_DELAY_MS` | Startup retry for managed databases |
| `SHUTDOWN_GRACE_MS` | Time allowed for in-flight requests on shutdown |

The server validates its configuration on startup and exits with a clear message if something is missing.

## API

All routes except login require `Authorization: Bearer <token>`. Errors return `{ error, code, details? }` with an appropriate status (400, 401, 403, 404, 409, 422, 503).

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` returns `{ token, user }` |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/books` | any | Author: own books plus summary. Admin: all (`?authorId=`) |
| GET | `/api/books/:id` | any | One book (404 if not yours) |
| GET | `/api/tickets` | author | Own tickets |
| POST | `/api/tickets` | author | `{ bookId?, subject, description }` |
| GET | `/api/tickets/:id` | author | Own ticket with messages |
| GET | `/api/admin/tickets` | admin | Queue. Filters: `status, category, priority, assignee, from, to, sort` |
| GET | `/api/admin/tickets/:id` | admin | Full detail with internal notes and AI reasons |
| PATCH | `/api/admin/tickets/:id` | admin | Update status, category, priority, assignee |
| POST | `/api/admin/tickets/:id/messages` | admin | `{ body, resolve? }` replies to the author |
| POST | `/api/admin/tickets/:id/notes` | admin | Internal note |
| POST | `/api/admin/tickets/:id/draft` | admin | AI draft (`{ regenerate? }`), 503 if AI is unavailable |
| GET | `/api/events` | any | Server-Sent Events stream, scoped by role |

> Check this table against your `routes/*.js` before publishing.

## Security

- Passwords hashed with bcrypt. Login takes the same time and returns the same message for an unknown email and a wrong password.
- JWT algorithm is pinned on sign and verify.
- Role checks on every protected route. Authors are scoped to their own `authorId` from the token, never from the request body.
- Input validation on every write endpoint. Rate limiting on login (and AI endpoints).
- Presenters build responses field by field, so password hashes and internal fields can't leak.

## Known limitations and next steps

- Attachments are UI-only. Production would use object storage (S3) with signed URLs.
- The event bus and SSE fan-out are in-process. Running several instances needs Redis pub/sub and a real job queue (for example BullMQ).
- No automated test suite yet. First targets: author-isolation checks, validation, and AI-fallback behaviour.
- Authors can't see per-platform royalty breakdowns yet (the dataset only has totals).
- No password reset, email notifications or audit log.

## Author

`<YOUR NAME>` · `<EMAIL>` · `<LINKEDIN / GITHUB>`
