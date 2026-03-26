module "firestore" {
  source = "./modules/firestore"

  project_id              = var.project_id
  firestore_location      = var.region
  firestore_database_name = var.firestore_database_name
}

module "cloud_run_backend" {
  source = "./modules/cloud-run-backend"

  project_id               = var.project_id
  region                   = var.region
  service_name             = var.cloud_run_service_name
  artifact_repository_name = var.artifact_repository_name
  container_image          = var.cloud_run_container_image
  invoker_principal        = var.cloud_run_invoker_principal
  max_instance_count       = var.cloud_run_max_instance_count
  min_instance_count       = var.cloud_run_min_instance_count

  depends_on = [module.firestore]
}
