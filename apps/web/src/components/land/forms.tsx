'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { PhotoPicker, uploadPhotos } from './photos';
import { closeLand, postLand, postWanted, replyLand, type LandState } from '@/app/(site)/land/actions';
import { KIND_ICON, PURPOSE_ICON } from './cards';

export interface LandOptions {
  states: { slug: string; name: string }[]; kinds: { code: string; label: string }[]; purposes: { code: string; label: string }[];
  units: { code: string; label: string; local: boolean }[]; landUses: string[]; features: { code: string; label: string }[];
  photo?: { minLong: number; minShort: number; maxShape: number; max: number; tips: string[] };
}
const KIND_HINT: Record<string, string> = { FARM: 'Agricultural land, orchards, farmhouses', PLOT: 'Residential or commercial plots', INDUSTRIAL: 'Land for warehouses and factories', BUILT: 'Ready warehouse, shed or shop' };
const USE: Record<string, string> = { AGRICULTURAL: 'Agricultural', RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', INDUSTRIAL: 'Industrial' };
const BUILT_ONLY = ['GROUND_FLOOR', 'PARKING'];

function Choice({ name, value, set, options, legend }: { name: string; value: string; set: (v: string) => void; legend: string; options: { code: string; label: string; icon?: string; hint?: string }[] }) {
  return (
    <fieldset className={`land-choice ${options.some((o) => o.hint) ? 'big' : ''}`}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.code} className={value === o.code ? 'on' : ''}>
          <input type="radio" name={name} value={o.code} checked={value === o.code} onChange={() => set(o.code)} required />
          {o.icon && <span aria-hidden="true">{o.icon}</span>}<b>{o.label}</b>{o.hint && <small>{o.hint}</small>}
        </label>
      ))}
    </fieldset>
  );
}
function Place({ o }: { o: LandOptions }) {
  return (
    <label className="afield"><span>State</span>
      <select name="state" required defaultValue=""><option value="" disabled>Choose a state</option>{o.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
    </label>
  );
}
function Size({ o, name, label, unit, setUnit }: { o: LandOptions; name: string; label: string; unit: string; setUnit: (u: string) => void }) {
  const local = o.units.find((u) => u.code === unit)?.local;
  return (
    <div className="afield"><span>{label}</span>
      <div className="land-size">
        <input name={name} type="number" inputMode="decimal" step="any" min="0.01" required placeholder="e.g. 2" aria-label={label} />
        <select name="areaUnit" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">{o.units.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}</select>
      </div>
      {local && <small>A {unit} is a different size in different places, so we will show it exactly as you write it.</small>}
    </div>
  );
}
function Contact({ who }: { who: string }) {
  return (
    <>
      <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="afield"><span>Mobile number</span><input name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" placeholder="10-digit mobile" /><small>Never shown on the site. Our team calls you when {who}.</small></label>
      <label className="afield wide"><span>Email <em>(optional)</em></span><input name="email" type="email" autoComplete="email" /></label>
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </>
  );
}

export function PostLandForm({ o }: { o: LandOptions }) {
  const [state, run, pending] = useActionState<LandState, FormData>(postLand, {});
  const [kind, setKind] = useState('FARM');
  const [deal, setDeal] = useState('SALE');
  const [unit, setUnit] = useState('acre');
  const pickKind = (k: string) => { setKind(k); if (k === 'BUILT') { setUnit('sqft'); setDeal('LEASE'); } else if (unit === 'sqft') setUnit('acre'); };
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState('');
  // The listing is made first; its photos follow one at a time with the key that came back, then the private page opens.
  useEffect(() => {
    if (!state.token) return;
    const token = state.token;
    void (async () => {
      const failed = files.length ? await uploadPhotos(token, files, (n) => setSending(`Sending photo ${n} of ${files.length}…`)) : [];
      // The reasons travel to the next page in this tab's own storage, so the poster reads why and can fix it there.
      try { if (failed.length) window.sessionStorage.setItem('land-photo-refused', JSON.stringify(failed)); } catch { /* the count alone is shown */ }
      router.push(`/land/manage?token=${encodeURIComponent(token)}&new=1${failed.length ? `&missed=${failed.length}` : ''}`);
    })();
  }, [state.token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (state.done) return <p className="astatus" role="status">Thank you. Our team will look at it.</p>;
  if (state.token) return <p className="astatus" role="status">{sending || 'Saved. Opening your listing…'}</p>;
  return (
    <form action={run} className="land-form">
      <Choice name="kind" legend="What are you listing?" value={kind} set={pickKind} options={o.kinds.map((k) => ({ ...k, icon: KIND_ICON[k.code], hint: KIND_HINT[k.code] }))} />
      <Choice name="deal" legend="You want to" value={deal} set={setDeal} options={[{ code: 'SALE', label: 'Sell it' }, { code: 'LEASE', label: 'Rent it out' }]} />
      <div className="land-fields">
        <h2>Where is it?</h2>
        <Place o={o} />
        <label className="afield"><span>District</span><input name="district" required maxLength={60} placeholder="e.g. Alwar" /></label>
        <label className="afield wide"><span>Town or village</span><input name="place" required maxLength={80} placeholder="e.g. Tijara" /></label>

        <h2>Size and price</h2>
        <Size o={o} name="areaValue" label={kind === 'BUILT' ? 'Covered area' : 'Size of the land'} unit={unit} setUnit={setUnit} />
        <label className="afield"><span>{deal === 'LEASE' ? 'Rent per month, in rupees' : 'Asking price, in rupees'} <em>(optional)</em></span><input name="priceInr" type="number" inputMode="numeric" min="1000" placeholder={deal === 'LEASE' ? 'e.g. 150000' : 'e.g. 4500000'} /><small>The total, not per {unit}. Leave empty to show “Price on request”.</small></label>

        <h2>Road and use</h2>
        <label className="afield"><span>Width of the road in front, in feet <em>(optional)</em></span><input name="roadFt" type="number" inputMode="numeric" min="1" max="500" /></label>
        <label className="afield"><span>Nearest highway or main road <em>(optional)</em></span><input name="highway" maxLength={60} placeholder="e.g. NH-48" /></label>
        <label className="afield"><span>How far is it, in km <em>(optional)</em></span><input name="highwayKm" type="number" inputMode="decimal" step="any" min="0" max="500" /></label>
        {kind !== 'BUILT' && (
          <label className="afield"><span>Land use in the records <em>(optional)</em></span>
            <select name="landUse" defaultValue=""><option value="">Not sure</option>{o.landUses.map((u) => <option key={u} value={u}>{USE[u]}</option>)}</select>
          </label>
        )}
        {kind === 'BUILT' && <label className="afield"><span>Clear height, in feet <em>(optional)</em></span><input name="clearHeightFt" type="number" inputMode="numeric" min="6" max="200" /></label>}
        {(kind === 'BUILT' || kind === 'INDUSTRIAL') && <label className="afield"><span>Power load, in kVA <em>(optional)</em></span><input name="powerKva" type="number" inputMode="numeric" min="1" /></label>}
        {kind === 'BUILT' && <label className="afield"><span>Loading docks <em>(optional)</em></span><input name="docks" type="number" inputMode="numeric" min="0" max="200" /></label>}
        <fieldset className="land-ticks wide"><legend>Tick what is true</legend>
          {o.features.filter((f) => kind === 'BUILT' || !BUILT_ONLY.includes(f.code)).map((f) => <label key={f.code}><input type="checkbox" name="features" value={f.code} /> {f.label}</label>)}
        </fieldset>
        <label className="afield wide"><span>Anything else a buyer should know <em>(optional)</em></span><textarea name="description" rows={3} maxLength={1000} placeholder="e.g. Two sides open, canal on the east, 4 km from the mandi" /></label>

        <h2>Photos <em className="land-opt">(optional, up to 8)</em></h2>
        <PhotoPicker files={files} set={setFiles} max={o.photo?.max ?? 8} rules={o.photo} />

        <h2>About you</h2>
        <label className="afield wide"><span>You are</span><select name="posterIs" defaultValue="OWNER"><option value="OWNER">The owner, or family of the owner</option><option value="DEALER">A dealer or agent</option><option value="COMPANY">A company</option></select></label>
        <Contact who="a buyer asks about it" />
        <label className="land-consent wide"><input type="checkbox" name="consent" required /> <span>I own this or have the owner’s permission to offer it, and what I have written is true.</span></label>
        {state.error && <p role="alert" className="aerror wide">{state.error}</p>}
        <button type="submit" className="abtn wide land-submit" disabled={pending}>{pending ? 'Sending…' : 'Send for checking'}</button>
        <p className="calc-note">Free. Our team checks each listing before it shows. Your number is never published.</p>
      </div>
    </form>
  );
}

export function PostWantedForm({ o }: { o: LandOptions }) {
  const [state, run, pending] = useActionState<LandState, FormData>(postWanted, {});
  const [purpose, setPurpose] = useState('WAREHOUSE');
  const [kind, setKind] = useState('INDUSTRIAL');
  const [deal, setDeal] = useState('SALE');
  const [unit, setUnit] = useState('acre');
  const pickPurpose = (p: string) => {
    setPurpose(p);
    if (p === 'DARK_STORE' || p === 'RETAIL') { setKind('BUILT'); setDeal('LEASE'); setUnit('sqft'); }
    else if (p === 'FARMING') { setKind('FARM'); setUnit('acre'); } else if (p === 'HOUSING') { setKind('PLOT'); setUnit('sqyd'); } else { setKind('INDUSTRIAL'); setUnit('acre'); }
  };
  const router = useRouter();
  useEffect(() => { if (state.token) router.push(`/land/manage?token=${encodeURIComponent(state.token)}&new=1`); }, [state.token, router]);
  if (state.token) return <p className="astatus" role="status">Saved. Opening your requirement…</p>;
  if (state.done) return <p className="astatus" role="status">Thank you. Our team will look at it.</p>;
  return (
    <form action={run} className="land-form">
      <Choice name="purpose" legend="What is it for?" value={purpose} set={pickPurpose} options={o.purposes.map((p) => ({ ...p, icon: PURPOSE_ICON[p.code] }))} />
      <Choice name="kind" legend="What do you need?" value={kind} set={setKind} options={o.kinds.map((k) => ({ ...k, icon: KIND_ICON[k.code] }))} />
      <Choice name="deal" legend="You want to" value={deal} set={setDeal} options={[{ code: 'SALE', label: 'Buy' }, { code: 'LEASE', label: 'Take on rent' }]} />
      <div className="land-fields">
        <h2>Where and how much</h2>
        <Place o={o} />
        <label className="afield"><span>Districts or towns <em>(optional)</em></span><input name="where" maxLength={160} placeholder="e.g. Alwar, Bhiwadi, along NH-48" /></label>
        <Size o={o} name="areaMin" label="Smallest size that works" unit={unit} setUnit={setUnit} />
        <label className="afield"><span>Largest size <em>(optional)</em></span><input name="areaMax" type="number" inputMode="decimal" step="any" min="0.01" /></label>
        <label className="afield wide"><span>{deal === 'LEASE' ? 'Rent budget per month, in rupees' : 'Budget, in rupees'} <em>(optional)</em></span><input name="budgetInr" type="number" inputMode="numeric" min="1000" /></label>
        <label className="afield wide"><span>What it must have <em>(optional)</em></span><textarea name="details" rows={3} maxLength={1000} placeholder="e.g. 40 ft road for trailers, within 5 km of the highway, converted land preferred" /></label>

        <h2>About you</h2>
        <label className="afield"><span>Company <em>(optional)</em></span><input name="company" maxLength={100} autoComplete="organization" /></label>
        <label className="land-consent"><input type="checkbox" name="showCompany" /> <span>Show the company name on the site. Unticked, owners see only “A company”.</span></label>
        <Contact who="an owner answers" />
        <label className="land-consent wide"><input type="checkbox" name="consent" required /> <span>This is a real requirement and I can be called about it.</span></label>
        {state.error && <p role="alert" className="aerror wide">{state.error}</p>}
        <button type="submit" className="abtn wide land-submit" disabled={pending}>{pending ? 'Sending…' : 'Send for checking'}</button>
        <p className="calc-note">Free. Our team checks each requirement before it shows. Your number is never published.</p>
      </div>
    </form>
  );
}

/** One button that opens a short form: a buyer asking about a listing, or an owner answering a requirement. */
export function ReplyButton({ type, slug, label, sent }: { type: 'listing' | 'wanted'; slug: string; label: string; sent: string }) {
  const [state, run, pending] = useActionState<LandState, FormData>(replyLand.bind(null, type, slug), {});
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  return (
    <>
      <button type="button" className="abtn land-reply-btn" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <dialog ref={dialog} className="connect-dialog" aria-label={label} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <div className="land-reply">
            <button type="button" className="land-x" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
            {state.done ? <><h2>Sent</h2><p role="status">{sent}</p><button type="button" className="abtn" onClick={() => dialog.current?.close()}>Done</button></> : (
              <form action={run}>
                <h2>{label}</h2>
                <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" autoFocus /></label>
                <label className="afield"><span>Mobile number</span><input name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" /></label>
                <label className="afield"><span>{type === 'wanted' ? 'What you have: where, how big, what price' : 'Message'} <em>{type === 'wanted' ? '' : '(optional)'}</em></span><textarea name="message" rows={3} maxLength={600} required={type === 'wanted'} /></label>
                <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                <label className="land-consent"><input type="checkbox" name="consent" required /> <span>Our team may call me about this.</span></label>
                {state.error && <p role="alert" className="aerror">{state.error}</p>}
                <button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

export function CloseButton({ token, what }: { token: string; what: string }) {
  const [state, run, pending] = useActionState<LandState, FormData>(closeLand.bind(null, token), {});
  if (state.done) return <p className="astatus" role="status">Done. It no longer shows as open.</p>;
  return (
    <form action={run} onSubmit={(e) => { if (!window.confirm(`Mark this ${what} as closed? It will stop showing as open.`)) e.preventDefault(); }}>
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <button type="submit" className="abtn danger" disabled={pending}>{pending ? 'Saving…' : what === 'listing' ? 'It is sold or let: take it down' : 'I have found it: close this'}</button>
    </form>
  );
}
