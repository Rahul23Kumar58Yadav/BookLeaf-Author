import { booksService } from "../services/books.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listBooks = asyncHandler(async (req, res) => {
  res.json(await booksService.list(req.user, req.query));
});

export const getBook = asyncHandler(async (req, res) => {
  res.json({ book: await booksService.get(req.user, req.params.id) });
});