/**
 * pages/ciudadano-horarios.js — Horarios de recolección por zona (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  let todasZonas = [];

  (async () => {
    try {
      const [{ usuario }, zonas, tipos] = await Promise.all([
        obtenerMiPerfil(),
        obtenerZonas(),
        obtenerTiposResiduo(),
      ]);
      todasZonas = zonas;

      renderMiZona(zonas.find((z) => z.nombre === usuario.zona) || null);
      renderTiposResiduo(tipos);
      renderTabla(todasZonas);
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar la información', err.message);
    }
  })();

  function renderMiZona(miZona) {
    const miZonaCard = document.getElementById('miZonaCard');
    if (miZona) {
      miZonaCard.innerHTML = `
        <div class="card-header"><h2 class="mb-0">📍 Tu zona: ${miZona.nombre}</h2></div>
        <p><strong>Horario:</strong> ${miZona.horarioRecoleccion}</p>
        <p><strong>Referencia:</strong> ${miZona.referencia}</p>
        <span class="badge badge-info">Residuo principal: ${miZona.tipoResiduoPrincipal}</span>
      `;
    } else {
      miZonaCard.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗺️</div><h3>No tienes una zona configurada</h3><p>Actualízala desde tu <a href="perfil.html">perfil</a>.</p></div>`;
    }
  }

  function renderTiposResiduo(tipos) {
    const gridTipos = document.getElementById('tiposResiduoGrid');
    gridTipos.innerHTML = '';
    tipos.forEach((tipo) => {
      const card = document.createElement('div');
      card.className = 'feature-card';
      card.innerHTML = `
        <div class="icon" style="background:${tipo.color}22; color:${tipo.color};">${tipo.icono}</div>
        <h3>${tipo.nombre}</h3>
        <p>${tipo.descripcion}</p>
        <p class="text-muted mb-0"><strong>Días:</strong> ${tipo.diasRecomendados.join(', ')}</p>
        <p class="text-muted mb-0"><strong>Contenedor:</strong> ${tipo.contenedor}</p>
      `;
      gridTipos.appendChild(card);
    });
  }

  function renderTabla(lista) {
    const tbody = document.getElementById('tablaZonas');
    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><h3>Sin resultados</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((z) => `
      <tr>
        <td><strong>${z.nombre}</strong></td>
        <td>${z.referencia}</td>
        <td>${z.horarioRecoleccion}</td>
        <td><span class="badge badge-neutral">${z.tipoResiduoPrincipal}</span></td>
      </tr>
    `).join('');
  }

  document.getElementById('filtroZona').addEventListener('input', (ev) => {
    const texto = ev.target.value.trim().toLowerCase();
    renderTabla(todasZonas.filter((z) => z.nombre.toLowerCase().includes(texto)));
  });
})();
