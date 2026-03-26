output "service_name" {
  description = "Deployed Cloud Run backend service name."
  value       = google_cloud_run_v2_service.backend.name
}

output "service_uri" {
  description = "Cloud Run backend URI. The service remains IAM-protected by default."
  value       = google_cloud_run_v2_service.backend.uri
}

output "invoker_principal" {
  description = "IAM principal allowed to invoke the private backend service."
  value       = google_cloud_run_v2_service_iam_member.private_invoker.member
}
