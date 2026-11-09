# syntax=docker/dockerfile:1
# Agente de demonstração: roda no servidor para o dashboard sempre ter dados.
# Nos computadores monitorados de verdade, o agente roda direto no Windows/Linux.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Instala só as dependências de execução (pytest fica de fora).
COPY requirements.txt .
RUN grep -viE '^pytest' requirements.txt > requirements-runtime.txt \
  && pip install -r requirements-runtime.txt

COPY src ./src

# /data/agent guarda a fila de envios (outbox.db) quando o backend não responde.
ENV INFRAOBSERVER_DATA_DIR=/data/agent

RUN useradd --create-home --uid 10001 agent \
  && mkdir -p /data/monitored /data/agent \
  && chown agent:agent /data/monitored /data/agent
USER agent

CMD ["python", "-m", "src.main"]
