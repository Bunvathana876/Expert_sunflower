"""Execute the master 20-disease and 62-symptom seed SQL script.

Loads:
- 20 comprehensive botanical sunflower diseases (fungal, bacterial, oomycete, viral, parasitic)
- 62 distinct clinical symptoms mapped across plant anatomy
- Complete bilingual translations (English & Khmer)
- Calibrated symptom weights, required indicators, and pathognomonic triggers
"""

from __future__ import annotations

import asyncio
from pathlib import Path
import sys

from sqlalchemy import text
from app.db.session import async_session_factory


async def run_master_seed() -> None:
    """Read and execute seed_20_diseases_and_symptoms.sql in an async transaction."""
    sql_path = Path(__file__).parent / "seed_20_diseases_and_symptoms.sql"
    if not sql_path.exists():
        print(f"Error: {sql_path} does not exist.", file=sys.stderr)
        sys.exit(1)

    print(f"Reading SQL seed file from: {sql_path}")
    raw_sql = sql_path.read_text(encoding="utf-8")

    async with async_session_factory() as session:
        print("Executing master SQL seed script...")
        # Execute raw SQL block
        await session.execute(text(raw_sql))
        await session.commit()
        print("✅ Successfully seeded 20 diseases and 62 symptoms into the database!")


def main() -> None:
    try:
        asyncio.run(run_master_seed())
    except Exception as exc:
        print(f"❌ Failed to seed 20 diseases: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
