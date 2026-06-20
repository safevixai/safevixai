# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for SafeVixAI.
Each ADR documents a significant architectural decision, the context, options considered, and the chosen approach.

## Index

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-001](./ADR-001-two-service-architecture.md) | Two-Service Architecture (Backend + Chatbot) | 2026-05-19 | ✅ Accepted |
| [ADR-002](./ADR-002-llm-fallback-chain.md) | 9-Provider LLM Fallback Chain | 2026-05-20 | ✅ Accepted |
| [ADR-003](./ADR-003-postgis-over-mongo.md) | PostGIS for Geospatial Queries | 2026-05-21 | ✅ Accepted |

## What is an ADR?

An Architecture Decision Record is a short document capturing:
- **Context**: Why this decision needed to be made
- **Options**: Alternatives considered
- **Decision**: What was chosen and why
- **Consequences**: Trade-offs and implications

## Status Meanings

- **Proposed**: Under discussion, not yet accepted
- **Accepted**: Agreed upon and implemented
- **Deprecated**: Superseded by a newer ADR
- **Superseded**: Replaced by a newer ADR
