"""Prompt for the staging DB password without putting it in chat or shell history.

Run this script locally in an interactive terminal. It creates a protected
libpq password file outside the repository and refuses to overwrite one.
"""

from __future__ import annotations

import getpass
import os
from pathlib import Path


HOST = "aws-0-ap-southeast-2.pooler.supabase.com"
PORT = "5432"
DATABASE = "postgres"
USER = "postgres.ngnnyujzeuepxxkwtnpl"
TARGET = Path.home() / ".config" / "expert_sunflower" / "supabase_staging.pgpass"


def escape_field(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:")


def main() -> None:
    TARGET.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    TARGET.parent.chmod(0o700)
    if TARGET.exists() or TARGET.is_symlink():
        raise SystemExit(f"Protected password file already exists: {TARGET}")

    password = getpass.getpass("Supabase staging database password: ")
    if not password:
        raise SystemExit("No password entered; nothing was saved.")

    line = ":".join(escape_field(field) for field in (HOST, PORT, DATABASE, USER, password))
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(TARGET, flags, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(line + "\n")
            file.flush()
            os.fsync(file.fileno())
        TARGET.chmod(0o600)
    except BaseException:
        TARGET.unlink(missing_ok=True)
        raise

    print(f"Protected password file ready: {TARGET}")


if __name__ == "__main__":
    main()
