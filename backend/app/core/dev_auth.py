import os

# Authentication bypass flag. Defaults to OFF (real auth enforced).
# To temporarily enable the bypass in a local dev environment only, set
# the DEV_AUTH_DISABLED environment variable to "true" in your local
# .env.development.local file. Never set this to true in production.
DEV_AUTH_DISABLED = os.getenv("DEV_AUTH_DISABLED", "false").lower() in {"1", "true", "yes", "on"}
