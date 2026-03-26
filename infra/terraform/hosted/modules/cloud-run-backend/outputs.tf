output "artifact_repository_name" {
  description = "Artifact Registry repository for backend images."
  value       = google_artifact_registry_repository.backend_images.repository_id
}

output "artifact_repository_url" {
  description = "Artifact Registry Docker repository URL prefix for backend images."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_images.repository_id}"
}

output "service_name" {
  description = "Deployed Cloud Run backend service name."
  value       = google_cloud_run_v2_service.backend.name
}

output "service_uri" {
  description = "Cloud Run backend URI. The service remains IAM-protected by default."
  value       = google_cloud_run_v2_service.backend.uri
}
