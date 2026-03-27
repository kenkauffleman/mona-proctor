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

output "frontend_hosting_origins" {
  description = "Hosted Firebase frontend origins allowed to call the backend."
  value       = module.firebase_frontend.hosting_origins
}

output "firebase_authorized_domains" {
  description = "Firebase Authentication authorized domains for the hosted frontend."
  value       = module.firebase_frontend.authorized_domains
}

output "firebase_web_app" {
  description = "Firebase web app configuration for the hosted frontend build."
  value       = module.firebase_frontend.web_app
}

output "service_name" {
  description = "Deployed Cloud Run backend service name."
  value       = module.cloud_run_backend.service_name
}

output "service_uri" {
  description = "Cloud Run backend URI. The service remains IAM-protected by default."
  value       = module.cloud_run_backend.service_uri
}
