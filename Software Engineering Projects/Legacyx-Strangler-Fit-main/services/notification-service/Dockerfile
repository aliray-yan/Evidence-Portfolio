FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends librdkafka1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY notification_service.py .
RUN chown -R appuser:appuser /app
USER appuser
ENTRYPOINT ["python", "notification_service.py"]
