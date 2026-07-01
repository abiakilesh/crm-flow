// Convert raw backend/database errors into safe, user-facing messages.
// Detailed error info stays in the browser console for debugging.
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = (err as { message?: string } | null)?.message?.toString() ?? "";
  if (import.meta.env.DEV) console.error(err);

  const lower = raw.toLowerCase();
  if (!raw) return fallback;
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (lower.includes("row-level security") || lower.includes("permission denied")) return "You don't have permission to perform this action.";
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) return "That record already exists.";
  if (lower.includes("violates not-null")) return "Please fill in all required fields.";
  if (lower.includes("foreign key")) return "Referenced record is missing or invalid.";
  if (lower.includes("jwt") || lower.includes("token")) return "Your session expired. Please sign in again.";
  if (lower.includes("network") || lower.includes("failed to fetch")) return "Network error. Please check your connection.";
  // Anything else: return the fallback, don't leak internals
  return fallback;
}