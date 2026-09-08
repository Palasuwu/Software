from services.resultado_campana_service import validar_resultado_campana


def test_normaliza_resultado_valido():
    resultado, errores = validar_resultado_campana({
        "resumen": "  Se entregaron alimentos a las familias.  ",
        "personas_beneficiadas": "45",
        "imagen_url": "  https://ejemplo.com/resultado.jpg  ",
    })

    assert errores is None
    assert resultado == {
        "resumen": "Se entregaron alimentos a las familias.",
        "personas_beneficiadas": 45,
        "imagen_url": "https://ejemplo.com/resultado.jpg",
    }


def test_permite_campos_opcionales_vacios():
    resultado, errores = validar_resultado_campana({
        "resumen": "La campaña cumplió su objetivo.",
        "personas_beneficiadas": "",
        "imagen_url": "",
    })

    assert errores is None
    assert resultado["personas_beneficiadas"] is None
    assert resultado["imagen_url"] is None


def test_rechaza_resumen_vacio_y_cantidad_negativa():
    resultado, errores = validar_resultado_campana({
        "resumen": "  ",
        "personas_beneficiadas": -1,
    })

    assert resultado is None
    assert "resumen" in errores
    assert "personas_beneficiadas" in errores
