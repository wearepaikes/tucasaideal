import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AdminPortal from '../admin/AdminPortal.jsx';

const initialForm = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' };

export default function AdminAccess({ accessToken, apiUrl }) {
  const [valid, setValid] = useState(null);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState(() => {
    const token = new URLSearchParams(window.location.search).get('pending');
    return token ? { token, approved: false } : null;
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [liveNotice, setLiveNotice] = useState('');

  useEffect(() => {
    fetch(`${apiUrl}/auth/access/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken }) })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(() => fetch(`${apiUrl}/auth/me`, { credentials: 'include' }))
      .then(async (response) => { setValid(true); if (response.ok) setUser((await response.json()).user); })
      .catch(() => setValid(false));
  }, [accessToken, apiUrl]);

  useEffect(() => {
    if (!pending?.token || pending.approved) return undefined;
    const socket = io(new URL(apiUrl).origin, { withCredentials: true });
    const activate = async () => {
      const response = await fetch(`${apiUrl}/auth/pending/activate`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pendingToken: pending.token }) });
      if (!response.ok) return;
      const data = await response.json();
      window.history.replaceState({}, '', window.location.pathname);
      setPending(null);
      setUser(data.user);
    };
    socket.on('connect', () => socket.emit('pending:watch', pending.token));
    socket.on('registration:approved', activate);
    activate();
    return () => socket.disconnect();
  }, [apiUrl, pending?.token, pending?.approved]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return undefined;
    fetch(`${apiUrl}/auth/pending-users`, { credentials: 'include' }).then((response) => response.ok ? response.json() : []).then(setPendingUsers);
    const socket = io(new URL(apiUrl).origin, { withCredentials: true });
    socket.on('registration:pending', (newUser) => {
      setPendingUsers((current) => current.some((item) => item.id === newUser.id) ? current : [newUser, ...current]);
      setLiveNotice(`${newUser.firstName} ${newUser.lastName} solicitó acceso.`);
    });
    return () => socket.disconnect();
  }, [apiUrl, user?.role]);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setError('');
    const response = await fetch(`${apiUrl}/auth/${mode}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, accessToken }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setError(Array.isArray(data.message) ? data.message[0] : data.message || 'No pudimos completar el acceso.');
    if (data.status === 'pending') {
      window.history.replaceState({}, '', `${window.location.pathname}?pending=${encodeURIComponent(data.pendingToken)}`);
      setPending({ token: data.pendingToken, user: data.user, approved: false });
    }
    else setUser(data.user);
  };

  const approve = async (id) => {
    const response = await fetch(`${apiUrl}/auth/users/${id}/approve`, { method: 'PATCH', credentials: 'include' });
    if (response.ok) setPendingUsers((current) => current.filter((item) => item.id !== id));
  };

  if (valid === null) return <main className="auth-page auth-page--center"><p>Validando acceso seguro…</p></main>;
  if (!valid) return <main className="auth-page auth-page--center"><section className="auth-card"><img src="/logo.png" alt="Tu Casa Ideal"/><h1>Enlace no disponible</h1><p>Este enlace no es válido o fue revocado. Solicitá uno nuevo al administrador.</p></section></main>;
  if (pending) return <main className="approval-page"><section className="approval-card"><a href="/" className="auth-logo"><img src="/logo.png" alt="Tu Casa Ideal"/></a><div className={`approval-illustration${pending.approved ? ' is-approved' : ''}`} aria-hidden="true"><span className="approval-house">⌂</span><span className="approval-pulse"/></div><p className="eyebrow">{pending.approved ? 'Cuenta aprobada' : 'Solicitud recibida'}</p><h1>{pending.approved ? '¡Ya podés ingresar!' : 'Estamos revisando tu acceso'}</h1><p>{pending.approved ? 'Un administrador activó tu cuenta. Volvé al inicio de sesión para entrar al panel.' : `Gracias${pending.user?.firstName ? `, ${pending.user.firstName}` : ''}. Un administrador recibió tu solicitud y debe activarla. Esta pantalla se actualizará automáticamente.`}</p>{!pending.approved && <div className="approval-status"><span/><strong>Esperando aprobación en tiempo real</strong></div>}{pending.approved && <button className="btn btn--primary btn--block" onClick={() => { window.history.replaceState({}, '', window.location.pathname); setPending(null); setMode('login'); }}>Iniciar sesión</button>}<small>Podés cerrar esta ventana y regresar más tarde con el mismo enlace.</small></section></main>;
  if (user) return <AdminPortal user={user} apiUrl={apiUrl} onLogout={async () => { await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' }); setUser(null); }} />;

  return <main className="auth-page">
    <aside className="auth-visual" aria-label="Tu Casa Ideal"><img src="/admin-login.webp" alt="Casa terminada de Tu Casa Ideal en un entorno natural"/><div className="auth-visual__shade"/><div className="auth-visual__content"><span className="auth-visual__badge">Área de gestión</span><h2>Construimos hogares.<br/>Gestionamos confianza.</h2><p>Un espacio privado para el equipo que hace posible cada proyecto.</p><div className="auth-visual__secure"><span aria-hidden="true">✓</span> Acceso protegido y exclusivo</div></div></aside>
    <section className="auth-card"><a href="/" className="auth-logo"><img src="/logo.png" alt="Tu Casa Ideal"/></a><p className="eyebrow">Acceso privado</p><h1>{mode === 'login' ? 'Bienvenido de nuevo' : 'Creá tu cuenta'}</h1><p className="auth-intro">{mode === 'login' ? 'Ingresá para continuar al panel administrativo.' : 'Registro exclusivo para directores y administradores.'}</p>
    <a className="google-btn" href={`${apiUrl}/auth/google?accessToken=${encodeURIComponent(accessToken)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1V17A11.2 11.2 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.7 6.7 0 0 1 0-4.2V7H2.1a11.2 11.2 0 0 0 0 10l3.7-2.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A10.8 10.8 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>Continuar con Google</a>
    <div className="auth-divider"><span>o con correo</span></div>
    <form className="auth-form" onSubmit={submit}>{mode === 'register' && <div className="auth-row"><label><span>Nombre</span><input name="firstName" value={form.firstName} onChange={update} required /></label><label><span>Apellido</span><input name="lastName" value={form.lastName} onChange={update} required /></label></div>}<label><span>Correo</span><input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label><label><span>Contraseña</span><input type="password" name="password" value={form.password} onChange={update} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength="10" /></label>{mode === 'register' && <label><span>Confirmar contraseña</span><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} autoComplete="new-password" required /></label>}<p className="quote__err" role="alert">{error}</p><button className="btn btn--primary btn--block">{mode === 'login' ? 'Ingresar' : 'Registrarme'}</button></form>
    <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}</button>
  </section></main>;
}
