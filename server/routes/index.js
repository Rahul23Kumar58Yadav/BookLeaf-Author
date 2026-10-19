import { Router } from "express";
import adminTicketsRoutes from "./admin.tickets.routes.js";
import authRoutes from "./auth.routes.js";
import booksRoutes from "./books.routes.js";
import eventsRoutes from "./events.routes.js";
import ticketsRoutes from "./tickets.routes.js";

const api = Router();

api.get("/health", (_req, res) => res.json({ status: "ok" })); // for the host's health check; no auth, no data

api.use("/auth", authRoutes);
api.use("/books", booksRoutes);
api.use("/tickets", ticketsRoutes);
api.use("/admin/tickets", adminTicketsRoutes);
api.use("/events", eventsRoutes);

export default api; // app.js mounts this at /api