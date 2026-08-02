/**
 * pages/operador-rutas.js — Detalle de rutas asignadas al operador (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  // GPS: solo puede haber una transmisión activa a la vez (un operador conduce
  // un solo camión), así que el watchId y la ruta que lo activó son globales.
  let watchId = null;
  let rutaTransmitiendoId = null;
  // Controla, por ruta, si "Iniciar ruta" ya fue presionado en esta sesión de
  // la página (o si la ruta ya venía "en_progreso" al cargar): evita que
  // "Finalizar ruta" quede habilitado sin haber iniciado antes.
  const rutasIniciadas = new Set();

  function activarGpsParaRuta(rutaId) {
    if (!('geolocation' in navigator)) {
      mostrarToast('error', 'GPS no disponible', 'Tu navegador no soporta geolocalización.');
      return;
    }
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    rutaTransmitiendoId = rutaId;
    watchId = navigator.geolocation.watchPosition(
      async (posicion) => {
        const { latitude: lat, longitude: lng, speed } = posicion.coords;
        const velocidadKmh = speed !== null && speed !== undefined ? Math.round(speed * 3.6 * 10) / 10 : null;
        try {
          await actualizarGPS(lat, lng, { velocidad: velocidadKmh, rutaId: rutaTransmitiendoId });
        } catch (err) {
          // Silencioso: no interrumpe al operador en campo por un envío puntual fallido.
        }
      },
      (error) => {
        mostrarToast('error', 'No se pudo transmitir tu ubicación', error.message || 'Verifica el permiso de ubicación.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function detenerGps() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    rutaTransmitiendoId = null;
  }

  async function render() {
    const contenedor = document.getElementById('listaRutas');
    contenedor.innerHTML = `<div class="card"><div class="loading-overlay"><span class="spinner"></span> Cargando rutas...</div></div>`;

    let rutas = [];
    try {
      rutas = await obtenerRutasPorOperador();
    } catch (err) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><h3>No se pudieron cargar tus rutas</h3><p>${err.message}</p></div></div>`;
      return;
    }

    if (rutas.length === 0) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon"><i class="ph ph-compass" aria-hidden="true"></i></div><h3>Sin rutas asignadas</h3><p>Tu coordinador aún no te ha asignado una ruta.</p></div></div>`;
      return;
    }

    rutas.forEach((ruta) => {
      if (ruta.estado === 'en_progreso' || ruta.estado === 'completada') rutasIniciadas.add(ruta.id);
    });

    // Progreso: se reutiliza tal cual el que ya calcula el backend
    // (puntos.completado / puntos.total, ver rutas.controller.js), por ser
    // el dato que ya existe en el modelo — no requiere agregar nada nuevo.
    contenedor.innerHTML = rutas.map((ruta) => {
      const iniciada = rutasIniciadas.has(ruta.id);
      const finalizada = ruta.estado === 'completada';
      const transmitiendo = rutaTransmitiendoId === ruta.id;

      return `
      <div class="card" data-ruta-id="${ruta.id}">
        <div class="card-header">
          <div>
            <h2 class="mb-0">${ruta.nombre}</h2>
            <span class="text-muted">Turno: ${ruta.turno}</span>
          </div>
          ${badgeEstadoRuta(ruta.estado)}
        </div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${ruta.progreso}%"></div></div>
        <p class="text-muted mt-2">${ruta.progreso}% completado — ${ruta.puntos.filter((p) => p.completado).length}/${ruta.puntos.length} puntos</p>
        <div class="table-wrapper mt-3">
          <table class="data-table">
            <thead><tr><th>#</th><th>Punto de recojo</th><th>Completado</th></tr></thead>
            <tbody>
              ${ruta.puntos.map((p) => {
                const id = `punto-${ruta.id}-${p.orden}`;
                return `
                <tr>
                  <td>${p.orden}</td>
                  <td>${p.direccion}</td>
                  <td>
                    <div class="form-check" style="margin:0;">
                      <input type="checkbox" id="${id}" data-accion="punto" data-ruta-id="${ruta.id}" data-orden="${p.orden}" ${p.completado ? 'checked' : ''} ${finalizada ? 'disabled' : ''}>
                      <label for="${id}">${p.completado ? 'Completado' : 'Pendiente'}</label>
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="flex items-center gap-2 mt-3" style="flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" data-accion="iniciar" data-id="${ruta.id}" ${iniciada || finalizada ? 'disabled' : ''}><i class="ph-bold ph-play" aria-hidden="true"></i> Iniciar ruta</button>
          <button class="btn btn-danger btn-sm" data-accion="finalizar" data-id="${ruta.id}" ${!iniciada || finalizada ? 'disabled' : ''}><i class="ph-bold ph-stop" aria-hidden="true"></i> Finalizar ruta</button>
          <a href="registro-recoleccion.html" class="btn btn-primary btn-sm">Registrar recolección</a>
          ${transmitiendo ? '<span class="badge badge-success"><i class="ph-bold ph-navigation-arrow" aria-hidden="true"></i> GPS activo — transmitiendo ubicación</span>' : ''}
        </div>
      </div>
    `;
    }).join('');

    contenedor.querySelectorAll('input[data-accion="punto"]').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        const rutaId = Number(checkbox.dataset.rutaId);
        const orden = Number(checkbox.dataset.orden);
        const completado = checkbox.checked;
        checkbox.disabled = true;
        try {
          await actualizarPuntoRuta(rutaId, orden, completado);
        } catch (err) {
          mostrarToast('error', 'No se pudo actualizar el punto', err.message);
        } finally {
          render(); // refleja el nuevo % de progreso calculado por el backend
        }
      });
    });

    contenedor.querySelectorAll('button[data-accion="iniciar"]').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = Number(boton.dataset.id);
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Iniciando...';
        try {
          await iniciarRuta(id);
          rutasIniciadas.add(id);
          activarGpsParaRuta(id);
          mostrarToast('success', 'Ruta iniciada', 'GPS activo: tu ubicación se transmite en tiempo real.');
        } catch (err) {
          mostrarToast('error', 'No se pudo iniciar la ruta', err.message);
        } finally {
          render();
        }
      });
    });

    contenedor.querySelectorAll('button[data-accion="finalizar"]').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = Number(boton.dataset.id);
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Finalizando...';
        try {
          await finalizarRuta(id);
          if (rutaTransmitiendoId === id) detenerGps();
          mostrarToast('success', 'Ruta finalizada', 'Se notificó automáticamente a los ciudadanos de la zona.');
        } catch (err) {
          mostrarToast('error', 'No se pudo finalizar la ruta', err.message);
        } finally {
          render();
        }
      });
    });
  }

  render();

  window.addEventListener('beforeunload', () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  });
})();
