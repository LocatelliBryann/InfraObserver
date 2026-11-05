#!/bin/sh
set -e

# Aplica as migrations pendentes antes de subir a API.
echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting InfraObserver API..."
exec node dist/src/server.js
