import os

DEV_AUTH_DISABLED = os.getenv("DEV_AUTH_DISABLED", "false").lower() in {"1", "true", "yes", "on"}
