/** Reads CSV text (quoted fields, doubled quotes, commas and line breaks inside quotes) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export const IMPORT_COLUMNS = ['title', 'description', 'type', 'bhk', 'bathrooms', 'price_inr', 'area_sqft', 'city', 'locality', 'project', 'status', 'possession', 'floor', 'total_floors', 'facing', 'furnishing', 'listed_by', 'amenities'] as const;
export const IMPORT_SAMPLE = [
  IMPORT_COLUMNS.join(','),
  '"3 BHK Flat in Sector 57, Gurgaon","East-facing 3 BHK on a high floor, close to the metro.",APARTMENT,3,3,17500000,1650,Gurgaon,Sector 57,,READY_TO_MOVE,,9,14,East,Semi-furnished,OWNER,"Gym; Power backup; Covered parking"',
  '"2 BHK Flat in Whitefield, Bengaluru","New 2 BHK near ITPL.",APARTMENT,2,2,9800000,1120,Bengaluru,Whitefield,,UNDER_CONSTRUCTION,2027-12,4,18,North,,BUILDER,"Clubhouse; Swimming pool"',
].join('\n') + '\n';
