/**
 * pages/verificacion-2fa.js — Verificación en dos pasos (Fase 2, correo real)
 */

(function () {
  inicializarDatosSimulados();

  const pendiente = Storage.get(STORAGE_KEYS.DOS_FA_PENDIENTE, null);
  if (!pendiente) {
    window.location.href = 'login.html';
    return;
  }

  const correoDestino = document.getElementById('correoDestino');
  correoDestino.textContent = enmascararCorreo(pendiente.correo);

  mostrarAvisoEnvio();

  const digits = Array.from(document.querySelectorAll('.otp-digit'));
  const form = document.getElementById('formOtp');
  const errorOtp = document.getElementById('errorOtp');
  const btnVerificar = document.getElementById('btnVerificar');
  const linkReenviar = document.getElementById('linkReenviar');

  digits[0].focus();

  digits.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && idx < digits.length - 1) digits[idx + 1].focus();
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !input.value && idx > 0) digits[idx - 1].focus();
    });
    input.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const texto = (ev.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      texto.split('').forEach((char, i) => { if (digits[i]) digits[i].value = char; });
      if (texto.length > 0) digits[Math.min(texto.length, digits.length) - 1].focus();
    });
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorOtp.textContent = '';
    errorOtp.classList.remove('show');

    const codigo = digits.map((d) => d.value).join('');
    const validacion = validarCodigo2FA(codigo);
    if (!validacion.valido) {
      errorOtp.textContent = validacion.mensaje;
      errorOtp.classList.add('show');
      return;
    }

    btnVerificar.disabled = true;
    btnVerificar.innerHTML = '<span class="spinner"></span> Verificando...';

    const resultado = await verificarCodigo2FA(codigo);

    if (!resultado.ok) {
      btnVerificar.disabled = false;
      btnVerificar.textContent = 'Verificar código';
      errorOtp.textContent = resultado.mensaje;
      errorOtp.classList.add('show');
      mostrarToast('error', 'Verificación fallida', resultado.mensaje);
      return;
    }

    mostrarToast('success', 'Verificación exitosa', `Bienvenido ${resultado.usuario.nombres}.`);
    setTimeout(() => {
      if (resultado.usuario.rol === 'admin') window.location.href = 'admin/dashboard.html';
      else window.location.href = 'operador/dashboard.html';
    }, 700);
  });

  linkReenviar.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const resultado = await reenviarCodigo2FA();
    if (resultado.ok) {
      digits.forEach((d) => (d.value = ''));
      digits[0].focus();
      mostrarToast('info', 'Código reenviado', resultado.mensaje || 'Se envió un nuevo código de verificación a tu correo.');
    } else {
      mostrarToast('error', 'No se pudo reenviar', resultado.mensaje);
    }
  });

  function mostrarAvisoEnvio() {
    const caja = document.getElementById('cajaCodigoDemo');
    caja.innerHTML = `Enviamos un código de 6 dígitos por correo electrónico a <strong>${enmascararCorreo(pendiente.correo)}</strong>. Revisa tu bandeja de entrada (y spam) e ingrésalo a continuación.`;
  }

  function enmascararCorreo(correo) {
    const [usuario, dominio] = correo.split('@');
    if (!dominio) return correo;
    const visible = usuario.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(usuario.length - 2, 2))}@${dominio}`;
  }
})();
