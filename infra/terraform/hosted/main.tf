locals {
  effective_quota_project_id = coalesce(var.quota_project_id, var.project_id)
  hosted_frontend_origins = [
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
  ]
}

module "firestore" {
  source = "./modules/firestore"

  project_id              = var.project_id
  firestore_location      = var.region
  firestore_database_name = var.firestore_database_name
}

module "firebase_frontend" {
  source = "./modules/firebase-frontend"

  project_id           = var.project_id
  web_app_display_name = var.firebase_web_app_display_name
  authorized_domains   = local.hosted_frontend_origins

  depends_on = [module.firestore]
}

module "cloud_run_backend" {
  source = "./modules/cloud-run-backend"

  project_id               = var.project_id
  region                   = var.region
  service_name             = var.cloud_run_service_name
  artifact_repository_name = var.artifact_repository_name
  container_image          = var.cloud_run_container_image
  allow_public_invocation  = true
  allowed_origins          = local.hosted_frontend_origins
  invoker_principal        = var.cloud_run_invoker_principal
  max_instance_count       = var.cloud_run_max_instance_count
  min_instance_count       = var.cloud_run_min_instance_count

  depends_on = [module.firestore, module.firebase_frontend]
}
