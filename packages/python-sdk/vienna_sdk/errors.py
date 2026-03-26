"""Error types for Vienna OS SDK."""


class ViennaError(Exception):
    """Base exception for Vienna SDK errors."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class ViennaAuthError(ViennaError):
    """Authentication failed (401)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 401)


class ViennaForbiddenError(ViennaError):
    """Insufficient permissions (403)."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)


class ViennaNotFoundError(ViennaError):
    """Resource not found (404)."""

    def __init__(self, message: str = "Not found"):
        super().__init__(message, 404)


class ViennaRateLimitError(ViennaError):
    """Rate limit exceeded (429)."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 0):
        super().__init__(message, 429)
        self.retry_after = retry_after


class ViennaValidationError(ViennaError):
    """Validation failed (400)."""

    def __init__(self, message: str = "Validation failed", errors: dict = None):
        super().__init__(message, 400)
        self.errors = errors or {}


class ViennaServerError(ViennaError):
    """Server error (500)."""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, 500)
