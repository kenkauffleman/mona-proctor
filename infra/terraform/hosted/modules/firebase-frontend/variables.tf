variable "project_id" {
  description = "Existing GCP project id that will host the Firebase frontend."
  type        = string
}

variable "web_app_display_name" {
  description = "Display name for the hosted Firebase web app."
  type        = string
}

variable "authorized_domains" {
  description = "Explicit Firebase Auth authorized domains for the hosted frontend."
  type        = list(string)
}
