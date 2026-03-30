"""
Vienna OS Exceptions
"""


class ViennaError(Exception):
    """Base exception for Vienna OS SDK"""
    pass


class AuthenticationError(ViennaError):
    """Authentication failed"""
    pass


class ValidationError(ViennaError):
    """Request validation failed"""
    pass


class RateLimitError(ViennaError):
    """Rate limit exceeded"""
    pass


class NotFoundError(ViennaError):
    """Resource not found"""
    pass
