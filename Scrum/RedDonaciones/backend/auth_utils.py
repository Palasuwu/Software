# backend/auth_utils.py
import os
import jwt
from functools import wraps
from flask import current_app, request, jsonify
from datetime import datetime, timedelta


def _get_secret_key():
    secret_key = None

    try:
        secret_key = current_app.config.get("JWT_SECRET_KEY")
    except RuntimeError:
        secret_key = None

    if not secret_key:
        secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise ValueError("JWT_SECRET_KEY es obligatoria y no puede estar vacía")

    return secret_key

def generate_token(id_usuario, rol):
    """Genera un JWT token válido por 7 días."""
    secret_key = _get_secret_key()

    payload = {
        'id_usuario': id_usuario,
        'rol': rol,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    return token

def verify_token(token):
    """Verifica y decodifica un JWT token. Retorna el payload o None si es inválido."""
    try:
        payload = jwt.decode(token, _get_secret_key(), algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorador para verificar que el request tenga un token JWT válido."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Busca el token en el header Authorization: Bearer <token>
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Token malformado'}), 401
        
        if not token:
            return jsonify({'error': 'Token no proporcionado'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido o expirado'}), 401
        
        # Pasar el payload al endpoint para que lo use si lo necesita
        request.usuario_id = payload['id_usuario']
        request.usuario_rol = payload['rol']
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorador que exige que el usuario sea administrador."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Busca el token en el header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Token malformado'}), 401
        
        if not token:
            return jsonify({'error': 'Token no proporcionado'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido o expirado'}), 401
        
        # Verificar que el rol sea administrador
        if payload.get('rol') != 'administrador':
            return jsonify({'error': 'Acceso denegado: requiere rol administrador'}), 403
        
        # Pasar el payload al endpoint
        request.usuario_id = payload['id_usuario']
        request.usuario_rol = payload['rol']
        
        return f(*args, **kwargs)
    
    return decorated
