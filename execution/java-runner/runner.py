from __future__ import annotations

import os
import re
import selectors
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from typing import Optional

from google.cloud import firestore


EXECUTION_QUEUE_COLLECTION = os.environ.get("EXECUTION_QUEUE_COLLECTION", "executionQueue")
EXECUTION_JOBS_COLLECTION = os.environ.get("EXECUTION_JOBS_COLLECTION", "executionJobs")
EXECUTION_ACTIVE_USERS_COLLECTION = os.environ.get("EXECUTION_ACTIVE_USERS_COLLECTION", "executionActiveUsers")
EXECUTION_SYSTEM_COLLECTION = os.environ.get("EXECUTION_SYSTEM_COLLECTION", "executionSystem")
EXECUTION_SYSTEM_STATS_DOCUMENT = os.environ.get("EXECUTION_SYSTEM_STATS_DOCUMENT", "stats")
PACKAGE_PATTERN = re.compile(r"^\s*package\s+[A-Za-z_][A-Za-z0-9_.]*\s*;", re.MULTILINE)


def get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def decode_output(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def append_text_with_limit(base: str, suffix: str, limit: int) -> tuple[str, bool]:
    base_bytes = base.encode("utf-8")
    suffix_bytes = suffix.encode("utf-8")
    combined = base_bytes + suffix_bytes
    if len(combined) <= limit:
        return combined.decode("utf-8", errors="replace"), False
    return combined[:limit].decode("utf-8", errors="replace"), True


def claim_next_job(db: firestore.Client) -> Optional[dict]:
    queue_collection = db.collection(EXECUTION_QUEUE_COLLECTION)
    jobs_collection = db.collection(EXECUTION_JOBS_COLLECTION)

    for _attempt in range(10):
      queue_documents = list(queue_collection.limit(1).stream())
      if not queue_documents:
          return None

      queue_document = queue_documents[0]
      queue_reference = queue_document.reference
      job_reference = jobs_collection.document(queue_document.id)
      transaction = db.transaction()

      @firestore.transactional
      def _claim(transaction: firestore.Transaction):
          queue_snapshot = queue_reference.get(transaction=transaction)
          if not queue_snapshot.exists:
              return None

          job_snapshot = job_reference.get(transaction=transaction)
          if not job_snapshot.exists:
              transaction.delete(queue_reference)
              return None

          job = job_snapshot.to_dict()
          if job is None:
              raise RuntimeError(f"Execution job {queue_document.id} was empty.")

          if job.get("status") != "queued":
              transaction.delete(queue_reference)
              return None

          updated_at = now_iso()
          started_at = job.get("startedAt") or updated_at
          transaction.update(job_reference, {
              "status": "running",
              "startedAt": started_at,
              "updatedAt": updated_at,
          })
          transaction.delete(queue_reference)

          job["status"] = "running"
          job["startedAt"] = started_at
          job["updatedAt"] = updated_at
          return job

      claimed_job = _claim(transaction)
      if claimed_job is not None:
          return claimed_job

    return None


def capture_process_output(
    process: subprocess.Popen[bytes],
    timeout_ms: int,
    stdout_limit: int,
    stderr_limit: int,
) -> dict:
    selector = selectors.DefaultSelector()
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    seen = {"stdout": 0, "stderr": 0}
    limits = {"stdout": stdout_limit, "stderr": stderr_limit}
    started_at = time.monotonic()
    deadline = started_at + (timeout_ms / 1000)
    timed_out = False

    if process.stdout is not None:
        selector.register(process.stdout, selectors.EVENT_READ, "stdout")
    if process.stderr is not None:
        selector.register(process.stderr, selectors.EVENT_READ, "stderr")

    while selector.get_map():
        if not timed_out and time.monotonic() >= deadline:
            timed_out = True
            process.kill()

        events = selector.select(0.2)
        if not events and process.poll() is not None:
            break

        for key, _mask in events:
            stream = key.fileobj
            chunk = stream.read1(4096)
            if not chunk:
                selector.unregister(stream)
                stream.close()
                continue

            name = key.data
            seen[name] += len(chunk)
            room = limits[name] - len(buffers[name])
            if room > 0:
                buffers[name].extend(chunk[:room])

    return {
        "stdout": bytes(buffers["stdout"]),
        "stderr": bytes(buffers["stderr"]),
        "stdout_truncated": seen["stdout"] > len(buffers["stdout"]),
        "stderr_truncated": seen["stderr"] > len(buffers["stderr"]),
        "timed_out": timed_out,
        "return_code": process.wait(timeout=5),
        "duration_ms": int((time.monotonic() - started_at) * 1000),
    }


def execute_command(command: list[str], cwd: str, env: dict[str, str], timeout_ms: int, stdout_limit: int, stderr_limit: int) -> dict:
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return capture_process_output(process, timeout_ms, stdout_limit, stderr_limit)


def build_result(capture: dict, stderr_limit: int) -> dict:
    result = {
        "status": "timed_out" if capture["timed_out"] else ("succeeded" if capture["return_code"] == 0 else "failed"),
        "stdout": decode_output(capture["stdout"]),
        "stderr": decode_output(capture["stderr"]),
        "exitCode": capture["return_code"],
        "durationMs": capture["duration_ms"],
        "truncated": capture["stdout_truncated"] or capture["stderr_truncated"],
    }
    if result["status"] == "timed_out":
        stderr, truncated = append_text_with_limit(
            result["stderr"],
            f"\nExecution timed out after {os.environ.get('JAVA_EXECUTION_TIMEOUT_MS', '6000')} ms.",
            stderr_limit,
        )
        result["stderr"] = stderr
        result["truncated"] = result["truncated"] or truncated
    return result


def complete_job(db: firestore.Client, job: dict, result: dict) -> None:
    jobs_collection = db.collection(EXECUTION_JOBS_COLLECTION)
    active_users_collection = db.collection(EXECUTION_ACTIVE_USERS_COLLECTION)
    system_stats_reference = db.collection(EXECUTION_SYSTEM_COLLECTION).document(EXECUTION_SYSTEM_STATS_DOCUMENT)
    queue_reference = db.collection(EXECUTION_QUEUE_COLLECTION).document(job["jobId"])
    job_reference = jobs_collection.document(job["jobId"])
    owner_active_reference = active_users_collection.document(job["ownerUid"])
    transaction = db.transaction()

    @firestore.transactional
    def _complete(transaction: firestore.Transaction):
        job_snapshot = job_reference.get(transaction=transaction)
        active_snapshot = owner_active_reference.get(transaction=transaction)
        stats_snapshot = system_stats_reference.get(transaction=transaction)

        if not job_snapshot.exists:
            raise RuntimeError(f"Execution job {job['jobId']} disappeared before completion.")

        job_document = job_snapshot.to_dict()
        if job_document is None:
            raise RuntimeError(f"Execution job {job['jobId']} was empty during completion.")

        completed_at = now_iso()
        transaction.update(job_reference, {
            "status": result["status"],
            "result": result,
            "errorMessage": result["stderr"] if result["status"] == "error" else None,
            "completedAt": completed_at,
            "updatedAt": completed_at,
            "startedAt": job_document.get("startedAt") or completed_at,
        })
        transaction.delete(queue_reference)

        active_document = active_snapshot.to_dict() if active_snapshot.exists else None
        if active_document and active_document.get("jobId") == job["jobId"]:
            transaction.delete(owner_active_reference)

        stats_document = stats_snapshot.to_dict() if stats_snapshot.exists else {}
        active_job_count = int(stats_document.get("activeJobCount", 0))
        transaction.set(system_stats_reference, {
            "activeJobCount": max(0, active_job_count - 1),
            "updatedAt": completed_at,
        })

    _complete(transaction)


def execute_java(job: dict) -> dict:
    if job["language"] != "java":
        raise RuntimeError(f"Java runner received unsupported language {job['language']}.")

    timeout_ms = int(os.environ.get("JAVA_EXECUTION_TIMEOUT_MS", "6000"))
    stdout_limit = int(os.environ.get("JAVA_EXECUTION_MAX_STDOUT_BYTES", "8192"))
    stderr_limit = int(os.environ.get("JAVA_EXECUTION_MAX_STDERR_BYTES", "6144"))
    max_memory_mb = int(os.environ.get("JAVA_EXECUTION_MAX_MEMORY_MB", "128"))

    if PACKAGE_PATTERN.search(job["source"]):
        stderr, truncated = append_text_with_limit("", "Packages are not supported in this phase.\n", stderr_limit)
        return {
            "status": "failed",
            "stdout": "",
            "stderr": stderr,
            "exitCode": 1,
            "durationMs": 0,
            "truncated": truncated,
        }

    started_at = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="mona-proctor-java-exec-") as working_directory:
        source_path = os.path.join(working_directory, "Main.java")
        with open(source_path, "w", encoding="utf-8") as source_file:
            source_file.write(job["source"])

        environment = {
            "HOME": working_directory,
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": os.environ.get("PATH", ""),
        }

        compile_capture = execute_command(["javac", "Main.java"], working_directory, environment, timeout_ms, stdout_limit, stderr_limit)
        compile_result = build_result(compile_capture, stderr_limit)
        compile_result["durationMs"] = int((time.monotonic() - started_at) * 1000)
        if compile_result["status"] != "succeeded":
            return compile_result

        remaining_timeout_ms = max(1, timeout_ms - int((time.monotonic() - started_at) * 1000))
        run_capture = execute_command(["java", f"-Xmx{max_memory_mb}m", "Main"], working_directory, environment, remaining_timeout_ms, stdout_limit, stderr_limit)
        run_result = build_result(run_capture, stderr_limit)
        run_result["durationMs"] = int((time.monotonic() - started_at) * 1000)
        return run_result


def main() -> int:
    project_id = get_required_env("GCLOUD_PROJECT")
    db = firestore.Client(project=project_id)

    print("Java runner starting.")
    job = claim_next_job(db)
    if job is None:
        print("No queued execution jobs found.")
        return 0

    print(f"Claimed execution job {job['jobId']} for {job['language']}.")
    try:
        result = execute_java(job)
    except Exception as error:
        result = {
            "status": "error",
            "stdout": "",
            "stderr": str(error),
            "exitCode": None,
            "durationMs": None,
            "truncated": False,
        }

    complete_job(db, job, result)
    print(f"Completed execution job {job['jobId']} with status {result['status']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
