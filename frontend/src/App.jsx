import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import PhoneInputModule from 'react-phone-input-2';
import phoneEs from 'react-phone-input-2/lang/es.json';
import 'react-phone-input-2/lib/style.css';
import { projects as fallbackProjects, works as fallbackWorks } from './data.js';
import AdminAccess from './features/auth/AdminAccess.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const PhoneInput = PhoneInputModule.default || PhoneInputModule;
const WA_NUMBER = '59892501142';
const wa = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
const publicAsset = (value, folder) => {
  if (!value) return '/admin-login.webp';
  if (/^(https?:)?\//.test(value)) return value;
  return `${folder}${value.replace(/\.(jpg|jpeg|png|webp)$/i, '')}.jpg`;
};

function CountUp({ value }) {
  const element = useRef(null);
  const current = useRef(0);
  const frame = useRef(0);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: .1 });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const target = Math.max(0, Number(value) || 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { current.current = target; setDisplay(target); return undefined; }
    cancelAnimationFrame(frame.current);
    const startValue = current.current;
    const startedAt = performance.now();
    const duration = 1300;
    const tick = (time) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startValue + (target - startValue) * eased);
      current.current = next; setDisplay(next);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, visible]);

  return <span ref={element} className="count-up" aria-label={String(value)}>{display}</span>;
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.96-3.48-.23-.36a9.43 9.43 0 0 1-1.44-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44M20.08 3.9A11.3 11.3 0 0 0 12.05.57C5.8.57.7 5.66.7 11.92c0 2 .52 3.95 1.52 5.67L.6 23.43l5.97-1.57a11.3 11.3 0 0 0 5.47 1.4h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02"/></svg>;
}

function HouseFactIcon({ type }) {
  if (type === 'area') return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 4h6M4 4v6M20 20h-6m6 0v-6M9 15l6-6M9 9h6v6"/></svg>;
  if (type === 'bed') return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 18v-7m18 7v-5a2 2 0 0 0-2-2H9a3 3 0 0 0-3 3v4m0-7V8h5a2 2 0 0 1 2 2v1M3 16h18M5 18v2m14-2v2"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 13h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Zm3 0V6a3 3 0 0 1 6 0m-2 1h4M7 20v1m10-1v1"/></svg>;
}

const models = [
  { size: '18', image: '/modulo-18.jpg', description: 'Módulo monoambiente · también oficina, aula o local', video: 'Y54bsjJCyVU' },
  { size: '30', image: '/casa-30.jpg', description: '1 dormitorio · 1 baño', video: 'Z7onhKVl9sE', pdf: 'https://www.tucasaideal.com.uy/_files/ugd/0e7c27_e8aebf04e7f44bb892a88087b3bba63a.pdf' },
  { size: '42', image: '/casa-42.jpg', description: '2 dormitorios · 1 baño', video: 'x0n3MMZ64TY', pdf: 'https://www.tucasaideal.com.uy/_files/ugd/0e7c27_a595cf36d62c4fd1a2a7268dbe1a2ad1.pdf', featured: true },
  { size: '52', image: '/casa-52.jpg', description: '[X] dormitorios · 1 baño', video: 'vRzicYFD6AA', pdf: 'https://www.tucasaideal.com.uy/_files/ugd/0e7c27_29d6f4d08af244cb83d54c9af87fd65e.pdf' },
];

const tourVideos = { '18': 'Y54bsjJCyVU', '30': 'Z7onhKVl9sE', '42': 'x0n3MMZ64TY', '52': 'vRzicYFD6AA' };

function VideoModal({ video, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return undefined;
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, [video]);
  if (!video) return null;
  return <dialog ref={dialog} className="vmodal" aria-label={video.title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <button className="vmodal__close" onClick={onClose} aria-label="Cerrar">×</button>
    <div className="vmodal__frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
  </dialog>;
}

function Gallery({ gallery, onClose }) {
  const [index, setIndex] = useState(gallery?.index || 0);
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!gallery || !element) return undefined;
    setIndex(gallery.index || 0);
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, [gallery]);
  if (!gallery) return null;
  const safeIndex = Math.min(index, Math.max(0, gallery.items.length - 1));
  const current = gallery.items[safeIndex];
  if (!current) return null;
  const move = (amount) => setIndex((index + amount + gallery.items.length) % gallery.items.length);
  return <dialog ref={dialog} className="gmodal" aria-label="Fotos del proyecto" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="gmodal__top"><p className="gmodal__title">{current.title || gallery.name}</p><button className="gmodal__close" onClick={onClose} aria-label="Cerrar">×</button></div>
    <div className="gmodal__stage"><button className="gmodal__nav gmodal__nav--prev" onClick={() => move(-1)} aria-label="Foto anterior">‹</button><img src={current.src} alt={current.alt} /><button className="gmodal__nav gmodal__nav--next" onClick={() => move(1)} aria-label="Foto siguiente">›</button></div>
    <p className="gmodal__count">{safeIndex + 1} / {gallery.items.length}</p>
  </dialog>;
}

