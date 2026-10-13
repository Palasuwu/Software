def crear_conexion_mock(resultados_fetchone=None, resultado_fetchall=None, error=None):
    class DummyCursor:
        def __init__(self):
            self.resultados_fetchone = resultados_fetchone or []
            self.resultado_fetchall = resultado_fetchall
            self.error = error
            self.executed_queries = []
            self.indice = 0
            self.lastrowid = 7

        def execute(self, sql, params=None):
            self.executed_queries.append((sql, params))
            if self.error:
                raise self.error

        def fetchone(self):
            if self.indice < len(self.resultados_fetchone):
                resultado = self.resultados_fetchone[self.indice]
                self.indice += 1
                return resultado
            return None

        def fetchall(self):
            return self.resultado_fetchall or []

        def close(self):
            pass

    class DummyConn:
        def __init__(self):
            self.cursor_obj = DummyCursor()

        def cursor(self, dictionary=True):
            return self.cursor_obj

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            pass

    return DummyConn()
