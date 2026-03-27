variable "project_id" {
  description = "Existing GCP project id for the hosted environment."
  type        = string
}

variable "region" {
  description = "Shared region for hosted resources in this environment."
  type        = string
}

variable "quota_project_id" {
  description = "Project used for quota and billing when Terraform calls client-based Google APIs."
  type        = string
  default     = null
}

variable "firestore_database_name" {
  description = "Firestore database name. Keep the default database for this phase."
  type        = string
  default     = "(default)"

  validation {
    condition     = var.firestore_database_name == "(default)"
    error_message = "Wave 9 only supports the default Firestore database named (default)."
  }
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name for the backend."
  type        = string
  default     = "mona-proctor-backend"
}

variable "firebase_web_app_display_name" {
  description = "Display name for the hosted Firebase web app."
  type        = string
  default     = "mona-proctor-web"
}

variable "artifact_repository_name" {
  description = "Artifact Registry Docker repository name for backend images."
  type        = string
  default     = "mona-proctor"
}

variable "cloud_run_container_image" {
  description = "Container image URI to deploy to Cloud Run."
  type        = string
}

variable "execution_cloud_run_container_image" {
  description = "Container image URI to deploy to the Python execution Cloud Run Job."
  type        = string
}

variable "execution_cloud_run_job_name" {
  description = "Cloud Run Job name for the Python execution prototype."
  type        = string
  default     = "mona-proctor-python-executor"
}

variable "execution_backend" {
  description = "Backend execution implementation name."
  type        = string
  default     = "cloud-run-job"
}

variable "execution_global_active_job_limit" {
  description = "Maximum number of active execution jobs across the system."
  type        = number
  default     = 10
}

variable "execution_max_source_bytes" {
  description = "Maximum UTF-8 source size accepted by the backend."
  type        = number
  default     = 16384
}

variable "execution_max_stderr_bytes" {
  description = "Maximum stderr bytes retained by the execution runner."
  type        = number
  default     = 4096
}

variable "execution_max_stdout_bytes" {
  description = "Maximum stdout bytes retained by the execution runner."
  type        = number
  default     = 8192
}

variable "execution_timeout_ms" {
  description = "Execution timeout in milliseconds."
  type        = number
  default     = 5000
}

variable "cloud_run_invoker_principal" {
  description = "Optional additional IAM principal allowed to invoke the backend service directly."
  type        = string
  default     = null
}

variable "cloud_run_max_instance_count" {
  description = "Maximum number of Cloud Run instances for this prototype backend."
  type        = number
  default     = 2
}

variable "cloud_run_min_instance_count" {
  description = "Minimum number of Cloud Run instances for this prototype backend."
  type        = number
  default     = 0
}
