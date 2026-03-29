locals {
  effective_quota_project_id = coalesce(var.quota_project_id, var.project_id)
  hosted_frontend_domains = [
    "${var.project_id}.web.app",
    "${var.project_id}.firebaseapp.com",
  ]
  hosted_frontend_origins = [
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
  ]
}

moved {
  from = module.cloud_run_execution_job
  to   = module.cloud_run_python_execution_job
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
  authorized_domains   = local.hosted_frontend_domains

  depends_on = [module.firestore]
}

module "cloud_run_backend" {
  source = "./modules/cloud-run-backend"

  project_id                          = var.project_id
  region                              = var.region
  service_name                        = var.cloud_run_service_name
  artifact_repository_name            = var.artifact_repository_name
  container_image                     = var.cloud_run_container_image
  allow_public_invocation             = true
  allowed_origins                     = local.hosted_frontend_origins
  invoker_principal                   = var.cloud_run_invoker_principal
  execution_backend                   = var.execution_backend
  execution_cloud_run_java_job_name   = var.java_execution_cloud_run_job_name
  execution_cloud_run_python_job_name = var.python_execution_cloud_run_job_name
  execution_global_active_job_limit   = var.execution_global_active_job_limit
  execution_max_source_bytes          = var.execution_max_source_bytes
  execution_max_stderr_bytes          = var.execution_max_stderr_bytes
  execution_max_stdout_bytes          = var.execution_max_stdout_bytes
  execution_timeout_ms                = var.execution_timeout_ms
  java_execution_max_memory_mb        = var.java_execution_max_memory_mb
  java_execution_max_source_bytes     = var.java_execution_max_source_bytes
  java_execution_max_stderr_bytes     = var.java_execution_max_stderr_bytes
  java_execution_max_stdout_bytes     = var.java_execution_max_stdout_bytes
  java_execution_timeout_ms           = var.java_execution_timeout_ms
  max_instance_count                  = var.cloud_run_max_instance_count
  min_instance_count                  = var.cloud_run_min_instance_count

  depends_on = [module.firestore, module.firebase_frontend]
}

module "cloud_run_python_execution_job" {
  source = "./modules/cloud-run-execution-job"

  project_id                            = var.project_id
  region                                = var.region
  job_name                              = var.python_execution_cloud_run_job_name
  artifact_repository_name              = var.artifact_repository_name
  container_image                       = var.python_execution_cloud_run_container_image
  backend_runtime_service_account_email = module.cloud_run_backend.runtime_service_account_email
  task_timeout_ms                       = var.execution_timeout_ms
  env_vars = {
    EXECUTION_TIMEOUT_MS       = tostring(var.execution_timeout_ms)
    EXECUTION_MAX_STDOUT_BYTES = tostring(var.execution_max_stdout_bytes)
    EXECUTION_MAX_STDERR_BYTES = tostring(var.execution_max_stderr_bytes)
  }

  depends_on = [module.cloud_run_backend]
}

module "cloud_run_java_execution_job" {
  source = "./modules/cloud-run-execution-job"

  project_id                            = var.project_id
  region                                = var.region
  job_name                              = var.java_execution_cloud_run_job_name
  artifact_repository_name              = var.artifact_repository_name
  container_image                       = var.java_execution_cloud_run_container_image
  backend_runtime_service_account_email = module.cloud_run_backend.runtime_service_account_email
  task_timeout_ms                       = var.java_execution_timeout_ms
  env_vars = {
    EXECUTION_TIMEOUT_MS            = tostring(var.execution_timeout_ms)
    EXECUTION_MAX_STDOUT_BYTES      = tostring(var.execution_max_stdout_bytes)
    EXECUTION_MAX_STDERR_BYTES      = tostring(var.execution_max_stderr_bytes)
    JAVA_EXECUTION_TIMEOUT_MS       = tostring(var.java_execution_timeout_ms)
    JAVA_EXECUTION_MAX_STDOUT_BYTES = tostring(var.java_execution_max_stdout_bytes)
    JAVA_EXECUTION_MAX_STDERR_BYTES = tostring(var.java_execution_max_stderr_bytes)
    JAVA_EXECUTION_MAX_MEMORY_MB    = tostring(var.java_execution_max_memory_mb)
  }

  depends_on = [module.cloud_run_backend]
}
