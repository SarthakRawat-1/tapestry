output "artifact_registry_repository" {
  description = "Artifact Registry repository path."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "cloud_run_service_name" {
  description = "Deployed Cloud Run service name."
  value       = google_cloud_run_v2_service.app.name
}

output "cloud_run_service_url" {
  description = "Public URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.app.uri
}

output "cloud_run_runtime_service_account" {
  description = "Runtime service account email used by Cloud Run."
  value       = google_service_account.cloud_run.email
}
