# 🐳 Guía Docker — Red de Donaciones

## ✅ Requisitos Previos

- Tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- Tener Docker Desktop **abierto y corriendo** antes de ejecutar cualquier comando
- No necesitas instalar Node.js ni ninguna otra dependencia

---

## 🚀 Correr el proyecto por primera vez

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

## 🌐 URL de la aplicación

```
http://localhost:3000
```