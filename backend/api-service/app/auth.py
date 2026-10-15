import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import JWT_SECRET

bearer = HTTPBearer(auto_error=False)


def current_user_id(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    """Validates the JWT issued by the auth-service and returns the user id.

    Every query in this service filters by this id, so users can only
    ever read or modify their own data.
    """
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return str(sub)
