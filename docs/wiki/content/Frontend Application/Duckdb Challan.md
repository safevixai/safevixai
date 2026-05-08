```markdown
# `duckdb-challan.ts` Module

## Overview

The `duckdb-challan.ts` module provides functionality for calculating challan (traffic fine) amounts based on violation codes and vehicle class within the SafeVixAI frontend application. It simulates an offline challan lookup using a hardcoded database of violation codes and associated fines, including base and repeat offender penalties.  It also introduces a delay to simulate network latency.

## Architecture

This module resides within the frontend application (`frontend/lib/`) and is responsible for providing challan information to other frontend components. It does not interact with the backend directly, instead providing a local lookup. It leverages a simple JavaScript object as a database. This module is used by components that need to display challan information, such as the challan details screen. It uses a constant `OFFLINE_CHALLAN_LOOKUP_DELAY_MS` to simulate network latency.

## Key Classes/Functions

