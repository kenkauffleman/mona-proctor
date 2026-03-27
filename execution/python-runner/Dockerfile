FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY execution/python-runner/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY execution/python-runner/runner.py ./runner.py

CMD ["python", "runner.py"]
