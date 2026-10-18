FROM python:3.12-slim
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py .
RUN chown -R appuser:appuser /app
USER appuser
ENTRYPOINT ["python"]
CMD ["migrate_customers.py"]
