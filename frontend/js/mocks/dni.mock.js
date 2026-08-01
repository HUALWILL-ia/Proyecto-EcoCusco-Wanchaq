/**
 * mocks/dni.mock.js
 * Autocompletado de nombres/apellidos a partir del DNI (RENIEC vía
 * apis.net.pe, consultado del lado del backend — ver GET /api/dni/:numero).
 * Endpoint público: no requiere sesión, para poder usarse también desde el
 * registro público de ciudadano.
 */

async function consultarDni(numero) {
  const respuesta = await apiGet(`/dni/${numero}`, { autenticado: false });
  return respuesta.data;
}

window.consultarDni = consultarDni;
