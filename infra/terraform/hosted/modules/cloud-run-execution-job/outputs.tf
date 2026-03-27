output "job_name" {
  description = "Deployed Cloud Run execution job name."
  value       = google_cloud_run_v2_job.python_execution.name
}

output "runtime_service_account_email" {
  description = "Service account used by the execution job runtime."
  value       = google_service_account.execution_runtime.email
}
