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
  default     = "mona-proctor-backend"
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
  default     = 2
}

variable "min_instance_count" {
  description = "Minimum number of Cloud Run instances for this prototype backend."
  type        = number
  default     = 0
}
