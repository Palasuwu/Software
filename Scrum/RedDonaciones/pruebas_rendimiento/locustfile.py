import random
from locust import HttpUser, task, between, tag


class VisitantePlataforma(HttpUser):
    """
    Simula el comportamiento de un usuario navegando en la plataforma de RedDonaciones:
    - Entra a la página de inicio (/home).
    - Consulta el catálogo de publicaciones y causas activas.
    - Ingresa al detalle de campañas específicas para ver artículos y metas.
    - Consulta resultados e impacto de campañas finalizadas.
    - Filtra por categorías de artículos.
    """

    # Tiempo de espera realista entre cada acción del usuario (1 a 3 segundos)
    wait_time = between(1, 3)

    # IDs de campañas conocidas para simular navegación en detalles
    campanas_ids = [1, 2, 3]

    def on_start(self):
        """Inicialización al arrancar el usuario virtual."""
        pass

    @tag("home", "lectura")
    @task(4)
    def navegar_inicio_y_campanas(self):
        """
        Flujo principal: el usuario visita /home y la aplicación consulta
        el catálogo de publicaciones activas y finalizadas.
        """
        # Carga de la vista frontend
        with self.client.get("/home", name="[Frontend] /home", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Error {resp.status_code} al cargar /home")

        # Carga del listado público de campañas en la API
        with self.client.get("/api/publicaciones", name="[API] /api/publicaciones", catch_response=True) as resp:
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        # Actualiza dinámicamente IDs de campañas encontradas
                        self.campanas_ids = [c["id_publicacion"] for c in data if "id_publicacion" in c][:10]
                    resp.success()
                except Exception:
                    resp.success()
            else:
                resp.failure(f"Error {resp.status_code} al consultar publicaciones")

    @tag("detalle", "lectura")
    @task(3)
    def ver_detalle_campana(self):
        """
        Simula a un usuario abriendo la página de detalle de una campaña
        para consultar su meta, artículos solicitados y resultados.
        """
        id_campana = random.choice(self.campanas_ids) if self.campanas_ids else 1

        # Carga de la vista detalle en frontend
        self.client.get(f"/detalle/{id_campana}", name="[Frontend] /detalle/:id")

        # Endpoint API de información detallada de la publicación
        with self.client.get(f"/api/publicaciones/{id_campana}", name="[API] /api/publicaciones/:id", catch_response=True) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Error inesperado {resp.status_code} en detalle de campaña")

    @tag("resultados", "lectura")
    @task(2)
    def ver_resultados_campana(self):
        """
        Simula la consulta de resultados e impacto de una campaña.
        """
        id_campana = random.choice(self.campanas_ids) if self.campanas_ids else 1
        with self.client.get(f"/api/publicaciones/{id_campana}/resultado", name="[API] /api/publicaciones/:id/resultado", catch_response=True) as resp:
            # 200 (resultado publicado) o 404 (aún no publicado) son respuestas esperadas de negocio
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Error {resp.status_code} al consultar resultados de campaña")

    @tag("catalogo", "lectura")
    @task(1)
    def consultar_articulos_y_categorias(self):
        """
        Simula la carga de filtros y categorías disponibles.
        """
        with self.client.get("/api/articulos", name="[API] /api/articulos", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Error {resp.status_code} al consultar artículos")
