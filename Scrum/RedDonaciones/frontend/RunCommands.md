# 🐳 Guía Docker — Red de Donaciones

## ✅ Requisitos Previos

- Tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **abierto**
- No necesitas instalar Node.js, Python ni ninguna otra dependencia localmente

---

## 📁 Estructura del Proyecto

```
red-donaciones/
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🚀 OPCIÓN 1: Ejecutar SOLO el Frontend (Dockerfile)
Abre tu terminal, navega a la carpeta del proyecto y ejecuta estos comandos **en orden**:

```bash
# 1. Entrar a la carpeta del proyecto
cd Scrum
cd RedDonaciones

# 2. Construir la imagen Docker
docker build -t red-donaciones .

# 3. Correr el contenedor
docker run -d -p 3000:80 --name donaciones-app red-donaciones
```

Luego abre tu navegador en:
```
http://localhost:3000
```

---

## 🔄 Casos Comunes

---

### 📝 Modifiqué un archivo (CSS, JSX, HTML, etc.) y quiero ver los cambios

Cada vez que edites cualquier archivo del proyecto debes reconstruir la imagen:

```bash
docker stop donaciones-app
docker rm donaciones-app
docker build -t red-donaciones .
docker run -d -p 3000:80 --name donaciones-app red-donaciones
```

> ⚠️ Docker no detecta cambios automáticamente. Siempre debes reconstruir para ver los cambios reflejados.

---

### ▶️ El contenedor estaba detenido y quiero volver a levantarlo

Si ya construiste la imagen antes y solo lo detuviste:

```bash
docker start donaciones-app
```

---

### ⏹️ Quiero detener la app sin eliminarla

```bash
docker stop donaciones-app
```

Para volver a levantarla después:

```bash
docker start donaciones-app
```

---

### 🗑️ Quiero eliminar el contenedor completamente

```bash
docker stop donaciones-app
docker rm donaciones-app
```

> Esto **no** elimina la imagen, solo el contenedor. Puedes volver a correrlo con `docker run` cuando quieras.

---

### 🗑️ Quiero eliminar también la imagen

```bash
docker rmi red-donaciones
```

> Después de esto necesitarás volver a hacer `docker build` para reconstruirla.

---

### 📦 Instalé una nueva dependencia en package.json

```bash
docker stop donaciones-app
docker rm donaciones-app
docker build -t red-donaciones .
docker run -d -p 3000:80 --name donaciones-app red-donaciones
```

> El `docker build` corre `npm install` automáticamente, por lo que las nuevas dependencias quedan incluidas.

---

### 🔍 Ver si el contenedor está corriendo

```bash
docker ps
```

Deberías ver algo así si está activo:

```
CONTAINER ID   IMAGE            PORTS                  NAMES
f38f2dafe35c   red-donaciones   0.0.0.0:3000->80/tcp   donaciones-app
```

Si la lista aparece vacía, el contenedor no está corriendo.

---

### 📋 Ver los logs del contenedor (para debug)

```bash
docker logs donaciones-app
```

---

### 🔁 El puerto 3000 ya está en uso

Si al correr `docker run` ves un error de puerto ocupado, usa un puerto diferente:

```bash
docker run -d -p 3001:80 --name donaciones-app red-donaciones
```

Luego abre `http://localhost:3001` en tu navegador.

---

### 🧹 Limpiar todo (contenedores e imágenes sin usar)

```bash
docker system prune
```

> ⚠️ Esto elimina todos los contenedores detenidos e imágenes sin usar en tu sistema, no solo los de este proyecto.

---

## 📌 Resumen Rápido de Comandos

