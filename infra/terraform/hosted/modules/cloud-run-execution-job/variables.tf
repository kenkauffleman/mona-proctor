variable "artifact_repository_name" {
  description = "Artifact Registry Docker repository name for execution images."
  type        = string
}

variable "backend_runtime_service_account_email" {
  description = "Backend service account email that is allowed to trigger the execution job."
  type        = string
}

variable "container_image" {
  description = "Container image URI to deploy to the execution job."
  type        = string
}

variable "execution_global_active_job_limit" {
  description = "Maximum number of active execution jobs across the system."
  type        = number
}

variable "execution_max_source_bytes" {
  description = "Maximum UTF-8 source size accepted by the backend."
  type        = number
}

variable "execution_max_stderr_bytes" {
  description = "Maximum stderr bytes retained by the execution runner."
  type        = number
}

variable "execution_max_stdout_bytes" {
  description = "Maximum stdout bytes retained by the execution runner."
  type        = number
}

variable "execution_timeout_ms" {
  description = "Execution timeout in milliseconds."
  type        = number
}

variable "job_name" {
  description = "Cloud Run Job name for Python execution."
  type        = string
}

variable "project_id" {
  description = "Existing GCP project id that will host the execution job."
  type        = string
}

variable "region" {
  description = "Cloud Run region for the execution job."
  type        = string
}
