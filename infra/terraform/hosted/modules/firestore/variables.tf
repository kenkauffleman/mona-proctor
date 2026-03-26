variable "project_id" {
  description = "Existing GCP project id that will host Firestore."
  type        = string
}

variable "firestore_location" {
  description = "Firestore database location for the existing project."
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
