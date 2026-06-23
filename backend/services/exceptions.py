# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

class ExternalServiceError(RuntimeError):
    """Raised when an upstream dependency cannot satisfy a request."""


class ServiceValidationError(ValueError):
    """Raised when a request payload is syntactically valid but semantically unusable."""
