type Base = { label: string; name: string; hint?: string; required?: boolean };

export function Field({ label, name, hint, required = true, type = 'text', defaultValue, ...rest }: Base & { type?: string; defaultValue?: string | number | null } & Pick<React.InputHTMLAttributes<HTMLInputElement>, 'min' | 'max' | 'step' | 'maxLength' | 'autoComplete'>) {
  return (
    <label className="afield">
      <span>{label}{!required && <em> (optional)</em>}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ''} {...rest} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Area({ label, name, hint, required = true, defaultValue, rows = 4 }: Base & { defaultValue?: string | null; rows?: number }) {
  return (
    <label className="afield wide">
      <span>{label}{!required && <em> (optional)</em>}</span>
      <textarea name={name} required={required} defaultValue={defaultValue ?? ''} rows={rows} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export interface Option { value: string; label: string }
export function Select({ label, name, hint, required = true, defaultValue, options, groups }: Base & { defaultValue?: string | null; options?: Option[]; groups?: { label: string; options: Option[] }[] }) {
  return (
    <label className="afield">
      <span>{label}{!required && <em> (optional)</em>}</span>
      <select name={name} required={required} defaultValue={defaultValue ?? ''}>
        <option value="">{required ? 'Choose…' : 'None'}</option>
        {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        {groups?.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const STATUS: Option[] = [{ value: 'READY_TO_MOVE', label: 'Ready to move' }, { value: 'UNDER_CONSTRUCTION', label: 'Under construction' }];
export const month = (iso: string | null | undefined) => (iso ? iso.slice(0, 7) : '');

export interface Options { cities: { id: string; name: string; localities: { id: string; name: string; projects: { id: string; name: string }[] }[] }[] }
export const localityGroups = (o: Options) => o.cities.map((c) => ({ label: c.name, options: c.localities.map((l) => ({ value: l.id, label: l.name })) }));
export const projectGroups = (o: Options) => o.cities.flatMap((c) => c.localities.filter((l) => l.projects.length).map((l) => ({ label: `${l.name}, ${c.name}`, options: l.projects.map((p) => ({ value: p.id, label: p.name })) })));

export function Notice({ params }: { params: { saved?: string; deleted?: string } }) {
  if (!params.saved && !params.deleted) return null;
  return <p role="status" className="anotice">{params.saved ? 'Saved. The public pages are updated.' : 'Deleted.'}</p>;
}
