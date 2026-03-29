resource "google_service_account" "execution_runtime" {
  project      = var.project_id
  account_id   = "${replace(var.job_name, "_", "-")}-runtime"
  display_name = "Mona Proctor execution runtime"
}

resource "google_project_iam_member" "execution_runtime_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.execution_runtime.email}"
}

resource "google_cloud_run_v2_job" "execution" {
  name     = var.job_name
  location = var.region

  deletion_protection = true

  template {
    task_count  = 1
    parallelism = 1

    template {
      timeout         = "${ceil(var.task_timeout_ms / 1000) + 5}s"
      max_retries     = 0
      service_account = google_service_account.execution_runtime.email

      containers {
        image = var.container_image

        dynamic "env" {
          for_each = merge({
            GCLOUD_PROJECT = var.project_id
          }, var.env_vars)

          content {
            name  = env.key
            value = env.value
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job_iam_member" "backend_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.execution.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.backend_runtime_service_account_email}"
}
