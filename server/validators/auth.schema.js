import { z } from "zod";

export const loginBody = z.object({
  email: z.string({ required_error: "Enter your email", invalid_type_error: "Enter your email" })
    .trim().toLowerCase().email("Enter a valid email address").max(254),
  // No complexity rules on login: that belongs at password *creation*. Length cap stops oversized hashing work.
  password: z.string({ required_error: "Enter your password", invalid_type_error: "Enter your password" })
    .min(1, "Enter your password").max(200),
});