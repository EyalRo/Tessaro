# Kubernetes Dashboard 404 Remediation

## Summary
- Added the missing `kubernetes-dashboard` namespace so the dashboard resources deploy successfully.
- Registered the official Kubernetes Dashboard Helm chart using standard manifests.
- Updated the cluster kustomization to apply the dashboard resources alongside the existing Traefik routes.

## Deployment Notes
1. Commit and push these changes to the repository.
2. Apply the updated manifests with kubectl:
   ```bash
   kubectl apply -k infra/k8s/clusters/home
   ```
3. Once the apply completes, `https://kubernetes.tessaro.dino.home/` should load the dashboard instead of returning 404.
