# Automated Cloud Deployment (Docker + Terraform)

This folder contains a complete infrastructure-as-code deployment for this Next.js app using only:

- Dockerfile-based containerization
- Terraform-based cloud provisioning and release configuration

## What Gets Automated

Terraform provisions and configures:

- Required GCP APIs
- Artifact Registry Docker repository
- Dedicated Cloud Run runtime service account
- Secret Manager secrets for sensitive environment variables
- Cloud Run service with autoscaling, CPU/memory limits, and request timeout
- Public invoker IAM binding (optional)

Dockerfile builds and runs the production Next.js app image.

## Files

- `deploy/Dockerfile`: production multi-stage container build
- `deploy/terraform/versions.tf`: Terraform and provider requirements
- `deploy/terraform/variables.tf`: all deployment inputs
- `deploy/terraform/main.tf`: cloud resources (Artifact Registry, Secret Manager, Cloud Run, IAM)
- `deploy/terraform/outputs.tf`: deployment outputs (service URL, repo path, SA)
- `deploy/terraform/terraform.tfvars.example`: starter config including all app env vars

## One-Time Prerequisites

1. Install Docker
2. Install Terraform (>= 1.6)
3. Install Google Cloud CLI and authenticate:

```bash
gcloud auth login
gcloud auth application-default login
```

## One-Command Deploy

After creating `deploy/terraform/terraform.tfvars`, run:

```bash
bash deploy/deploy.sh
```

Optional override:

```bash
TF_VARS_FILE=deploy/terraform/terraform.tfvars bash deploy/deploy.sh
```

The script automates:

- Terraform init
- Bootstrap apply for APIs and Artifact Registry
- Docker build + push
- Final Terraform apply for Cloud Run, IAM, and secrets wiring

## Deploy Steps

1. Copy vars and fill real values:

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
```

2. Initialize Terraform and create infrastructure:

```bash
terraform init
terraform apply -target=google_project_service.required -auto-approve
terraform apply -target=google_artifact_registry_repository.docker_repo -auto-approve
```

3. Build and push the app image with Docker:

```bash
# Replace PROJECT_ID and REGION to match terraform.tfvars
cd ../..
gcloud auth configure-docker REGION-docker.pkg.dev --quiet
docker build -f deploy/Dockerfile -t REGION-docker.pkg.dev/PROJECT_ID/tapestry/tapestry:latest .
docker push REGION-docker.pkg.dev/PROJECT_ID/tapestry/tapestry:latest
```

4. Finalize Cloud Run deployment with Terraform:

```bash
cd deploy/terraform
terraform apply -auto-approve
```

5. Read the deployed URL:

```bash
terraform output cloud_run_service_url
```

## Notes Specific To This App

- Long-running AI research endpoint uses server-sent events and can run several minutes.
- Cloud Run timeout defaults to 300 seconds in Terraform to support this.
- MongoDB Atlas must allow egress from Cloud Run.
- If using GCS uploads, set `GCS_BUCKET_NAME` and `GCS_CREDENTIALS` in vars.

## Why This Proves Automation

- Infrastructure is declarative and reproducible from Terraform code.
- Runtime configuration is versioned in Terraform variables and secrets.
- Container build is deterministic from the Dockerfile.
- Deployment can be repeated in any environment using the same `deploy/` code.
