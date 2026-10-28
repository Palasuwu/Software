# Recuperación de contraseña — SCRUM-240 y SCRUM-241

## Flujo verificado

1. Desde el inicio de sesión se solicita un enlace con el correo de la cuenta.
2. La respuesta no confirma si existe una cuenta activa con ese correo.
3. El correo incluye un botón, un enlace alternativo y el aviso de vencimiento
   de 30 minutos y de un solo uso.
4. El formulario valida la contraseña y su confirmación antes de enviarlas.
5. El servidor guarda el hash bcrypt y reinicia el bloqueo por intentos fallidos.
6. La contraseña nueva permite iniciar sesión; la anterior deja de funcionar.
7. Un enlace usado o vencido se rechaza y se puede solicitar otro.

## Pruebas automatizadas

Desde `backend/`, con JWT_SECRET_KEY configurada para pruebas:

```sh
python -m pytest tests/autenticacion -q
python -m pytest tests/automatizadas/integracion/test_recuperacion_mysql.py -v
```

La primera orden cubre los tokens, los endpoints y el transporte SMTP simulado.
La segunda requiere MySQL (DB_HOST, DB_USER, DB_PASSWORD y DB_NAME) y usa la base
temporal de la suite automatizada. Comprueba solicitud, cambio persistido,
desbloqueo, login con contraseña nueva, rechazo de la anterior y de un segundo
uso del enlace. Forma parte de integración y regresión en el pipeline existente.

Desde `frontend/`:

```sh
npm run test:run -- src/test/autenticacion/PasswordResetPage.test.jsx
npm run test:run
npm run build
```

La interfaz cubre correo vacío o mal formado, normalización, envío pendiente,
fallos y reintentos, enlace incompleto, requisitos de contraseña, confirmación,
rechazo del token, respuesta no JSON y retorno al login con confirmación.

Las pruebas usan destinatarios de ejemplo y sustituyen SMTP para no enviar
mensajes reales. Las credenciales del correo no se necesitan en CI.

## Entorno de ejecución

La configuración de ejemplo está en `.env.ejemplo`. Para enviar correo realmente,
el `.env` privado del despliegue necesita SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD, SMTP_FROM y FRONTEND_URL. Con el servicio de Gmail de referencia,
se usa el puerto 587 con STARTTLS y una contraseña de aplicación. FRONTEND_URL
debe ser la dirección que el destinatario pueda abrir; localhost solo sirve
para quien ejecuta la aplicación en ese mismo equipo.

Las credenciales se conservan fuera de Git. Las pruebas de esta entrega validan
el contenido, la configuración del transporte y la lógica; no certifican la
entrega real a una bandeja de Gmail.
