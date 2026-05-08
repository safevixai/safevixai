```markdown
# osm_contributor.py — OpenStreetMap Contribution Service

## Overview

The `osm_contributor.py` module facilitates the contribution of verified road hazard reports from the SafeVixAI platform to OpenStreetMap (OSM). It translates verified reports into OSM-compatible hazard nodes, ensuring the data is visible in OSM-based maps. This module uses the OSM API v0.6 to create and manage changesets, and it only contributes reports with sufficient verification.

## Architecture

This module is a core service within the FastAPI backend. It receives verified road hazard reports from other modules (e.g., the report verification service). It then interacts with the OSM API to create hazard nodes at the reported locations. The module is designed to be independent and self-contained, handling its own authentication and error management. It is triggered after a report is verified by the system.

## Key Classes/Functions

