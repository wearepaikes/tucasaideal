import { useEffect, useState } from 'react';

const initialForm = { name: '', area: '', bedrooms: '', bathrooms: '', status: 'ENTREGADA', location: '', youtubeId: '' };

async function request(apiUrl, path, options) {
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${apiUrl}/admin${path}`, { credentials: 'include', ...options, headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No pudimos completar la operación.');
  return data;
}

function imageSrc(value) {
  if (!value) return '/admin-login.webp';
  if (/^(https?:)?\//.test(value)) return value;
  return `/obras/${value.replace(/\.(jpg|jpeg|png|webp)$/i, '')}.jpg`;
}

function Field({ label, children }) { return <label><span>{label}</span>{children}</label>; }
function Toggle({ active, onClick }) { return <button type="button" className={`switch${active ? ' is-on' : ''}`} onClick={onClick} aria-label={active ? 'Ocultar casa' : 'Mostrar casa'}><span/></button>; }

export default function HousesManager({ apiUrl }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [coverChoice, setCoverChoice] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [countProfile, setCountProfile] = useState({ houseCountMode: 'AUTOMATIC', manualHouseCount: 0, publishedHouses: 0, houseCount: 0 });
  const [countSaved, setCountSaved] = useState(false);

  const load = () => request(apiUrl, '/works').then(setItems);
  const loadCount = () => request(apiUrl, '/business-profile').then(setCountProfile);
  useEffect(() => { load(); loadCount(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearPreviews = () => previews.forEach((url) => URL.revokeObjectURL(url));
  const close = () => { clearPreviews(); setOpen(false); setEditing(null); setForm(initialForm); setExistingPhotos([]); setFiles([]); setPreviews([]); setCoverChoice(null); setError(''); };
  const create = () => { close(); setOpen(true); };
  const edit = (item) => {
    clearPreviews();
    const photos = Array.isArray(item.photos) ? item.photos : [item.photo].filter(Boolean);
    setEditing(item);
    setForm({ name: item.name || '', area: item.area || item.model || '', bedrooms: item.bedrooms ?? '', bathrooms: item.bathrooms ?? '', status: item.status, location: item.location, youtubeId: item.youtubeId ? `https://www.youtube.com/watch?v=${item.youtubeId}` : '' });
    setExistingPhotos(photos); setFiles([]); setPreviews([]);
    setCoverChoice({ type: 'existing', value: photos.includes(item.photo) ? item.photo : photos[0] });
    setError(''); setOpen(true);
  };
  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []); setError('');
    if (existingPhotos.length + files.length + selected.length > 10) { setError('Podés tener como máximo 10 imágenes por casa.'); event.target.value = ''; return; }
    const invalid = selected.find((file) => file.size > 12 * 1024 * 1024 || !/^image\/(jpeg|png|webp|avif)$/.test(file.type));
    if (invalid) { setError(`${invalid.name}: usá JPG, PNG, WebP o AVIF de hasta 12 MB.`); event.target.value = ''; return; }
    const urls = selected.map((file) => URL.createObjectURL(file));
    setFiles((current) => [...current, ...selected]); setPreviews((current) => [...current, ...urls]);
    if (!coverChoice && urls.length) setCoverChoice({ type: 'new', value: urls[0] });
    event.target.value = '';
  };
  const removeExisting = (photo) => {
    const remaining = existingPhotos.filter((item) => item !== photo); setExistingPhotos(remaining);
    if (coverChoice?.type === 'existing' && coverChoice.value === photo) setCoverChoice(remaining.length ? { type: 'existing', value: remaining[0] } : previews.length ? { type: 'new', value: previews[0] } : null);
  };
  const removeNew = (index) => {
    const removed = previews[index]; const remaining = previews.filter((_, position) => position !== index); URL.revokeObjectURL(removed);
    setFiles(files.filter((_, position) => position !== index)); setPreviews(remaining);
    if (coverChoice?.type === 'new' && coverChoice.value === removed) setCoverChoice(existingPhotos.length ? { type: 'existing', value: existingPhotos[0] } : remaining.length ? { type: 'new', value: remaining[0] } : null);
  };
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (!existingPhotos.length && !files.length) return setError('Subí al menos una imagen de la casa.');
    if (!coverChoice) return setError('Seleccioná la imagen de portada.');
    setSaving(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));
    body.append('coverSelection', coverChoice.type === 'existing' ? coverChoice.value : `new:${previews.indexOf(coverChoice.value)}`);
    if (editing) body.append('existingPhotos', JSON.stringify(existingPhotos));
    files.forEach((file) => body.append('images', file));
    try { await request(apiUrl, editing ? `/works/${editing.id}` : '/works', { method: editing ? 'PATCH' : 'POST', body }); close(); await Promise.all([load(), loadCount()]); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const toggle = async (item) => { await request(apiUrl, `/works/${item.id}/active`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }); await Promise.all([load(), loadCount()]); };
  const removeHouse = async () => {
    if (!editing || !window.confirm(`¿Eliminar definitivamente “${editing.name || `Casa ${editing.model} m²`}” y todas sus imágenes?`)) return;
    setSaving(true);
    try { await request(apiUrl, `/works/${editing.id}`, { method: 'DELETE' }); close(); await Promise.all([load(), loadCount()]); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const saveCount = async (event) => {
    event.preventDefault();
    const updated = await request(apiUrl, '/house-count-profile', { method: 'PATCH', body: JSON.stringify({ mode: countProfile.houseCountMode, manualCount: Number(countProfile.manualHouseCount) }) });
    setCountProfile(updated); setCountSaved(true); setTimeout(() => setCountSaved(false), 2200);
  };

  return <>
    <header className="portal-title portal-title--section"><div><p className="eyebrow">Obras reales</p><h1>{open ? (editing ? 'Editar casa' : 'Nueva casa') : 'Casas entregadas y en terminación'}</h1><p>{open ? 'Administrá sus datos, imágenes y portada desde un solo lugar.' : 'Las casas visibles aparecen automáticamente en la landing.'}</p></div><button className="btn btn--primary" onClick={open ? close : create}>{open ? 'Cerrar formulario' : '+ Agregar nuevo'}</button></header>
    {open ? <form className="project-editor house-editor" onSubmit={submit}>
      <div className="house-editor__intro"><span>Galería de obra</span><strong>{editing ? 'Actualizá una casa publicada' : 'Publicá una nueva casa'}</strong><p>Cuando guardes, la landing se actualizará en vivo.</p></div>
      <div className="house-editor__fields"><Field label="Nombre de la casa"><input required maxLength="120" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})}/></Field><Field label="Modelo / metraje"><select required value={form.area} onChange={(e) => setForm({...form,area:e.target.value})}><option value="" disabled>Seleccionar metraje</option><option value="18">18 m²</option><option value="30">30 m²</option><option value="42">42 m²</option><option value="52">52 m²</option></select></Field><Field label="Habitaciones"><input required type="number" min="0" max="30" value={form.bedrooms} onChange={(e) => setForm({...form,bedrooms:e.target.value})}/></Field><Field label="Baños"><input required type="number" min="0" max="30" value={form.bathrooms} onChange={(e) => setForm({...form,bathrooms:e.target.value})}/></Field><Field label="Estado"><select value={form.status} onChange={(e) => setForm({...form,status:e.target.value})}><option value="EN_TERMINACION">En terminación</option><option value="ENTREGADA">Entregada</option></select></Field><Field label="Ubicación"><input required maxLength="120" value={form.location} onChange={(e) => setForm({...form,location:e.target.value})}/></Field><Field label="Enlace de YouTube (opcional)"><input type="url" maxLength="255" placeholder="https://www.youtube.com/watch?v=..." value={form.youtubeId} onChange={(e) => setForm({...form,youtubeId:e.target.value})}/></Field></div>
      <div className="project-upload"><div><p className="eyebrow">Fotos de la casa</p><h2>{existingPhotos.length + files.length} de 10 imágenes</h2><p>Hasta 12 MB por imagen. Se convierten automáticamente a WebP y se guardan en R2.</p></div><label className={`project-drop${existingPhotos.length + files.length >= 10 ? ' is-disabled' : ''}`}><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={existingPhotos.length + files.length >= 10} onChange={chooseFiles}/><strong>＋ Seleccionar imágenes</strong><span>Podés elegir varias a la vez</span></label></div>
      <div className="project-photo-grid">{existingPhotos.map((photo, index) => { const isCover = coverChoice?.type === 'existing' && coverChoice.value === photo; return <figure className={isCover ? 'is-cover' : ''} key={photo}><img src={imageSrc(photo)} alt={`Foto ${index + 1} de ${form.name}`}/><button className="photo-remove" type="button" onClick={() => removeExisting(photo)} aria-label="Eliminar imagen">×</button><button className="photo-cover" type="button" onClick={() => setCoverChoice({ type: 'existing', value: photo })}>{isCover ? '✓ Portada' : 'Usar portada'}</button></figure>; })}{previews.map((photo, index) => { const isCover = coverChoice?.type === 'new' && coverChoice.value === photo; return <figure className={`is-new${isCover ? ' is-cover' : ''}`} key={photo}><img src={photo} alt={`Nueva foto ${index + 1}`}/><button className="photo-remove" type="button" onClick={() => removeNew(index)} aria-label="Quitar imagen nueva">×</button><button className="photo-cover" type="button" onClick={() => setCoverChoice({ type: 'new', value: photo })}>{isCover ? '✓ Portada' : 'Usar portada'}</button></figure>; })}</div>
      {error && <p className="quote__err" role="alert">{error}</p>}<footer className="project-editor__actions">{editing && <button type="button" className="btn project-delete" onClick={removeHouse} disabled={saving}>Eliminar casa</button>}<button className="btn btn--primary" disabled={saving}>{saving ? 'Procesando imágenes…' : editing ? 'Guardar cambios' : 'Crear y publicar'}</button></footer>
    </form> : <>
      <form className="house-count-card" onSubmit={saveCount}><div className="house-count-card__number"><span>{countProfile.houseCount}</span><small>casas en el banner</small></div><div className="house-count-card__copy"><p className="eyebrow">Dato público</p><h2>¿El número es igual a las casas publicadas?</h2><p>Actualmente hay <strong>{countProfile.publishedHouses}</strong> casas visibles en la web.</p></div><div className="house-count-options"><label className={countProfile.houseCountMode === 'AUTOMATIC' ? 'is-selected' : ''}><input type="radio" name="houseCountMode" checked={countProfile.houseCountMode === 'AUTOMATIC'} onChange={() => setCountProfile({...countProfile,houseCountMode:'AUTOMATIC',houseCount:countProfile.publishedHouses})}/><strong>Sí, usar publicadas</strong><small>Se actualizará automáticamente</small></label><label className={countProfile.houseCountMode === 'MANUAL' ? 'is-selected' : ''}><input type="radio" name="houseCountMode" checked={countProfile.houseCountMode === 'MANUAL'} onChange={() => setCountProfile({...countProfile,houseCountMode:'MANUAL',houseCount:Number(countProfile.manualHouseCount)})}/><strong>No, usar otro número</strong><small>Indicá el total histórico</small></label></div>{countProfile.houseCountMode === 'MANUAL' && <label className="house-count-input"><span>¿Cuántas casas llevan realizadas?</span><input required type="number" min="0" max="1000000" value={countProfile.manualHouseCount} onChange={(e) => setCountProfile({...countProfile,manualHouseCount:e.target.value,houseCount:Number(e.target.value)})}/></label>}<button className="btn btn--accent">{countSaved ? '✓ Guardado y actualizado' : 'Guardar número del banner'}</button></form>
      <div className="content-grid">{items.map((item) => <article className={`content-card${item.active ? '' : ' is-off'}`} key={item.id}><button className="content-cover" onClick={() => edit(item)}><img src={imageSrc(item.photo)} alt=""/><span>{item.status === 'ENTREGADA' ? 'Entregada' : 'En terminación'}</span></button><div><p className="eyebrow">{item.area || item.model} m² · {item.location}</p><h3>{item.name || `Casa ${item.model} m²`}</h3><button className="content-edit" onClick={() => edit(item)}>Editar datos e imágenes</button><footer><small>{Array.isArray(item.photos) ? item.photos.length : 1} imágenes</small><Toggle active={item.active} onClick={() => toggle(item)}/></footer></div></article>)}</div>
    </>}
  </>;
}
