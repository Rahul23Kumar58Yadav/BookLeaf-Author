import { AppError } from "../utils/AppError.js";

/** validate({ params, query, body }): replaces each part with the parsed (coerced, stripped) value. */
export const validate = (schemas) => (req, _res, next) => {
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    // A request with no body leaves req.body undefined; treat it as {} so errors name the missing fields
    const result = schemas[part].safeParse(part === "body" ? req.body ?? {} : req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
      return next(AppError.badRequest("Validation failed", details));
    }
    // req.query is getter-only in Express 5, so define the property instead of assigning
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
  }
  next();
};