| Acción                        | Comando                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| Construir imagen              | `docker build -t red-donaciones .`                                      |
| Correr contenedor             | `docker run -d -p 3000:80 --name donaciones-app red-donaciones`         |
| Ver contenedores activos      | `docker ps`                                                             |
| Detener contenedor            | `docker stop donaciones-app`                                            |
| Iniciar contenedor detenido   | `docker start donaciones-app`                                           |
| Eliminar contenedor           | `docker rm donaciones-app`                                              |
| Eliminar imagen               | `docker rmi red-donaciones`                                             |
| Ver logs                      | `docker logs donaciones-app`                                            |
| Reconstruir tras cambios      | `stop` → `rm` → `build` → `run`                                        |

---

---

## 🚀 OPCIÓN 2: Ejecutar TODO el sistema (Docker Compose) ⭐

Abre tu terminal, navega a la carpeta raíz del proyecto y ejecuta:

```bash
docker compose up --build
```

Esto construye y levanta los 3 servicios automáticamente:

| Servicio          | Tecnología     | URL local             |
|-------------------|----------------|-----------------------|
| Frontend          | React + Nginx  | http://localhost:3000 |
| Backend           | Flask (Python) | http://localhost:5000 |
| Base de datos     | MySQL 8        | localhost:3306        |

> ⚠️ La primera vez puede tardar unos minutos mientras descarga las imágenes base y construye todo.

---

## 🔄 Casos Comunes

---

### Modifiqué un archivo y quiero ver los cambios

```bash
docker compose up --build
```

> El flag `--build` fuerza la reconstrucción de las imágenes con tus cambios.

---

### Levantar sin reconstruir (inicio rápido)

Si no cambiaste nada y solo quieres volver a levantar:

```bash
docker compose up
```

---

### Detener todos los servicios

```bash
docker compose down
```

> Esto detiene y elimina los contenedores, pero **conserva** el volumen de MySQL con tus datos.

---

### Detener y eliminar todo incluyendo la base de datos

```bash
docker compose down -v
```

> ⚠️ El flag `-v` elimina el volumen de MySQL. Perderás todos los datos guardados.

---

### Instalé una nueva dependencia

**Backend** (nuevo paquete en `requirements.txt`):

```bash
docker compose up --build backend
```

**Frontend** (nuevo paquete en `package.json`):

```bash
docker compose up --build frontend
```

> `--build` reconstruye solo ese servicio para no reconstruir todo.

---

### Ver si los contenedores están corriendo

```bash
docker compose ps
```

Deberías ver los 3 servicios con estado `Up`:

```
NAME                    STATUS
reddonaciones-frontend  Up
reddonaciones-backend   Up
reddonaciones-db        Up
```

---

### Ver logs de un servicio específico

```bash
docker compose logs frontend
docker compose logs backend
docker compose logs db
```

Para seguir los logs en tiempo real:

```bash
docker compose logs -f backend
```

---

### El puerto 3000 o 5000 ya está en uso

Edita `docker-compose.yml` y cambia el puerto del lado izquierdo:

```yaml
ports:
  - "3001:80"   # cambia 3000 por otro disponible
```

---

### Limpiar todo (contenedores e imágenes sin usar)

```bash
docker system prune
```

> ⚠️ Elimina todos los contenedores detenidos e imágenes sin usar en tu sistema.

---

## Resumen Rápido de Comandos

| Acción                        | Comando                                    |
|-------------------------------|--------------------------------------------|
| Levantar todo (primera vez)   | `docker compose up --build`                |
| Levantar sin reconstruir      | `docker compose up`                        |
| Detener todo                  | `docker compose down`                      |
| Detener y borrar datos        | `docker compose down -v`                   |
| Ver contenedores activos      | `docker compose ps`                        |
| Ver logs de un servicio       | `docker compose logs <servicio>`           |
| Logs en tiempo real           | `docker compose logs -f <servicio>`        |
| Reconstruir un servicio       | `docker compose up --build <servicio>`     |

---

## 🌐 URLs de la aplicación

```
Frontend  → http://localhost:3000
Backend   → http://localhost:5000
```

> La comunicación entre frontend y backend ocurre internamente a través de Nginx, por lo que no necesitas acceder al backend directamente en uso normal.

