FROM eclipse-temurin:25-jdk

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m pip install --no-cache-dir --break-system-packages google-cloud-firestore==2.21.0

COPY execution/java-runner/runner.py ./runner.py

CMD ["python3", "runner.py"]
