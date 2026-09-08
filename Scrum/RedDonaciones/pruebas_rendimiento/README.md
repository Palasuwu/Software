# Pruebas de Carga y Estrés con Locust

Este directorio contiene la suite de pruebas de rendimiento para validar la capacidad, estabilidad y tiempos de respuesta de la plataforma **RedDonaciones** bajo concurrencia de usuarios.

---

## 1. Requisitos Previos

Tener instalado Python 3.11 o superior en la máquina desde donde se ejecutarán las pruebas.

> [!IMPORTANT]
> **No ejecutar las pruebas desde el mismo servidor en Azure.**  
> Deben ejecutarse desde una computadora local o máquina externa para que el generador de tráfico no consuma la CPU ni la memoria del servidor bajo prueba.

---

## 2. Puesta en Marcha

### Paso 1: Activar el entorno virtual

Desde la raíz del proyecto o desde `Scrum/RedDonaciones`:

**En Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**En Linux / macOS:**
```bash
source .venv/bin/activate
```

*(Si aún no están instaladas las dependencias, ejecutar `pip install -r pruebas_rendimiento/requirements.txt`).*

---

### Paso 2: Iniciar Locust

Desde este directorio (`Scrum/RedDonaciones/pruebas_rendimiento`):

```bash
locust -f locustfile.py
```

O desde la carpeta `Scrum/RedDonaciones`:
```bash
locust -f pruebas_rendimiento/locustfile.py
```

Verás una salida indicando que el servidor web de Locust está escuchando:
```text
[INFO] Starting web interface at http://0.0.0.0:8089
```

---

## 3. Configuración en la Interfaz Web

Abre tu navegador en:
```text
http://localhost:8089
```

Configura los parámetros del test:

* **Host:** `http://20.97.176.27`
* **Number of users (peak concurrency):** Cantidad máxima de usuarios concurrentes deseados.
* **Ramp up / Spawn rate:** Usuarios que se agregan por segundo (se recomienda entre 5 y 10 para simular tráfico gradual).

---

## 4. Fases de Prueba Recomendadas

| Fase | Usuarios Concurrentes | Spawn Rate | Duración sugerida | Objetivo |
| :--- | :--- | :--- | :--- | :--- |
| **1. Carga Base** | 50 usuarios | 5 usuarios/seg | 3 - 5 min | Verificar estabilidad en tráfico regular. |
| **2. Carga Pico** | 150 usuarios | 10 usuarios/seg | 5 min | Evaluar comportamiento en horas de alta afluencia. |
| **3. Estrés** | 300 a 500 usuarios | 15 usuarios/seg | 5 - 10 min | Determinar el punto de saturación y degradación del servidor. |

---

## 5. Métricas a Evaluar

* **RPS (Requests per Second):** Cantidad de peticiones procesadas exitosamente por segundo.
* **Tiempos de Respuesta (p95 / Percentil 95):** Debe mantenerse inferior a **1.5 - 2.0 segundos**.
* **Failures (%):** Debe ser **0%** en condiciones de carga normal. Si aparecen errores (HTTP 500, 502, 504 o timeouts), se ha superado la capacidad del servidor.
