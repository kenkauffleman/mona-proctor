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
  description = "IAM principal allowed to invoke the private Cloud Run service for operator validation."
  type        = string
}

variable "max_instance_count" {
  description = "Maximum number of Cloud Run instances for this prototype backend."
  type        = number
}

variable "min_instance_count" {
  description = "Minimum number of Cloud Run instances for this prototype backend."
  type        = number
}
