import { AdminForm } from '@/components/admin/Form';
import { requireStaff } from '@/lib/admin';
import { importCsv } from '../../actions';

export const metadata = { title: 'Import listings' };

const COLUMNS: [string, string][] = [
  ['title, description', 'Text. The title is the page heading.'],
  ['type', 'APARTMENT, VILLA, BUILDER_FLOOR or PLOT'],
  ['bhk, bathrooms', 'Whole numbers. Leave empty for a plot.'],
  ['price_inr', 'Rupees as a plain number, e.g. 17500000 for ₹1.75 crore'],
  ['area_sqft', 'Whole number'],
  ['city, locality', 'Must match a city and locality that already exist here, by name'],
  ['project', 'Optional. Must match a project in that locality by name.'],
  ['status', 'READY_TO_MOVE or UNDER_CONSTRUCTION'],
  ['possession', 'Optional month such as 2027-12, for homes under construction'],
  ['floor, total_floors, facing, furnishing', 'Optional'],
  ['listed_by', 'OWNER, BUILDER or AGENT'],
  ['amenities', 'Optional, separated by semicolons'],
];

export default async function ImportPage() {
  await requireStaff();
  return (
    <>
      <h1>Import listings</h1>
      <p className="lead">Upload a CSV file of up to 500 listings. Every row is checked first: if any row has a mistake, nothing is imported and you get the list of rows to fix. Imported listings go live straight away.</p>
      <p><a href="/admin/import/sample">Download a sample file</a> with the right columns and two example rows.</p>
      <AdminForm action={importCsv} submit="Check and import" pendingLabel="Checking…">
        <label className="afield wide"><span>CSV file</span><input type="file" name="file" accept=".csv,text/csv" required /></label>
      </AdminForm>
      <section className="section">
        <h2>Columns</h2>
        <div className="atable"><table>
          <thead><tr><th>Column</th><th>What goes in it</th></tr></thead>
          <tbody>{COLUMNS.map(([c, d]) => <tr key={c}><td><code>{c}</code></td><td>{d}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
