"""
Vercel Blob storage client for a PRIVATE blob store.

Uploaded files are stored in Vercel Blob (persistent) instead of the local
filesystem, which is required on serverless platforms like Vercel where the
filesystem is read-only / ephemeral.

Private store semantics:
  - Upload:   PUT https://blob.vercel-storage.com/?pathname=<key>
              headers: authorization, x-api-version: 12, x-vercel-blob-access: private
  - Download: GET <blob url> with Authorization: Bearer <token>  (403 without auth)
  - Delete:   POST https://blob.vercel-storage.com/delete  {"urls": [...]}
"""
import os
import re
import requests
from typing import Optional

_API_BASE = "https://blob.vercel-storage.com"
_API_VERSION = "12"
_TIMEOUT = 30


def _token() -> Optional[str]:
    return os.environ.get("BLOB_READ_WRITE_TOKEN")


def is_enabled() -> bool:
    """Blob storage is used whenever a read/write token is configured."""
    return bool(_token())


def _sanitize_key(key: str) -> str:
    """Normalize a storage key into a safe blob pathname."""
    # Use forward slashes, strip leading/trailing slashes, collapse spaces
    key = key.replace("\\", "/").strip("/")
    key = re.sub(r"\s+", "_", key)
    # Remove any characters that are not path-safe
    key = re.sub(r"[^A-Za-z0-9._/\-]", "", key)
    return key


def upload_bytes(key: str, content: bytes, content_type: Optional[str] = None,
                 add_random_suffix: bool = True) -> str:
    """
    Upload bytes to the private blob store and return the blob URL.
    The returned URL is stored in the DB and later used for authenticated downloads.
    """
    token = _token()
    if not token:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is not configured")

    pathname = _sanitize_key(key)
    headers = {
        "authorization": f"Bearer {token}",
        "x-api-version": _API_VERSION,
        "x-vercel-blob-access": "private",
        "x-content-type": content_type or "application/octet-stream",
        "x-add-random-suffix": "1" if add_random_suffix else "0",
    }
    resp = requests.put(
        f"{_API_BASE}/?pathname={pathname}",
        headers=headers,
        data=content,
        timeout=_TIMEOUT,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Blob upload failed ({resp.status_code}): {resp.text[:300]}")
    return resp.json()["url"]


def download_bytes(url: str) -> bytes:
    """Fetch a private blob's contents using the read/write token for authorization."""
    token = _token()
    headers = {"authorization": f"Bearer {token}"} if token else {}
    resp = requests.get(url, headers=headers, timeout=_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(f"Blob download failed ({resp.status_code}) for {url}")
    return resp.content


def delete(url: str) -> None:
    """Delete a blob by URL. Best-effort; never raises."""
    token = _token()
    if not token or not url:
        return
    try:
        requests.post(
            f"{_API_BASE}/delete",
            headers={
                "authorization": f"Bearer {token}",
                "x-api-version": _API_VERSION,
                "content-type": "application/json",
            },
            json={"urls": [url]},
            timeout=_TIMEOUT,
        )
    except Exception:
        pass


def is_blob_url(path: Optional[str]) -> bool:
    """Return True if the stored path is a Vercel Blob URL rather than a local path."""
    return bool(path) and isinstance(path, str) and path.startswith("http") and "blob.vercel-storage.com" in path
