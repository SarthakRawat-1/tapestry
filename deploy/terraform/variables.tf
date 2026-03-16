variable "project_id" {
  description = "GCP project ID used for deployment."
  type        = string
}

variable "region" {
  description = "GCP region for Artifact Registry and Cloud Run."
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "tapestry"
}

variable "artifact_repository" {
  description = "Artifact Registry Docker repository name."
  type        = string
  default     = "tapestry"
}

variable "container_image" {
  description = "Full container image URL (for example us-central1-docker.pkg.dev/my-proj/tapestry/tapestry:latest)."
  type        = string
}

variable "container_port" {
  description = "Container port exposed by Next.js."
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "CPU limit for the Cloud Run container."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory limit for the Cloud Run container."
  type        = string
  default     = "2Gi"
}

variable "min_instances" {
  description = "Minimum warm instances for Cloud Run."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run autoscaling."
  type        = number
  default     = 10
}

variable "request_timeout_seconds" {
  description = "Max request duration in seconds. Research endpoint supports long-running SSE, so default is 300."
  type        = number
  default     = 300
}

variable "allow_unauthenticated" {
  description = "Whether to allow public HTTP access to Cloud Run."
  type        = bool
  default     = true
}

variable "ingress" {
  description = "Cloud Run ingress policy."
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}

variable "plain_env_vars" {
  description = "Non-sensitive environment variables injected directly into Cloud Run."
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Sensitive environment variables stored in Secret Manager and mounted into Cloud Run env vars."
  type        = map(string)
  default     = {}
  sensitive   = true
}
