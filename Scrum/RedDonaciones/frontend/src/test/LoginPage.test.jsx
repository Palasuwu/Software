/**
 * =============================================================================
 * LoginPage.test.jsx
 * -----------------------------------------------------------------------------
 * - fetch() es reemplazado mediante mocks (vi.stubGlobal).
 * - Nunca se consulta el backend real.
 * - Nunca se modifica la base de datos.
 * -Solo se prueba la lógica del componente LoginPage y su interacción con el usuario.
 * =============================================================================
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    render,
    screen,
    waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    MemoryRouter,
    RouterProvider,
    createMemoryRouter
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";


describe("LoginPage", () => {

    /**
     * -------------------------------------------------------------------------
     * Se ejecuta antes de cada prueba.
     * Mantiene cada test completamente independiente.
     * - Limpia el almacenamiento local
     * - Elimina todos los mocks
     * - Restaura fetch() a su estado original
     * -------------------------------------------------------------------------
     */
    beforeEach(() => {
        localStorage.clear();

        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });


    /**
     * -------------------------------------------------------------------------
     * CASO 1: Verifica que el formulario se renderice correctamente.
     *
     * Nota: Si cambia el diseño del Login o el texto de los componentes,este test deberá actualizarse.
     * -------------------------------------------------------------------------
     */
    it("renderiza correctamente el formulario de inicio de sesión", () => {

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("heading", {
                name: /iniciar sesion/i
            })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText(/correo/i)
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText(/contrasena/i)
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: /iniciar sesion/i
            })
        ).toBeInTheDocument();

    });


    /**
     * -------------------------------------------------------------------------
     * CASO 2: El usuario intenta iniciar sesión dejando el formulario vacío.
     * Debe:
     * - Mostrar mensajes de validación.
     * - No enviar ninguna petición HTTP.
     * -------------------------------------------------------------------------
     */
    it("muestra errores de validación cuando el formulario está vacío", async () => {

        const user = userEvent.setup();

        vi.stubGlobal("fetch", vi.fn());

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        await user.click(
            screen.getByRole("button", {
                name: /iniciar sesion/i
            })
        );

        expect(
            await screen.findByText("El correo es obligatorio")
        ).toBeInTheDocument();

        expect(
            screen.getByText("La contrasena es obligatoria")
        ).toBeInTheDocument();

        expect(fetch).not.toHaveBeenCalled();

    });


    /**
     * -------------------------------------------------------------------------
     * CASO 3: El usuario escribe un correo con formato inválido.
     * Debe:
     * - Mostrar el mensaje de error.
     * - No enviar ninguna petición al backend.
     * -------------------------------------------------------------------------
     */
    it("muestra un error cuando el correo no tiene un formato válido", async () => {

        const user = userEvent.setup();

        vi.stubGlobal("fetch", vi.fn());

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        await user.type(
            screen.getByLabelText(/correo/i),
            "correo-invalido"
        );

        await user.type(
            screen.getByLabelText(/contrasena/i),
            "12345678"
        );

        await user.click(
            screen.getByRole("button", {
                name: /iniciar sesion/i
            })
        );

        expect(
            await screen.findByText("Ingresa un correo valido")
        ).toBeInTheDocument();

        expect(fetch).not.toHaveBeenCalled();

    });


    /**
     * -------------------------------------------------------------------------
     * CASO 4: Simula un inicio de sesión exitoso
     * Se verifica que:
     * - Se invoque correctamente el callback
     * - Se almacene la sesión
     * - Se guarde el token
     * - Se redirija al Home
     * -------------------------------------------------------------------------
     */
    it("guarda la sesión y redirige correctamente después de un login exitoso", async () => {

        const user = userEvent.setup();

        const onAuthSuccess = vi.fn();

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,

                json: async () => ({
                    token: "token-demo",

                    usuario: {
                        id_usuario: 1,
                        correo: "ana@test.com",
                        rol: "donante"
                    }
                })
            })
        );

        const router = createMemoryRouter(
            [
                {
                    path: "/login",
                    element: (
                        <LoginPage
                            onAuthSuccess={onAuthSuccess}
                        />
                    )
                },
                {
                    path: "/HomePage",
                    element: <div>Home page</div>
                }
            ],
            {
                initialEntries: ["/login"]
            }
        );

        render(
            <RouterProvider router={router} />
        );

        await user.type(
            screen.getByLabelText(/correo/i),
            "ana@test.com"
        );

        await user.type(
            screen.getByLabelText(/contrasena/i),
            "12345678"
        );

        await user.click(
            screen.getByRole("button", {
                name: /iniciar sesion/i
            })
        );

        await waitFor(() => {

            expect(onAuthSuccess).toHaveBeenCalledWith(
                expect.objectContaining({
                    correo: "ana@test.com"
                })
            );

        });

        expect(
            localStorage.getItem("token")
        ).toBe("token-demo");

        expect(
            localStorage.getItem("usuario_actual")
        ).toBeTruthy();

        expect(
            router.state.location.pathname
        ).toBe("/HomePage");

    });

});