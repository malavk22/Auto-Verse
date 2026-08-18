# Shared Limiter instance - lives in its own module so both main.py (which
# registers it on the app) and individual routers (which apply @limiter.limit
# to specific endpoints) can import it without a circular import.
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
