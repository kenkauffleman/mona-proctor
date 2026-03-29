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

variable "env_vars" {
  description = "Environment variables injected into the execution job container."
  type        = map(string)
}

variable "task_timeout_ms" {
  description = "Cloud Run Job task timeout in milliseconds."
  type        = number
}

variable "job_name" {
  description = "Cloud Run Job name for execution."
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
