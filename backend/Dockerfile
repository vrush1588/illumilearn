FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Use PORT env variable (Cloud Run sets this automatically)
ENV PORT=8080

EXPOSE 8080

# Start server
CMD uvicorn main:app --host 0.0.0.0 --port $PORT