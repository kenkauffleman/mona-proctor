output "authorized_domains" {
  description = "Firebase Auth authorized domains configured for the hosted frontend."
  value       = google_identity_platform_config.auth.authorized_domains
}

output "hosting_origins" {
  description = "Default Firebase Hosting origins for the project."
  value = [
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
  ]
}

output "web_app" {
  description = "Hosted Firebase web app configuration for the static frontend build."
  value = {
    api_key     = data.google_firebase_web_app_config.frontend.api_key
    app_id      = google_firebase_web_app.frontend.app_id
    auth_domain = data.google_firebase_web_app_config.frontend.auth_domain
    project_id  = var.project_id
  }
}
