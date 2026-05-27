#!/bin/sh
set -e
echo "Starting Celery worker..."
exec "$@"
