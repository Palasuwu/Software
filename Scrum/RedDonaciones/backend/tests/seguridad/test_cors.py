# Tests para la configuración de CORS en la aplicación Flask

def test_cors_allows_local_origin(client):
    response = client.get("/login", headers={"Origin": "http://localhost:3000"})

    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"


def test_cors_allows_production_origin(client):
    response = client.get("/login", headers={"Origin": "http://20.97.176.27"})

    assert response.headers["Access-Control-Allow-Origin"] == "http://20.97.176.27"


def test_cors_omits_header_for_unallowed_origin(client):
    response = client.get("/login", headers={"Origin": "http://sitio-malicioso.example"})

    assert "Access-Control-Allow-Origin" not in response.headers


def test_cors_preflight_allows_configured_method_and_headers(client):
    response = client.options(
        "/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
    )

    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "POST" in response.headers["Access-Control-Allow-Methods"]
    allowed_headers = response.headers["Access-Control-Allow-Headers"]
    assert "Content-Type" in allowed_headers
    assert "Authorization" in allowed_headers


def test_cors_does_not_apply_to_health_check(client):
    response = client.get("/", headers={"Origin": "http://localhost:3000"})

    assert "Access-Control-Allow-Origin" not in response.headers