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

resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  deletion_protection = true

  template {
    timeout = "60s"

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
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "private_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = var.invoker_principal
}
