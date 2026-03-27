resource "google_service_account" "execution_runtime" {
  project      = var.project_id
  account_id   = "${replace(var.job_name, "_", "-")}-runtime"
  display_name = "Mona Proctor Python execution runtime"
}

resource "google_project_iam_member" "execution_runtime_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.execution_runtime.email}"
}

resource "google_cloud_run_v2_job" "python_execution" {
  name     = var.job_name
  location = var.region

  deletion_protection = true

  template {
    task_count  = 1
    parallelism = 1

    template {
      timeout         = "${ceil(var.execution_timeout_ms / 1000) + 5}s"
      max_retries     = 0
      service_account = google_service_account.execution_runtime.email

      containers {
        image = var.container_image

        env {
          name  = "GCLOUD_PROJECT"
          value = var.project_id
        }

        env {
          name  = "EXECUTION_TIMEOUT_MS"
          value = tostring(var.execution_timeout_ms)
        }

        env {
          name  = "EXECUTION_MAX_STDOUT_BYTES"
          value = tostring(var.execution_max_stdout_bytes)
        }

        env {
          name  = "EXECUTION_MAX_STDERR_BYTES"
          value = tostring(var.execution_max_stderr_bytes)
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job_iam_member" "backend_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.python_execution.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.backend_runtime_service_account_email}"
}
