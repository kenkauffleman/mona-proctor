output "firestore_database" {
  description = "Provisioned Firestore database metadata."
  value = {
    name        = google_firestore_database.default.name
    location_id = google_firestore_database.default.location_id
    project_id  = var.project_id
    type        = google_firestore_database.default.type
  }
}

output "firestore_rules_release" {
  description = "Firestore rules release name published from the repo-managed rules file."
  value       = google_firebaserules_release.firestore.name
}
