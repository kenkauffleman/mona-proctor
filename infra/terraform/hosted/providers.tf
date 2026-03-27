provider "google" {
  project               = var.project_id
  region                = var.region
  billing_project       = local.effective_quota_project_id
  user_project_override = true
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  billing_project       = local.effective_quota_project_id
  user_project_override = true
}
