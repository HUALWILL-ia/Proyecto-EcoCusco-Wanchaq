/**
 * mocks/residuos.mock.js
 * FASE 2 — Catálogo de tipos de residuo servido por el backend real.
 */

async function obtenerTiposResiduo() {
  const respuesta = await apiGet('/tipos-residuo', { autenticado: false });
  return respuesta.data;
}

async function crearTipoResiduo(datos) {
  const respuesta = await apiPost('/tipos-residuo', datos);
  return respuesta.data;
}

async function actualizarTipoResiduo(id, cambios) {
  const respuesta = await apiPut(`/tipos-residuo/${id}`, cambios);
  return respuesta.data;
}

async function eliminarTipoResiduo(id) {
  await apiDelete(`/tipos-residuo/${id}`);
  return true;
}

window.obtenerTiposResiduo = obtenerTiposResiduo;
window.crearTipoResiduo = crearTipoResiduo;
window.actualizarTipoResiduo = actualizarTipoResiduo;
window.eliminarTipoResiduo = eliminarTipoResiduo;
