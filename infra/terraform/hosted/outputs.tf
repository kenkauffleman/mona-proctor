output "artifact_repository_name" {
  description = "Artifact Registry repository for backend images."
  value       = module.cloud_run_backend.artifact_repository_name
}

output "artifact_repository_url" {
  description = "Artifact Registry Docker repository URL prefix for backend images."
  value       = module.cloud_run_backend.artifact_repository_url
}

output "firestore_database" {
  description = "Provisioned Firestore database metadata."
  value       = module.firestore.firestore_database
}

output "firestore_rules_release" {
  description = "Firestore rules release name published from the repo-managed rules file."
  value       = module.firestore.firestore_rules_release
}

output "service_name" {
  description = "Deployed Cloud Run backend service name."
  value       = module.cloud_run_backend.service_name
}

output "service_uri" {
  description = "Cloud Run backend URI. The service remains IAM-protected by default."
  value       = module.cloud_run_backend.service_uri
}
