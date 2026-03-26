variable "project_id" {
  description = "Existing GCP project id for the hosted environment."
  type        = string
}

variable "region" {
  description = "Shared region for hosted resources in this environment."
  type        = string
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

variable "artifact_repository_name" {
  description = "Artifact Registry Docker repository name for backend images."
  type        = string
  default     = "mona-proctor"
}

variable "cloud_run_container_image" {
  description = "Container image URI to deploy to Cloud Run."
  type        = string
}

variable "cloud_run_invoker_principal" {
  description = "IAM principal allowed to invoke the private Cloud Run service for operator validation."
  type        = string
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
