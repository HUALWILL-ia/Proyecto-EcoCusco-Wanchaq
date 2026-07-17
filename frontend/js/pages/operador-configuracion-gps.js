/**
 * pages/operador-configuracion-gps.js — Preferencias de transmisión GPS (Fase 1)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  const claveConfig = 'ecoRutasWanchaq_config_gps_' + sesion.usuario.id;
  const config = Storage.get(claveConfig, { intervaloSeg: 10, compartir: true, precision: 'alta' });

  document.getElementById('compartirUbicacion').checked = config.compartir;
  document.getElementById('intervalo').value = String(config.intervaloSeg);
  document.getElementById('precision').value = config.precision;

  document.getElementById('formConfigGps').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nuevaConfig = {
      compartir: document.getElementById('compartirUbicacion').checked,
      intervaloSeg: Number(document.getElementById('intervalo').value),
      precision: document.getElementById('precision').value,
    };
    Storage.set(claveConfig, nuevaConfig);
    mostrarToast('success', 'Configuración guardada', 'Tus preferencias de GPS se actualizaron correctamente.');
  });
})();
