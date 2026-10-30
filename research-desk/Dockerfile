FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RESEARCH_DESK_DB=/app/data/research_desk.sqlite3

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir .

RUN useradd --create-home --uid 10001 desk \
    && mkdir -p /app/data \
    && chown -R desk:desk /app
USER desk

VOLUME ["/app/data"]
CMD ["research-desk"]
