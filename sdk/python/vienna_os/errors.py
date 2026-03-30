"""Vienna OS SDK Errors."""


class ViennaError(Exception):
    """Base error for Vienna OS operations."""

    def __init__(self, message: str, code: str = "UNKNOWN", status: int | None = None):
        super().__init__(message)
        self.code = code
        self.status = status


class AuthError(ViennaError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", 401)


class PolicyDeniedError(ViennaError):
    """Intent denied by policy engine."""

    def __init__(self, message: str, rule: str, tier: str):
        super().__init__(message, "POLICY_DENIED", 403)
        self.rule = rule
        self.tier = tier


class WarrantExpiredError(ViennaError):
    """Warrant has expired."""

    def __init__(self, warrant_id: str):
        super().__init__(f"Warrant {warrant_id} has expired", "WARRANT_EXPIRED", 410)
        self.warrant_id = warrant_id
