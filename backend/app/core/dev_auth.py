import os

# Auth bypass for the current "development" phase.
#
# The frontend currently ships with auth disabled and sends a placeholder
# token, so the backend must accept it everywhere (including the Vercel
# deployment) for the app to work. This defaults to ON.
#
# To re-enable real authentication later, set the DEV_AUTH_DISABLED
# environment variable to "false" (and flip the matching frontend flag in
# frontend/src/config/auth.ts).
DEV_AUTH_DISABLED = os.getenv("DEV_AUTH_DISABLED", "true").lower() in {"1", "true", "yes", "on"}
