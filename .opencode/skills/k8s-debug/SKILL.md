---
name: k8s-debug
description: Kubernetes debugging — pod logs, describe, port-forward, restart, rollback for the SafeVixAI K8s cluster in namespace safevixai. Use when pods crash, services are unreachable, or deployments need debugging.
---

# Kubernetes Debugging

## Quick Commands

```bash
kubectl get pods -n safevixai                          # Pod status
kubectl describe pod <name> -n safevixai               # Pod details + events
kubectl logs -n safevixai -l app.kubernetes.io/part-of=safevixai --tail=50 -f   # All service logs
kubectl logs deployment/safevixai-backend -n safevixai --tail=100   # Backend logs
kubectl exec -it deployment/safevixai-backend -n safevixai -- /bin/sh   # Shell access
kubectl port-forward service/safevixai-backend 8000:80 -n safevixai   # Local port forward
```

## Restart Deployments

```bash
kubectl rollout restart deployment/safevixai-backend -n safevixai
kubectl rollout restart deployment/safevixai-chatbot -n safevixai
kubectl rollout restart deployment/safevixai-frontend -n safevixai
kubectl rollout status deployment/safevixai-backend -n safevixai --timeout=5m
```

## Rollback

```bash
kubectl rollout undo deployment/safevixai-backend -n safevixai
kubectl rollout status deployment/safevixai-backend -n safevixai
```

## Resource Checks

```bash
kubectl top pods -n safevixai                    # CPU/memory usage
kubectl describe hpa -n safevixai               # Horizontal Pod Autoscaler
kubectl describe pdb -n safevixai               # Pod Disruption Budgets
kubectl describe networkpolicy -n safevixai     # Network policies
```

## When Pods CrashLoopBackOff

1. `kubectl logs <pod> -n safevixai --previous`  # Last run's logs
2. `kubectl describe pod <pod> -n safevixai`      # Events + conditions
3. Check ConfigMap: `kubectl describe configmap -n safevixai`
4. Check Secrets: `kubectl describe secret -n safevixai`
5. Verify resource limits, liveness/readiness probes
