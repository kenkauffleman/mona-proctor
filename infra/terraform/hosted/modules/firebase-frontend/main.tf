resource "google_project_service" "required" {
  provider = google-beta

  for_each = toset([
    "firebasehosting.googleapis.com",
    "identitytoolkit.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_identity_platform_config" "auth" {
  provider = google-beta
  project  = var.project_id

  sign_in {
    email {
      enabled           = true
      password_required = true
    }
  }

  authorized_domains = var.authorized_domains

  depends_on = [google_project_service.required]
}

resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = var.web_app_display_name

  depends_on = [google_project_service.required]
}

data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.frontend.app_id
}
