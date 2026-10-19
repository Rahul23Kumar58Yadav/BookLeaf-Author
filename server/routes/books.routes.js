import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { bookIdParams, listBooksQuery } from "../validators/book.schema.js";
import { getBook, listBooks } from "../controllers/books.controller.js";

const router = Router();

router.use(authenticate); // every books route needs a valid JWT; scoping happens in the service

router.get("/", validate({ query: listBooksQuery }), listBooks);
router.get("/:id", validate({ params: bookIdParams }), getBook);

export default router;