resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "backend_images" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository_name
  description   = "Docker images for the Mona Proctor backend service."
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "backend_runtime" {
  project      = var.project_id
  account_id   = "${replace(var.service_name, "_", "-")}-runtime"
  display_name = "Mona Proctor backend runtime"
}

resource "google_project_iam_member" "backend_runtime_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend_runtime.email}"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  deletion_protection = true

  template {
    timeout         = "60s"
    service_account = google_service_account.backend_runtime.email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      env {
        name  = "GCLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = join(",", var.allowed_origins)
      }

      env {
        name  = "EXECUTION_BACKEND"
        value = var.execution_backend
      }

      env {
        name  = "EXECUTION_CLOUD_RUN_PYTHON_JOB_NAME"
        value = var.execution_cloud_run_python_job_name
      }

      env {
        name  = "EXECUTION_CLOUD_RUN_JAVA_JOB_NAME"
        value = var.execution_cloud_run_java_job_name
      }

      env {
        name  = "EXECUTION_CLOUD_RUN_REGION"
        value = var.region
      }

      env {
        name  = "EXECUTION_CLOUD_RUN_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "EXECUTION_MAX_SOURCE_BYTES"
        value = tostring(var.execution_max_source_bytes)
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

      env {
        name  = "EXECUTION_GLOBAL_ACTIVE_JOB_LIMIT"
        value = tostring(var.execution_global_active_job_limit)
      }

      env {
        name  = "JAVA_EXECUTION_MAX_MEMORY_MB"
        value = tostring(var.java_execution_max_memory_mb)
      }

      env {
        name  = "JAVA_EXECUTION_MAX_SOURCE_BYTES"
        value = tostring(var.java_execution_max_source_bytes)
      }

      env {
        name  = "JAVA_EXECUTION_TIMEOUT_MS"
        value = tostring(var.java_execution_timeout_ms)
      }

      env {
        name  = "JAVA_EXECUTION_MAX_STDOUT_BYTES"
        value = tostring(var.java_execution_max_stdout_bytes)
      }

      env {
        name  = "JAVA_EXECUTION_MAX_STDERR_BYTES"
        value = tostring(var.java_execution_max_stderr_bytes)
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_artifact_registry_repository.backend_images,
    google_project_iam_member.backend_runtime_firestore_user,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_public_invocation ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "direct_invoker" {
  count = var.invoker_principal == null ? 0 : 1

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = var.invoker_principal
}