function QuoteForm({ selectedModel, setSelectedModel }) {
  const [step, setStep] = useState(selectedModel ? 2 : 1);
  const [form, setForm] = useState({ model: selectedModel || '', land: '', location: '', name: '', phone: '+598' });
  const [phoneDialCode, setPhoneDialCode] = useState('598');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const update = (key, value) => { setForm((old) => ({ ...old, [key]: value })); setError(''); };
  const next = async (event) => {
    event.preventDefault();
    const subscriberDigits = form.phone.replace(/\D/g, '').slice(phoneDialCode.length);
    const errors = [!form.model && 'Elegí un modelo.', !form.land && 'Elegí una opción.', !form.location.trim() && 'Contanos en qué localidad.', (!form.name.trim() || subscriberDigits.length < 6) && 'Completá tu nombre y un teléfono válido.'];
    if (errors[step - 1]) return setError(errors[step - 1]);
    if (step < 4) return setStep(step + 1);
    try {
      const response = await fetch(`${API_URL}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error('No pudimos guardar tu solicitud.');
    } catch { setError('No pudimos guardar tu solicitud. Revisá tu conexión e intentá nuevamente.'); return; }
    const message = `Hola! Quiero un presupuesto.\n• Nombre: ${form.name}\n• Teléfono: ${form.phone}\n• Modelo: ${form.model}\n• ¿Tengo terreno?: ${form.land}\n• Localidad: ${form.location}`;
    window.open(wa(message), '_blank', 'noopener');
    setDone(message);
  };
  if (done) return <div className="quote quote__done"><h3>¡Listo, {form.name}!</h3><p>Se abrió WhatsApp con tus datos. Enviá el mensaje y te respondemos con el presupuesto.</p><a className="btn btn--wa" href={wa(done)} target="_blank" rel="noreferrer"><WhatsAppIcon />Abrir WhatsApp de nuevo</a></div>;
  const options = (name, values) => <div className={`opts ${values.length < 4 ? 'opts--col' : ''}`}>{values.map(([value, label]) => <label key={value}><input type="radio" name={name} checked={form[name] === value} onChange={() => { update(name, value); if (step < 3) setTimeout(() => setStep(step + 1), 180); }} /><span>{label}</span></label>)}</div>;
  return <form className="quote" onSubmit={next} noValidate>
    <div className="quote__head"><span>Paso {step} de 4</span><span>Menos de 1 minuto</span></div><div className="quote__bar"><span style={{ width: `${step * 25}%` }} /></div>
    {step === 1 && <fieldset className="qstep"><legend>¿Qué modelo te interesa?</legend>{options('model', [['Módulo 18 m²','18 m²'],['30 m²','30 m²'],['42 m²','42 m²'],['52 m²','52 m²'],['Todavía no sé','Todavía no sé']])}</fieldset>}
    {step === 2 && <fieldset className="qstep"><legend>¿Tenés terreno?</legend>{options('land', [['Sí','Sí'],['No','No'],['Lo estoy buscando','Lo estoy buscando']])}</fieldset>}
    {step === 3 && <fieldset className="qstep"><legend>¿En qué localidad?</legend><label className="field"><span>Localidad</span><input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Ej: Atlántida, Canelones" autoComplete="address-level2" /></label></fieldset>}
    {step === 4 && <fieldset className="qstep"><legend>¿A quién le escribimos?</legend><label className="field"><span>Nombre</span><input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" /></label><div className="field phone-field"><span>Teléfono</span><PhoneInput country="uy" preferredCountries={['uy']} value={form.phone} onChange={(value, country) => { setPhoneDialCode(country?.dialCode || ''); update('phone', value ? `+${value}` : ''); }} localization={phoneEs} enableSearch autocompleteSearch searchPlaceholder="Buscar país o prefijo" searchNotFound="No encontramos ese país" countryCodeEditable={false} inputProps={{ name: 'phone', autoComplete: 'tel', required: true, 'aria-label': 'Número de teléfono internacional' }} containerClass="international-phone" inputClass="international-phone__input" buttonClass="international-phone__button" dropdownClass="international-phone__dropdown" searchClass="international-phone__search"/></div></fieldset>}
    <p className="quote__err" role="alert">{error}</p><div className="quote__nav">{step > 1 && <button type="button" className="btn btn--outline" onClick={() => setStep(step - 1)}>Atrás</button>}<button className={`btn btn--block ${step === 4 ? 'btn--wa' : 'btn--accent'}`}>{step === 4 && <WhatsAppIcon />}{step === 4 ? 'Enviar por WhatsApp' : 'Siguiente'}</button></div><p className="quote__note">Usamos tus datos solo para enviarte el presupuesto.</p>
  </form>;
}

export default function App() {
  const [filter, setFilter] = useState('all');
  const [worksPage, setWorksPage] = useState(1);
  const [video, setVideo] = useState(null);
  const [gallery, setGallery] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [projectsPerPage, setProjectsPerPage] = useState(() => window.matchMedia('(max-width: 719px)').matches ? 4 : 6);
  const [worksPerPage, setWorksPerPage] = useState(() => window.matchMedia('(max-width: 719px)').matches ? 4 : 6);
  const [publicProjects, setPublicProjects] = useState(Object.values(fallbackProjects));
  const [publicWorks, setPublicWorks] = useState(fallbackWorks);
  const [serviceYears, setServiceYears] = useState(0);
  const [houseCount, setHouseCount] = useState(0);
  const accessToken = window.location.pathname.match(/^\/acceso\/([^/]+)$/)?.[1];
  useEffect(() => {
    Promise.all([fetch(`${API_URL}/projects`).then((r) => r.ok ? r.json() : []), fetch(`${API_URL}/works`).then((r) => r.ok ? r.json() : [])])
      .then(([nextProjects, nextWorks]) => { setPublicProjects(nextProjects); setPublicWorks(nextWorks); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (accessToken) return undefined;
    const applyProfile = (profile) => { setServiceYears(Number(profile.years) || 0); setHouseCount(Number(profile.houseCount) || 0); };
    const loadProjects = () => fetch(`${API_URL}/projects`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('No se pudieron cargar los proyectos.');
      return response.json();
    }).then(setPublicProjects).catch(() => {});
    const loadWorks = () => fetch(`${API_URL}/works`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('No se pudieron cargar las casas.');
      return response.json();
    }).then(setPublicWorks).catch(() => {});
    const loadProfile = () => fetch(`${API_URL}/business-profile`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('No se pudo cargar el perfil público.');
      return response.json();
    }).then(applyProfile).catch(() => {});
    loadProfile();
    const socket = io(new URL(API_URL).origin, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect', () => { loadProfile(); loadProjects(); loadWorks(); });
    socket.on('business-profile:updated', applyProfile);
    socket.on('projects:updated', loadProjects);
    socket.on('works:updated', loadWorks);
    const refreshPublicData = () => { loadProfile(); loadProjects(); loadWorks(); };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refreshPublicData(); };
    window.addEventListener('focus', refreshPublicData);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { socket.off('business-profile:updated', applyProfile); socket.off('projects:updated', loadProjects); socket.off('works:updated', loadWorks); socket.disconnect(); window.removeEventListener('focus', refreshPublicData); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [accessToken]);
  const filteredWorks = useMemo(() => publicWorks.filter((item) => filter === 'all' || item.model === filter), [filter, publicWorks]);
  const worksPageCount = Math.max(1, Math.ceil(filteredWorks.length / worksPerPage));
  const visibleWorks = useMemo(() => filteredWorks.slice((worksPage - 1) * worksPerPage, worksPage * worksPerPage), [filteredWorks, worksPage, worksPerPage]);
  const filteredProjects = useMemo(() => {
    const query = projectQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (!query) return publicProjects;
    return publicProjects.filter((project) => project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
  }, [projectQuery, publicProjects]);
  const projectPageCount = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage));
  const visibleProjects = useMemo(() => filteredProjects.slice((projectPage - 1) * projectsPerPage, projectPage * projectsPerPage), [filteredProjects, projectPage, projectsPerPage]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 719px)');
    const updatePageSize = () => { setProjectsPerPage(media.matches ? 4 : 6); setWorksPerPage(media.matches ? 4 : 6); };
    media.addEventListener('change', updatePageSize);
    return () => media.removeEventListener('change', updatePageSize);
  }, []);
  useEffect(() => { setProjectPage(1); }, [projectQuery, projectsPerPage]);
  useEffect(() => { setProjectPage((page) => Math.min(page, projectPageCount)); }, [projectPageCount]);
  useEffect(() => { setWorksPage(1); }, [filter, worksPerPage]);
  useEffect(() => { setWorksPage((page) => Math.min(page, worksPageCount)); }, [worksPageCount]);
  const goToProjectPage = (page) => {
    setProjectPage(page);
    requestAnimationFrame(() => document.getElementById('proyectos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const goToWorksPage = (page) => {
    setWorksPage(page);
    requestAnimationFrame(() => document.getElementById('obras')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openProject = (project) => setGallery({ name: project.name, items: (Array.isArray(project.photos) ? project.photos : []).map((photo, i) => ({ src: publicAsset(photo, '/proyectos/'), alt: `${project.name}, foto ${i + 1}` })) });
  const chooseModel = (model) => { setSelectedModel(model); document.getElementById('presupuesto')?.scrollIntoView({ behavior: 'smooth' }); };
  if (accessToken) return <AdminAccess accessToken={accessToken} apiUrl={API_URL} />;
  return <>
    <header className="topbar"><div className="wrap topbar__in"><a href="#" className="logo" aria-label="Tu Casa Ideal, inicio"><img src="/logo.png" alt="Tu Casa Ideal" width="323" height="180" /></a><nav className="topnav" aria-label="Secciones"><a href="#modelos">Modelos</a><a href="#proyectos">Proyectos</a><a href="#como-funciona">Cómo funciona</a><a href="#obras">Obras</a><a href="#showroom">Showroom</a></nav><a className="btn btn--wa btn--sm" href={wa('Hola! Quiero info sobre las casas.')} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>WhatsApp</span></a></div></header>
    <main>
      <section className="hero"><img className="hero__img" src="/hero.jpg" alt="Casa prefabricada terminada de Tu Casa Ideal" /><div className="hero__shade"/><div className="wrap hero__in"><p className="eyebrow eyebrow--light">Casas prefabricadas en todo Uruguay</p><h1>Tu casa en <span className="nowrap">15 días</span></h1><p className="hero__price">Desde <strong>USD 14.500</strong></p><a href="#presupuesto" className="btn btn--accent btn--lg">Pedí tu presupuesto</a></div></section>
      <section className="trust"><div className="wrap trust__in"><div className="trust__item"><strong>+<CountUp value={serviceYears}/> años</strong><span>en el mercado</span></div><div className="trust__item"><strong>+<CountUp value={houseCount}/> casas</strong><span>entregadas en todo el país</span></div><a className="trust__item trust__item--link" href="#showroom" aria-label="Ver foto y datos del showroom"><strong>Showroom</strong><span>Ver oficina en Parque del Plata ↓</span></a></div></section>
      <section className="section" id="modelos"><div className="wrap"><p className="eyebrow">Casas prefabricadas</p><h2>Elegí tu modelo</h2><p className="lead">Cuatro formas de empezar, pensadas para distintas necesidades y etapas.</p><div className="cards">{models.map((model) => <article className="card" key={model.size}>{model.featured && <span className="badge">Más elegida</span>}<img src={model.image} alt={`Casa de ${model.size} m²`} loading="lazy"/><div className="card__body"><h3>{model.size} m²</h3><p className="muted">{model.description}</p><p className="card__price">Kit desde <strong>USD [X]</strong></p><div className="card__links">{model.pdf && <a href={model.pdf} target="_blank" rel="noreferrer">Informe técnico (PDF)</a>}<button className="linkbtn" onClick={() => setVideo({ id: model.video, title: `Casa de ${model.size} m²` })}>Ver video</button></div><div className="card__actions"><button className="btn btn--primary btn--block" onClick={() => chooseModel(model.size === '18' ? 'Módulo 18 m²' : `${model.size} m²`)}>Quiero esta</button><a className="btn btn--wa btn--block" href={wa(`Hola, vi la web y me interesa la casa de ${model.size} m²`)} target="_blank" rel="noreferrer" aria-label={`Cotizar casa de ${model.size} metros cuadrados por WhatsApp`}><WhatsAppIcon />Cotizar por WhatsApp</a></div></div></article>)}</div></div></section>
      <section className="project-directory" id="proyectos"><div className="wrap"><header className="project-directory__head"><div><p className="eyebrow">Desarrollos a medida</p><h2>Todos nuestros proyectos</h2><p>Explorá cada desarrollo, conocé su estado y recorré todas sus imágenes.</p></div><label className="project-search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg><span>Buscar proyecto</span><input type="search" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Ej: Solymar, Gardens…"/></label></header><div className="project-directory__meta"><strong>{filteredProjects.length}</strong><span>{filteredProjects.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}</span>{projectQuery && <button type="button" onClick={() => setProjectQuery('')}>Limpiar búsqueda</button>}</div>{filteredProjects.length ? <><div className="project-directory__grid">{visibleProjects.map((project, index) => <article className="directory-project" key={project.id || project.name}><button className="directory-project__image" onClick={() => openProject(project)}><img src={publicAsset(project.cover, '/proyectos/thumb/')} alt={project.name} loading="lazy"/><span>{String((projectPage - 1) * projectsPerPage + index + 1).padStart(2, '0')}</span><em>{Array.isArray(project.photos) ? project.photos.length : 0} fotos</em></button><div><p className="eyebrow">Proyecto residencial</p><h3>{project.name}</h3><span className={`tag ${project.status === 'En desarrollo' ? 'tag--new' : ''}`}>{project.status}</span><button className="directory-project__open" onClick={() => openProject(project)}>Recorrer proyecto <b>↗</b></button></div></article>)}</div>{projectPageCount > 1 && <nav className="project-pagination" aria-label="Páginas de proyectos"><button type="button" disabled={projectPage === 1} onClick={() => goToProjectPage(projectPage - 1)} aria-label="Página anterior">←</button>{Array.from({ length: projectPageCount }, (_, index) => index + 1).map((page) => <button type="button" className={page === projectPage ? 'is-current' : ''} aria-current={page === projectPage ? 'page' : undefined} onClick={() => goToProjectPage(page)} key={page}>{page}</button>)}<button type="button" disabled={projectPage === projectPageCount} onClick={() => goToProjectPage(projectPage + 1)} aria-label="Página siguiente">→</button><span>Página {projectPage} de {projectPageCount}</span></nav>}</> : <div className="project-directory__empty"><span>⌕</span><h3>No encontramos ese proyecto</h3><p>Probá con otro nombre o limpiá la búsqueda.</p><button className="btn btn--outline" onClick={() => setProjectQuery('')}>Mostrar todos</button></div>}<div className="project-directory__cta"><div><p className="eyebrow">Una idea puede ser el próximo proyecto</p><h3>¿Tenés un desarrollo en mente?</h3><p>Diseñamos complejos de viviendas, oficinas, vestuarios, aulas y locales a medida.</p></div><button className="btn btn--accent" onClick={() => chooseModel('Proyecto a medida')}>Consultar proyecto</button></div></div></section>
      <section className="section section--ink" id="incluye"><div className="wrap split split--suma"><div><h2>¿Qué incluye el precio?</h2><p className="lead">El precio publicado es el de la casa. Para tenerla lista en tu terreno se suman tres cosas que dependen de dónde está y cómo es.</p></div><div className="suma is-on is-done">{[['Tu casa','Paneles, aberturas y terminaciones','desde USD 14.500'],['+ Platea','Base de hormigón','según tu terreno'],['+ Flete','Traslado hasta tu terreno','según la distancia'],['+ Armado','Casa armada en 15 días','a cotizar']].map((row) => <div className="suma__row" key={row[0]}><div><strong>{row[0]}</strong><span>{row[1]}</span></div><b>{row[2]}</b></div>)}<div className="suma__total"><strong>= Precio final</strong><b className="suma__num">A cotizar</b><a href="#presupuesto" className="btn btn--accent suma__btn">Solicitá tu presupuesto</a></div></div></div></section>
      <section className="section" id="como-funciona"><div className="wrap"><h2>Cómo funciona</h2><ol className="steps">{[['Consulta','Nos escribís o venís al showroom y vemos qué modelo te sirve.'],['Presupuesto','Te pasamos el precio total llave en mano para tu terreno.'],['Platea','Se hace la base de hormigón donde va la casa.'],['Casa armada','En 15 días tu casa queda armada.']].map(([title,text],i) => <li key={title}><span className="steps__n">{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>
      <section className="section section--dark" id="armado"><div className="wrap split"><button className="video" onClick={() => setVideo({ id:'YbPuoSA85Uk', title:'Proceso de armado' })}><img src="https://i.ytimg.com/vi/YbPuoSA85Uk/hqdefault.jpg" alt=""/><span className="video__play">▶</span></button><div><h2>De la platea a la casa en 15 días</h2><p className="lead">Mirá cómo se arma una casa, de principio a fin.</p><button className="btn btn--ghost-light" onClick={() => setVideo({ id:'30jzt1VY73k', title:'Armado en detalle' })}>Ver armado en detalle</button></div></div></section>
      <section className="section section--sand works-experience" id="obras"><div className="wrap"><header className="works-experience__head"><div><a className="works-video-channel" href="https://www.youtube.com/channel/UCGkd9MNX238Q8gKT4ESRuYQ" target="_blank" rel="noreferrer"><i>▶</i> Ver todos nuestros videos <b>↗</b></a><p className="eyebrow">Fotos y recorridos reales</p><h2>Casas que podés ver por dentro</h2><p className="lead">Explorá obras entregadas en todo Uruguay y mirá el recorrido interior del modelo que más te guste.</p></div><div className="works-experience__seal"><strong>{publicWorks.length}</strong><span>casas<br/>publicadas</span></div></header><div className="chips">{[['all','Todas'],['18','18 m²'],['30','30 m²'],['42','42 m²'],['52','52 m²']].map(([value,label]) => <button className={`chip ${filter === value ? 'is-on' : ''}`} key={value} onClick={() => {setFilter(value);setWorksPage(1)}}>{label}</button>)}</div><div className="ogrid">{visibleWorks.map((work,i) => { const tourId = work.youtube || work.youtubeId || tourVideos[String(work.model)]; return <article className="obra" key={work.id || work.photo}><button className="obra__img" onClick={() => setGallery({name:'Casas entregadas',index:i,items:visibleWorks.map((item) => ({src:publicAsset(item.photo,'/obras/'),alt:`Casa de ${item.model} m² en ${item.location}`,title:`${item.model} m² · ${item.location}`}))})}><img src={publicAsset(work.photo,'/obras/thumb/')} alt={`Casa de ${work.model} m² en ${work.location}`} loading="lazy"/><span className="obra__photos">⌕ Ver fotos</span></button><div className="obra__body"><p className="eyebrow">Obra entregada</p><strong>{work.name || (work.model === '18' ? 'Módulo 18 m²' : `${work.model} m²`)}</strong><span className="obra__location">{work.location}</span><div className="obra__facts" aria-label="Características de la casa"><span title="Metraje"><HouseFactIcon type="area"/><b>{work.area || work.model} m²</b></span>{work.bedrooms != null && <span title="Dormitorios"><HouseFactIcon type="bed"/><b>{work.bedrooms}</b></span>}{work.bathrooms != null && <span title="Baños"><HouseFactIcon type="bath"/><b>{work.bathrooms}</b></span>}</div>{tourId && <button className="obra__video" onClick={() => setVideo({id:tourId,title:`Recorrido casa de ${work.model} m²`})}><i>▶</i><span><small>Video del modelo</small>Recorrer por dentro</span><b>↗</b></button>}</div></article>; })}</div>{worksPageCount > 1 && <nav className="works-pagination" aria-label="Páginas de casas entregadas"><button type="button" disabled={worksPage === 1} onClick={() => goToWorksPage(worksPage - 1)} aria-label="Página anterior">←</button>{Array.from({ length: worksPageCount }, (_, index) => index + 1).map((page) => <button type="button" className={page === worksPage ? 'is-current' : ''} aria-current={page === worksPage ? 'page' : undefined} onClick={() => goToWorksPage(page)} key={page}>{page}</button>)}<button type="button" disabled={worksPage === worksPageCount} onClick={() => goToWorksPage(worksPage + 1)} aria-label="Página siguiente">→</button><span>Página {worksPage} de {worksPageCount}</span></nav>}<div className="works-experience__actions"><a href="#presupuesto" className="btn btn--accent">Quiero mi presupuesto</a></div></div></section>
      <section className="section" id="faq"><div className="wrap wrap--narrow"><h2>Preguntas frecuentes</h2><div className="faq">{[['¿Necesito tener terreno?','Sí, la casa se arma sobre una platea en tu terreno. Si todavía lo estás buscando, escribinos igual y te orientamos.'],['¿Qué incluye el precio?','El kit incluye paneles, aberturas y terminaciones. Se suman la platea, el flete y el armado.'],['¿Qué permisos necesito para instalarla?','Depende de la intendencia de tu departamento. Te asesoramos al pedir el presupuesto.'],['¿Hay financiación?','Consultanos por las opciones de pago y financiación vigentes.'],['¿Llegan al interior del país?','Sí, entregamos en todo Uruguay. El flete se calcula según la distancia.'],['¿Qué pasa si mi terreno no es plano?','La platea se adapta al terreno. Lo evaluamos al armar el presupuesto.'],['¿Se puede ampliar después?','Consultanos para evaluar las posibilidades de ampliación del modelo elegido.']].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
      <section className="section section--ink" id="presupuesto"><div className="wrap split split--form"><div><h2>Recibí tu presupuesto llave en mano</h2><p className="lead">Cuatro preguntas rápidas y te escribimos por WhatsApp con el precio total para tu terreno.</p><div className="showroom" id="showroom"><img src="/showroom.jpg" alt="Showroom de Tu Casa Ideal"/><div className="showroom__body"><h3>Visitá el showroom</h3><p>Ruta Interbalnearia km 49, acera sur<br/>Parque del Plata, Canelones</p><p>Lunes a sábado<br/>8:30 a 12:00 y 14:00 a 18:00</p><p>Tel. <a href="tel:+59843752096">4375 2096</a> · <a href="tel:+59899669912">099 669 912</a></p><button className="showroom__video" type="button" onClick={() => setVideo({ id: 'Oo5ww9XAGlw', title: 'Tour por el showroom' })}><i>▶</i><span><small>Conocelo antes de venir</small>Ver video del showroom</span><b>↗</b></button><a className="btn btn--wa btn--block" href={wa('Hola! Quiero coordinar una visita al showroom de Parque del Plata.')} target="_blank" rel="noreferrer"><WhatsAppIcon />Coordiná tu visita</a></div><iframe className="map" title="Mapa del showroom" loading="lazy" src="https://www.google.com/maps?q=Tu+Casa+Ideal,+Ruta+Interbalnearia+km+49,+Parque+del+Plata,+Canelones,+Uruguay&output=embed"/></div></div><QuoteForm key={selectedModel} selectedModel={selectedModel} setSelectedModel={setSelectedModel}/></div></section>
    </main>
    <footer className="footer"><div className="wrap footer__in"><p className="logo logo--footer"><img src="/logo-blanco.png" alt="Tu Casa Ideal"/></p><ul className="social" aria-label="Redes sociales"><li><a href="https://www.instagram.com/tucasaidealuy/" target="_blank" rel="noreferrer" aria-label="Instagram"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg></a></li><li><a href="https://www.facebook.com/Tu-Casa-Ideal-938452556226334/" target="_blank" rel="noreferrer" aria-label="Facebook"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z"/></svg></a></li><li><a href="https://www.youtube.com/channel/UCGkd9MNX238Q8gKT4ESRuYQ" target="_blank" rel="noreferrer" aria-label="YouTube"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg></a></li></ul></div><div className="wrap footer__meta"><p>Camino Perseverano 5959 · <a href="tel:+59892501142">092 501 142</a> · <a href="mailto:ventas@tucasaideal.com.uy">ventas@tucasaideal.com.uy</a></p><a href="#proyectos">Soluciones para empresas</a></div></footer>
    <a className="wa-float" href={wa('Hola! Quiero info sobre las casas.')} target="_blank" rel="noreferrer" aria-label="Escribinos por WhatsApp"><WhatsAppIcon /></a>
    <VideoModal video={video} onClose={() => setVideo(null)}/><Gallery gallery={gallery} onClose={() => setGallery(null)}/>
  </>;
}
