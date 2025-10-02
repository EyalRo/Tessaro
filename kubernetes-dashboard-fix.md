# Kubernetes Dashboard 404 Remediation

## Summary
- Added the missing `kubernetes-dashboard` namespace so Flux can create dashboard resources.
- Registered the official Kubernetes Dashboard Helm repository and release through Flux.
- Updated the platform kustomization to apply the new Helm artifacts alongside the existing Traefik routes.

## Deployment Notes
1. Commit and push these changes to the repository.
2. Trigger Flux to reconcile, for example:
   ```bash
   ./tools/scripts/reconcile-flux.sh platform
   ```
3. Once the reconciliation finishes, `https://kubernetes.tessaro.dino.home/` should load the dashboard instead of returning 404.
