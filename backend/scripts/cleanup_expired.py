"""CLI entrypoint for automated maintenance cleanup of expired operational records.

Usage:
  cd backend && python -m scripts.cleanup_expired
  cd backend && python -m scripts.cleanup_expired --dry-run
  cd backend && python -m scripts.cleanup_expired --json --ai-retention-hours 48
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections.abc import Sequence

import app.models  # noqa: F401  — ensure SQLAlchemy metadata is registered
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import async_session_factory, engine
from app.services.maintenance import MaintenanceCleanupResult, run_maintenance_cleanup


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.cleanup_expired",
        description=(
            "Safely prune expired AI action proposals, refresh tokens, and rate-limit "
            "events without touching active records."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and report candidate row counts without modifying database rows.",
    )
    parser.add_argument(
        "--ai-retention-hours",
        type=int,
        default=None,
        help="Hours past expires_at to retain terminal AI action rows (default: env or 24).",
    )
    parser.add_argument(
        "--token-retention-hours",
        type=int,
        default=None,
        help="Hours past revoked_at to retain revoked refresh tokens (default: env or 24).",
    )
    parser.add_argument(
        "--expired-token-grace-hours",
        type=int,
        default=None,
        help="Additional grace hours past expires_at before deleting expired tokens (default: 0).",
    )
    parser.add_argument(
        "--rate-limit-retention-hours",
        type=int,
        default=None,
        help="Additional hours past expires_at before deleting rate-limit events (default: 0).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Emit final summary as a single JSON line on stdout.",
    )
    return parser


async def execute_cli(argv: Sequence[str] | None = None) -> MaintenanceCleanupResult:
    args = build_parser().parse_args(argv)
    settings = get_settings()
    configure_logging(settings)

    try:
        async with async_session_factory() as session:
            result = await run_maintenance_cleanup(
                session,
                dry_run=args.dry_run,
                ai_action_retention_hours=args.ai_retention_hours,
                refresh_token_retention_hours=args.token_retention_hours,
                expired_token_grace_hours=args.expired_token_grace_hours,
                rate_limit_retention_hours=args.rate_limit_retention_hours,
            )
    finally:
        await engine.dispose()

    if args.json_output:
        print(json.dumps(result.to_dict(), sort_keys=True))

    return result


def main(argv: Sequence[str] | None = None) -> int:
    try:
        asyncio.run(execute_cli(argv))
        return 0
    except Exception:
        return 1


if __name__ == "__main__":
    sys.exit(main())
