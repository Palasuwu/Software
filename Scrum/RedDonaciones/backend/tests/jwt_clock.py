"""Reloj optativo de pruebas para emisión y validación reales de PyJWT."""
from contextlib import contextmanager
from datetime import datetime

import jwt
import auth_utils


@contextmanager
def controlar_reloj_jwt(monkeypatch, instante):
    class Reloj:
        ahora = instante

    reloj = Reloj()

    class FechaControlada(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls.fromtimestamp(reloj.ahora.timestamp(), tz)

    # PyJWT también usa datetime al convertir claims datetime a NumericDate.
    # Devolver una instancia de la subclase conserva esa conversión real.
    with monkeypatch.context() as cambios:
        cambios.setattr(auth_utils, 'datetime', FechaControlada)
        cambios.setattr(jwt.api_jwt, 'datetime', FechaControlada)
        yield reloj
