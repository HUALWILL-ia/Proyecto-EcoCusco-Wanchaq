/**
 * pages/admin-tipos-residuo.js — CRUD de tipos de residuo (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  let tiposActuales = [];

  async function cargar() {
    const grid = document.getElementById('gridTipos');
    grid.innerHTML = `<div class="loading-overlay"><span class="spinner"></span> Cargando catálogo...</div>`;
    try {
      tiposActuales = await obtenerTiposResiduo();
      render();
    } catch (err) {
      grid.innerHTML = `<div class="empty-state"><h3>No se pudo cargar el catálogo</h3><p>${err.message}</p></div>`;
    }
  }

  function render() {
    const grid = document.getElementById('gridTipos');

    if (tiposActuales.length === 0) {
      grid.innerHTML = `<div class="empty-state"><h3>Sin tipos registrados</h3></div>`;
      return;
    }

    grid.innerHTML = tiposActuales.map((t) => `
      <div class="feature-card">
        <div class="icon" style="background:${t.color}22; color:${t.color};"><i class="ph ph-${t.icono}" aria-hidden="true"></i></div>
        <h3>${t.nombre}</h3>
        <p>${t.descripcion}</p>
        <p class="text-muted mb-0"><strong>Contenedor:</strong> ${t.contenedor}</p>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-outline btn-sm" data-accion="editar" data-id="${t.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-accion="eliminar" data-id="${t.id}">Eliminar</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-accion="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirEdicion(btn.dataset.id));
    });
    grid.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminar(btn.dataset.id));
    });
  }

  cargar();

  const form = document.getElementById('formTipo');
  const campos = {
    nombreTipo: document.getElementById('nombreTipo'),
    descripcionTipo: document.getElementById('descripcionTipo'),
  };
  const errores = {
    nombreTipo: document.getElementById('errorNombreTipo'),
    descripcionTipo: document.getElementById('errorDescripcionTipo'),
  };

  document.getElementById('btnNuevoTipo').addEventListener('click', () => {
    form.reset();
    document.getElementById('tipoId').value = '';
    document.getElementById('tituloModalTipo').textContent = 'Nuevo tipo de residuo';
    abrirModal('modalTipo');
  });

  function abrirEdicion(id) {
    const tipo = tiposActuales.find((t) => String(t.id) === String(id));
    if (!tipo) return;
    document.getElementById('tipoId').value = tipo.id;
    campos.nombreTipo.value = tipo.nombre;
    campos.descripcionTipo.value = tipo.descripcion;
    document.getElementById('contenedorTipo').value = tipo.contenedor;
    document.getElementById('tituloModalTipo').textContent = `Editar ${tipo.nombre}`;
    abrirModal('modalTipo');
  }

  async function eliminar(id) {
    try {
      await eliminarTipoResiduo(id);
      await cargar();
      mostrarToast('success', 'Tipo eliminado', 'Se eliminó el tipo de residuo del catálogo.');
    } catch (err) {
      mostrarToast('error', 'No se pudo eliminar', err.message);
    }
  }

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

    const idExistente = document.getElementById('tipoId').value;
    const datos = {
      nombre: campos.nombreTipo.value.trim(),
      descripcion: campos.descripcionTipo.value.trim(),
      contenedor: document.getElementById('contenedorTipo').value.trim() || 'Por definir',
    };

    try {
      if (idExistente) await actualizarTipoResiduo(idExistente, datos);
      else await crearTipoResiduo(datos);

      cerrarModal('modalTipo');
      await cargar();
      mostrarToast('success', 'Tipo guardado', 'El tipo de residuo se guardó correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo guardar el tipo de residuo', err.message);
    }
  });
})();
