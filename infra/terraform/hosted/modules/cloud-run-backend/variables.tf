variable "project_id" {
  description = "Existing GCP project id that will host the Cloud Run backend."
  type        = string
}

variable "region" {
  description = "Cloud Run region for the backend service."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name for the backend."
  type        = string
}

variable "artifact_repository_name" {
  description = "Artifact Registry Docker repository name for backend images."
  type        = string
}

variable "container_image" {
  description = "Container image URI to deploy to Cloud Run."
  type        = string
}

variable "invoker_principal" {
  description = "Optional additional IAM principal allowed to invoke the backend service directly."
  type        = string
  default     = null
}

variable "allow_public_invocation" {
  description = "Whether the backend should be publicly reachable at the network layer for browser clients."
  type        = bool
}

variable "allowed_origins" {
  description = "Exact browser origins allowed to call the backend."
  type        = list(string)
}

variable "execution_backend" {
  description = "Backend execution implementation name."
  type        = string
}

variable "execution_cloud_run_job_name" {
  description = "Cloud Run Job name used for Python execution."
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

variable "max_instance_count" {
  description = "Maximum number of Cloud Run instances for this prototype backend."
  type        = number
}

variable "min_instance_count" {
  description = "Minimum number of Cloud Run instances for this prototype backend."
  type        = number
}
