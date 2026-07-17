/**
 * pages/operador-incidencias.js — Reporte de incidencias por el operador (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  const selectZona = document.getElementById('zona');

  (async () => {
    try {
      const { usuario } = await obtenerMiPerfil();
      const zonas = await obtenerZonas();
      zonas.forEach((z) => {
        const opt = document.createElement('option');
        opt.value = z.nombre;
        opt.textContent = z.nombre;
        if (z.id === usuario.zonaAsignada) opt.selected = true;
        selectZona.appendChild(opt);
      });
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu información', err.message);
    }
  })();

  async function renderFeed() {
    const feed = document.getElementById('feedMisReportes');
    try {
      const propios = (await obtenerMisIncidencias()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      if (propios.length === 0) {
        feed.innerHTML = `<div class="empty-state"><h3>Sin reportes aún</h3></div>`;
        return;
      }
      feed.innerHTML = propios.slice(0, 6).map((i) => `
        <li class="feed-item">
          <span class="feed-dot"></span>
          <div class="feed-content">
            <p>${i.tipo} — ${badgeEstadoIncidencia(i.estado)}</p>
            <time>${formatearFechaHora(i.fecha)} · ${i.zona}</time>
          </div>
        </li>
      `).join('');
    } catch (err) {
      feed.innerHTML = `<div class="empty-state"><h3>No se pudieron cargar tus reportes</h3><p>${err.message}</p></div>`;
    }
  }

  renderFeed();

  const campos = {
    tipo: document.getElementById('tipo'),
    direccion: document.getElementById('direccion'),
    descripcion: document.getElementById('descripcion'),
  };
  const errores = {
    tipo: document.getElementById('errorTipo'),
    direccion: document.getElementById('errorDireccion'),
    descripcion: document.getElementById('errorDescripcion'),
  };

  const form = document.getElementById('formIncidenciaOperador');
  const btn = document.getElementById('btnEnviar');
  const btnTexto = document.getElementById('btnEnviarTexto');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    Object.keys(campos).forEach((k) => {
      campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });

    let valido = true;
    Object.keys(campos).forEach((k) => {
      const v = validarCampoObligatorio(campos[k].value);
      if (!v.valido) {
        campos[k].classList.add('is-invalid');
        errores[k].textContent = v.mensaje;
        errores[k].classList.add('show');
        valido = false;
      }
    });
    if (!valido) return;

    btn.disabled = true;
    btnTexto.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
      await crearIncidencia({
        tipo: campos.tipo.value,
        descripcion: campos.descripcion.value.trim(),
        zona: selectZona.value,
        direccion: campos.direccion.value.trim(),
        prioridad: document.getElementById('prioridad').value,
      });

      form.reset();
      renderFeed();
      mostrarToast('success', 'Reporte enviado', 'Tu incidencia fue registrada y notificada a la coordinación.');
    } catch (err) {
      mostrarToast('error', 'No se pudo enviar el reporte', err.message);
    } finally {
      btn.disabled = false;
      btnTexto.textContent = 'Enviar reporte';
    }
  });
})();
