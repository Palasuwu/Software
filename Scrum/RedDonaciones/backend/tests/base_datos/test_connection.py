import pytest

from db.connection import db_cursor

# Para probar el manejo de errores en db_cursor, se crean clases simuladas para cursor y conexión.
class FakeCursor:
    def __init__(self, close_error=None):
        self.close_error = close_error
        self.closed = False

    def close(self):
        self.closed = True
        if self.close_error:
            raise self.close_error


# Para ver si db_cursor cierra correctamente el cursor y la conexión, se crean clases simuladas para cursor y conexión.
class FakeConnection:
    def __init__(self, cursor=None, cursor_error=None, close_error=None):
        self.cursor_value = cursor
        self.cursor_error = cursor_error
        self.close_error = close_error
        self.cursor_calls = []
        self.closed = False

    def cursor(self, dictionary=True):
        self.cursor_calls.append(dictionary)
        if self.cursor_error:
            raise self.cursor_error
        return self.cursor_value

    def close(self):
        self.closed = True
        if self.close_error:
            raise self.close_error


#PAra ver que cierre bien
def test_db_cursor_cierra_cursor_y_conexion_al_salir_normalmente():
    cursor = FakeCursor()
    connection = FakeConnection(cursor=cursor)

    with db_cursor(connection_factory=lambda: connection) as (conn, cur):
        assert conn is connection
        assert cur is cursor
        assert connection.cursor_calls == [True]
        assert not cursor.closed
        assert not connection.closed

    assert cursor.closed
    assert connection.closed


def test_db_cursor_cierra_conexion_si_falla_la_creacion_del_cursor():
    connection = FakeConnection(cursor_error=RuntimeError("cursor error"))

    with pytest.raises(RuntimeError, match="cursor error"):
        with db_cursor(connection_factory=lambda: connection):
            pass

    assert connection.closed


def test_db_cursor_cierra_conexion_si_falla_el_cierre_del_cursor():
    cursor = FakeCursor(close_error=RuntimeError("close cursor error"))
    connection = FakeConnection(cursor=cursor)

    with pytest.raises(RuntimeError, match="close cursor error"):
        with db_cursor(connection_factory=lambda: connection):
            pass

    assert cursor.closed
    assert connection.closed


def test_db_cursor_conserva_el_error_original_si_falla_la_limpieza():
    cursor = FakeCursor(close_error=RuntimeError("close cursor error"))
    connection = FakeConnection(
        cursor=cursor,
        close_error=RuntimeError("close connection error"),
    )

    with pytest.raises(ValueError, match="operation error"):
        with db_cursor(connection_factory=lambda: connection):
            raise ValueError("operation error")

    assert cursor.closed
    assert connection.closed


def test_db_cursor_informa_error_de_cierre_de_conexion_si_no_hay_error_original():
    cursor = FakeCursor()
    connection = FakeConnection(
        cursor=cursor,
        close_error=RuntimeError("close connection error"),
    )

    with pytest.raises(RuntimeError, match="close connection error"):
        with db_cursor(connection_factory=lambda: connection):
            pass

    assert cursor.closed
    assert connection.closed
