from cryptography.fernet import Fernet
from sqlalchemy import String, TypeDecorator

from app.config import get_settings


class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        key = get_settings().encryption_key.encode()
        return Fernet(key).encrypt(value.encode()).decode()

    def process_result_value(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        key = get_settings().encryption_key.encode()
        return Fernet(key).decrypt(value.encode()).decode()
