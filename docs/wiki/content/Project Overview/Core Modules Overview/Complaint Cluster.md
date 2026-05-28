# Complaint Cluster

> Source: `backend/services/complaint_cluster.py` | Generated: 2026-05-27

## Overview

Spatial clustering service using DBSCAN for complaint hotspot detection.

## Classes

| Class | Description |
|---|---|
| `SpatialCluster` | Spatialcluster |
| `ComplaintClusterService` | Complaintclusterservice |

## Key Functions

| Function | Description |
|---|---|
| `dbscan_cluster()` | Dbscan Cluster |
| `find_clusters()` | Find Clusters |
| `get_hotspots()` | Get Hotspots |

## Dependencies

- `__future__`
- `collections`
- `dataclasses`
- `geoalchemy2`
- `logging`
- `math`
- `models`
- `sqlalchemy`
- `uuid`


## File Location

```
backend/services/complaint_cluster.py
```
