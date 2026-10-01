# syntax=docker/dockerfile:1.7

# Stage 1: Base Runtime Engine
FROM python:3.13-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /workspace/app

# Stage 2: Dependencies Installation Layer
FROM base AS deps
WORKDIR /workspace/app
RUN uv venv /opt/venv --python /usr/local/bin/python
COPY pyproject.toml uv.lock* requirements*.txt* ./
RUN if [ -f uv.lock ]; then uv sync --frozen --no-install-project; elif [ -f pyproject.toml ]; then uv sync --no-install-project; elif [ -f requirements.txt ]; then uv pip install -r requirements.txt; fi

# Stage 3: Development Interactive Target
FROM deps AS development
WORKDIR /workspace/app
COPY . .
RUN if [ -f uv.lock ]; then uv sync --frozen; elif [ -f pyproject.toml ]; then uv sync; fi
CMD ["sleep", "infinity"]

# Stage 4: Automated Testing Target
FROM deps AS test
WORKDIR /workspace/app
COPY . .
ENTRYPOINT ["pytest"]
CMD ["-v"]

# Stage 5: Production Target
FROM base AS production
COPY --from=development /opt/venv /opt/venv
COPY . /workspace/app
WORKDIR /workspace/app
CMD ["python", "-m", "app"]
