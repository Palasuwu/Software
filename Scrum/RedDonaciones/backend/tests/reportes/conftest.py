# Cada dataset vive en su propia base sin seed; las peticiones usan conexiones reales.
import pytest

from auth_utils import generate_token



SECRET = "test-secret-key-with-at-least-32-bytes"

DONACIONES = [
    ("A1", "ana", "pendiente", "2019-01-01", 5),
    ("A1", "ana", "entregada", "2019-01-15", 10),
    ("A1", "beto", "entregada", "2019-01-31", 3),
    ("A1", "beto", "rechazada", "2019-02-01", 7),
    ("A1", "carla", "recibida", "2019-02-15", 2),
    ("A1", "carla", "en_proceso", "2019-02-15", 4),
    ("B1", "ana", "entregada", "2019-01-20", 100),
    ("B1", "carla", "pendiente", "2019-03-01", 50),
]


@pytest.fixture
def datos_reportes(mysql_case):
    data = mysql_case
    orgs = {key: data.organization(f"Organización Reportes {key}") for key in ("A", "B")}
    data.principal(orgs["A"])
    admin = data.user("Administrador Reportes", "administrador")
    intermediarios = {key: data.user(f"Intermediario Reportes {key}", "intermediario", org)
                      for key, org in orgs.items()}
    donantes = {name.lower(): data.user(f"{name} Reportes", "donante") for name in ("Ana", "Beto", "Carla")}
    articulo = data.article()
    campanas = {
        "A1": data.campaign(orgs["A"], intermediarios["A"], articulo, "Reportes A1 Abrigos"),
        "A2": data.campaign(orgs["A"], intermediarios["A"], articulo, "Reportes A2 Sin donaciones"),
        "B1": data.campaign(orgs["B"], intermediarios["B"], articulo, "Reportes B1 Víveres"),
    }
    donaciones = []
    for campana, donante, estado, fecha, cantidad in DONACIONES:
        donaciones.append(data.insert(
            "INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,telefono_contacto,"
            "hora_preferida,cantidad_donada,fecha_donacion,estado) "
            "VALUES (%s,%s,'Donación de prueba','Contacto','00000000','10:00:00',%s,%s,%s)",
            (donantes[donante], campanas[campana], cantidad, fecha, estado)))
    data.conn.commit()
    return dict(organizaciones=orgs, campanas=campanas, donantes=donantes, donaciones=donaciones,
                admin_headers={"Authorization": f"Bearer {generate_token(admin, 'administrador')}"},
                intermediario_headers={key: {"Authorization": f"Bearer {generate_token(user, 'intermediario')}"}
                                       for key, user in intermediarios.items()})


@pytest.fixture
def contexto_reportes(mysql_case):
    data = mysql_case
    org = data.organization()
    data.principal(org)
    admin = data.user("Administrador reportes", "administrador")
    intermediary = data.user("Intermediario reportes", "intermediario", org)
    donors = [data.user(f"Donante reporte {letter}", "donante") for letter in ("A", "B")]
    article = data.article()
    return dict(data=data, organizacion=org, admin=admin, intermediario=intermediary,
                donantes=donors, articulo=article)


@pytest.fixture
def sesion(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)

    def iniciar(rol, id_usuario=10, id_organizacion=None, organizacion_verificada=True):
        usuario = {"id_usuario": id_usuario, "rol": rol, "activo": 1}
        monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: usuario)
        monkeypatch.setattr("routes.reporte._obtener_organizacion_actual_intermediario", lambda _: id_organizacion)
        monkeypatch.setattr("routes.reporte._organizacion_permite_lectura", lambda _: organizacion_verificada)
        token = generate_token(id_usuario, rol, id_organizacion)
        return {"Authorization": f"Bearer {token}"}

    return iniciar
