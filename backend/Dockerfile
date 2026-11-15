# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Development target (used by docker-compose.yml with bind-mount & --reload)
# ---------------------------------------------------------------------------
FROM base AS dev

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[dev]"

COPY . .
RUN mkdir -p /var/lib/sunflower/media

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health/ready || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ---------------------------------------------------------------------------
# Wheel builder stage for lean production runtime
# ---------------------------------------------------------------------------
FROM base AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY ai ./ai
COPY scripts ./scripts

RUN pip install --upgrade pip \
 && pip wheel --wheel-dir /wheels .

# ---------------------------------------------------------------------------
# Hardened non-root production target (used by docker-compose.prod.yml)
# ---------------------------------------------------------------------------
FROM base AS prod

RUN groupadd --gid 10001 sunflower \
 && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin sunflower

COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels sunflower-api \
 && rm -rf /wheels

COPY --chown=sunflower:sunflower alembic.ini pyproject.toml ./
COPY --chown=sunflower:sunflower alembic ./alembic
COPY --chown=sunflower:sunflower app ./app
COPY --chown=sunflower:sunflower ai ./ai
COPY --chown=sunflower:sunflower scripts ./scripts

RUN mkdir -p /var/lib/sunflower/media \
 && chown -R sunflower:sunflower /var/lib/sunflower /app

USER 10001:10001

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health/ready || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
