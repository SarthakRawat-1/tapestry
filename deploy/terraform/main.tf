locals {
  required_services = [
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each           = toset(local.required_services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = var.artifact_repository
  description   = "Docker repository for Tapestry"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "cloud_run" {
  account_id   = "${var.service_name}-run-sa"
  display_name = "${var.service_name} Cloud Run runtime service account"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "run_sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret" "app_secret" {
  for_each = nonsensitive(var.secret_env_vars)

  secret_id = "${var.service_name}-${lower(replace(each.key, "_", "-"))}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "app_secret_version" {
  for_each = nonsensitive(var.secret_env_vars)

  secret      = google_secret_manager_secret.app_secret[each.key].id
  secret_data = each.value
}

resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region
  ingress  = var.ingress

  template {
    service_account = google_service_account.cloud_run.email
    timeout         = "${var.request_timeout_seconds}s"

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.container_image

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      dynamic "env" {
        for_each = var.plain_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = nonsensitive(var.secret_env_vars)
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app_secret[env.key].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  deletion_protection = false

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_secret_manager_secret_version.app_secret_version,
    google_project_iam_member.run_sa_secret_accessor,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
