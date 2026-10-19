import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { streamEvents } from "../controllers/events.controller.js";

const router = Router();

// Any signed-in role; what each role receives is decided inside the realtime service.
router.get("/", authenticate, streamEvents);

export default router;