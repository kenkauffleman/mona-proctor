resource "google_project_service" "required" {
  provider = google-beta

  for_each = toset([
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_firebase_project" "project" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.required]
}

resource "google_firestore_database" "default" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = var.firestore_database_name
  location_id                 = var.firestore_location
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
  delete_protection_state     = "DELETE_PROTECTION_ENABLED"
  deletion_policy             = "ABANDON"

  depends_on = [google_firebase_project.project]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../../../../../firestore.rules")
    }
  }

  depends_on = [google_firebase_project.project]
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firestore_database.default]
}

resource "google_firestore_index" "execution_jobs_owner_created_at" {
  provider   = google-beta
  project    = var.project_id
  database   = var.firestore_database_name
  collection = "executionJobs"

  fields {
    field_path = "ownerUid"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firestore_index" "execution_jobs_owner_language_created_at" {
  provider   = google-beta
  project    = var.project_id
  database   = var.firestore_database_name
  collection = "executionJobs"

  fields {
    field_path = "ownerUid"
    order      = "ASCENDING"
  }

  fields {
    field_path = "language"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.default]
}
