import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { loginBody } from "../validators/auth.schema.js";
import { login, me } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginLimiter, validate({ body: loginBody }), login); // public by necessity
router.get("/me", authenticate, me);

export default router;