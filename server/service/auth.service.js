import bcrypt from "bcryptjs";
import { userRepo } from "../repositories/user.repo.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";

// Compared against when the email doesn't exist, so "no such account" costs the same time as "wrong password".
// Otherwise response time would reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** The only shape of a user that ever leaves the server: never the password hash. */
const present = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, authorId: u.authorId });

export const authService = {
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    // One message for both failures: it must not say which of email/password was wrong
    if (!user || !matches) throw AppError.unauthorized("Incorrect email or password.");

    const safe = present(user);
    return { token: signToken(safe), user: safe };
  },

  /** Backs GET /auth/me. Re-checks the database, so a deleted account stops working even with a live token. */
  async getUser(id) {
    const user = await userRepo.findById(id);
    if (!user) throw AppError.unauthorized("This account no longer exists. Please sign in again.");
    return present(user);
  },
};