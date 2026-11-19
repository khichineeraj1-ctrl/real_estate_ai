import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCities, type CitySummary } from '../../lib/api';
import { LOAN_DEFAULTS, loanPlan } from '../../lib/finance';
import { num, price as short } from '../../lib/format';
import { TYPICAL_LOADING_PCT, blankQuote, delayCost, quoteBill, type Quote } from '../../lib/quote';
import { useTheme, type Theme } from '../../lib/theme';
import { Slider } from './Calculators';

const rupees = (n: number) => `₹${num(Math.round(n))}`;
const toNum = (v: string) => { const n = Number(v.replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
const LETTERS = ['A', 'B', 'C'];

function Field({ t, label, value, onChange, unit, front }: { t: Theme; label: string; value: number; onChange: (n: number) => void; unit: string; front?: boolean }) {
  return (
    <View style={{ gap: 3, flexGrow: 1, flexBasis: '46%' }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <View style={[s.input, { borderColor: t.line, backgroundColor: t.card }]}>
        {front ? <Text style={{ color: t.muted }}>{unit}</Text> : null}
        <TextInput value={value ? (front ? num(value) : String(value)) : ''} placeholder={front ? '0' : 'Not given'} placeholderTextColor={t.muted} keyboardType="number-pad" accessibilityLabel={label} onChangeText={(v) => onChange(toNum(v))} style={{ flex: 1, color: t.fg, fontSize: 15, fontWeight: '600', paddingVertical: 8 }} />
        {front ? null : <Text style={{ color: t.muted, fontSize: 12 }}>{unit}</Text>}
      </View>
    </View>
  );
}
const Chip = ({ t, on, label, onPress }: { t: Theme; on: boolean; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }]}><Text style={{ color: on ? t.brandInk : t.fg, fontSize: 13, fontWeight: on ? '700' : '400' }}>{label}</Text></Pressable>
);

/** One to three builder quotes on the same footing: the price per usable sq ft with every charge in, and the whole bill. */
export function QuoteCompare() {
  const t = useTheme();
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [citySlug, setCitySlug] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([blankQuote('Quote A')]);
  useEffect(() => { getCities().then((c) => { const usable = c.filter((x) => x.costs); setCities(usable); setCitySlug(usable[0]?.slug ?? ''); }).catch(() => {}); }, []);
  const costs = cities.find((c) => c.slug === citySlug)?.costs ?? null;
  const bills = quotes.map((q) => quoteBill(q, costs));
  const set = (i: number, patch: Partial<Quote>) => setQuotes((now) => now.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const best = (values: number[]) => { const real = values.filter((v) => v > 0); if (real.length < 2 || real.every((v) => v === real[0])) return -1; return values.indexOf(Math.min(...real)); };
  const bestCarpet = best(bills.map((b) => b.perCarpetAllIn)); const bestQuoted = best(bills.map((b) => b.perSuperQuoted));
  const flipped = bestQuoted >= 0 && bestCarpet >= 0 && bestQuoted !== bestCarpet;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>Type in a builder’s quote. See the price per sq ft you can actually use, and the whole bill.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {cities.map((c) => <Chip key={c.slug} t={t} on={c.slug === citySlug} label={c.name} onPress={() => setCitySlug(c.slug)} />)}
      </ScrollView>
      {quotes.length > 1 && bestCarpet >= 0 ? (
        <View style={[s.verdict, { backgroundColor: flipped ? (t.bg === '#ffffff' ? '#fff4e5' : '#2b2110') : t.readyBg, borderColor: flipped ? '#b54708' : t.ready }]} accessibilityLiveRegion="polite">
          <Text style={{ color: t.fg, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>{flipped ? `${quotes[bestQuoted].name} looks cheaper, but ${quotes[bestCarpet].name} is. ` : `${quotes[bestCarpet].name} is the better price. `}</Text>
            {flipped ? `Per usable sq ft with every charge in, ${quotes[bestCarpet].name} costs ${rupees(bills[bestCarpet].perCarpetAllIn)} against ${rupees(bills[bestQuoted].perCarpetAllIn)}.` : `It costs ${rupees(bills[bestCarpet].perCarpetAllIn)} per usable sq ft with every charge in.`}</Text>
        </View>
      ) : null}
      {quotes.map((q, i) => {
        const b = bills[i]; const isBest = i === bestCarpet;
        const parts = [{ k: 'Basic price', v: q.base, c: t.s1 }, { k: 'Extras', v: b.extras, c: t.s2 }, { k: 'Government charges', v: b.government, c: t.s3 }];
        return (
          <View key={i} style={[s.quote, { backgroundColor: t.card, borderColor: isBest ? t.ready : t.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput value={q.name} maxLength={30} accessibilityLabel="Name of this quote" onChangeText={(v) => set(i, { name: v })} style={{ flex: 1, color: t.fg, fontSize: 17, fontWeight: '700', padding: 0 }} />
              {quotes.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${q.name}`} hitSlop={8} onPress={() => setQuotes((now) => now.filter((_, j) => j !== i))}><Text style={{ color: t.muted, fontSize: 20 }}>×</Text></Pressable> : null}
            </View>
            <View style={[s.out, { backgroundColor: t.soft }]} accessibilityLiveRegion="polite">
              <Text style={{ color: t.muted, fontSize: 13 }}>You really pay</Text>
              <Text style={{ color: isBest ? t.ready : t.fg, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>{rupees(b.perCarpetAllIn)}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>per usable sq ft{isBest ? ' · lowest' : ''}</Text>
              <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19, marginTop: 4 }}>The quote says <Text style={{ color: t.fg, fontWeight: '700' }}>{rupees(b.perSuperQuoted)}</Text> a sq ft, on {num(q.superArea)} sq ft, of which about <Text style={{ color: t.fg, fontWeight: '700' }}>{num(b.carpet)}</Text> is yours to use{b.carpetEstimated ? ` (estimated at ${TYPICAL_LOADING_PCT}% loading; ask for the carpet area)` : ` (${b.loadingPct}% loading)`}.</Text>
              <View style={{ flexDirection: 'row', gap: 2, height: 10, marginTop: 6 }}>{parts.map((x) => (x.v > 0 ? <View key={x.k} style={{ flex: x.v, minWidth: 4, borderRadius: 4, backgroundColor: x.c }} /> : null))}</View>
              {parts.map((x) => <View key={x.k} style={s.part}><Text style={{ color: t.muted, flex: 1 }}><Text style={{ color: x.c }}>■ </Text>{x.k}</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{short(x.v)}</Text></View>)}
              <View style={[s.part, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.line, paddingTop: 6 }]}><Text style={{ color: t.fg, fontWeight: '700', flex: 1 }}>Whole bill</Text><Text style={{ color: t.fg, fontWeight: '800', fontSize: 16 }}>{short(b.total)}</Text></View>
            </View>
            <View style={s.fields}>
              <Field t={t} label="Basic price quoted" unit="₹" front value={q.base} onChange={(n) => set(i, { base: n })} />
              <Field t={t} label="Area quoted on (super)" unit="sq ft" value={q.superArea} onChange={(n) => set(i, { superArea: n })} />
              <Field t={t} label="Carpet area (if given)" unit="sq ft" value={q.carpetArea} onChange={(n) => set(i, { carpetArea: n })} />
              <Field t={t} label="Parking" unit="₹" front value={q.parking} onChange={(n) => set(i, { parking: n })} />
              <Field t={t} label="Club membership" unit="₹" front value={q.club} onChange={(n) => set(i, { club: n })} />
              <Field t={t} label="Location and floor (PLC)" unit="₹" front value={q.plc} onChange={(n) => set(i, { plc: n })} />
              <Field t={t} label="Maintenance deposit" unit="₹" front value={q.deposit} onChange={(n) => set(i, { deposit: n })} />
              <Field t={t} label="Anything else" unit="₹" front value={q.other} onChange={(n) => set(i, { other: n })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip t={t} on={q.underConstruction} label="Under construction" onPress={() => set(i, { underConstruction: true })} />
              <Chip t={t} on={!q.underConstruction} label="Ready to move" onPress={() => set(i, { underConstruction: false })} />
            </View>
          </View>
        );
      })}
      {quotes.length < 3 ? (
        <Pressable accessibilityRole="button" onPress={() => setQuotes((now) => [...now, { ...blankQuote(`Quote ${LETTERS[now.length]}`), base: now[now.length - 1].base, superArea: now[now.length - 1].superArea }])} style={[s.add, { borderColor: t.brand }]}>
          <Text style={{ color: t.brand, fontWeight: '700' }}>+ Add another quote to compare</Text>
        </Pressable>
      ) : null}
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>An estimate to put quotes on the same footing, not a quote. Where no carpet area is entered, {TYPICAL_LOADING_PCT}% of the quoted area is assumed to be walls and shared space; real loading runs from about 20% to 40%.</Text>
    </ScrollView>
  );
}

/** What a delay in possession costs a buyer who is renting, and what the builder would owe them for it. */
export function DelayCalculator() {
  const t = useTheme();
  const [months, setMonths] = useState(12);
  const [rent, setRent] = useState(35_000);
  const [paid, setPaid] = useState(5_000_000);
  const [pct, setPct] = useState(11);
  const [price, setPrice] = useState(10_000_000);
  const d = delayCost(months, rent, paid, pct);
  const emi = loanPlan(price, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years).monthly;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={[s.quote, { backgroundColor: t.soft, borderColor: t.line }]}>
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>IF POSSESSION IS LATE BY</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: t.fg, fontSize: 40, fontWeight: '800', letterSpacing: -1 }}>{months} month{months === 1 ? '' : 's'}</Text>
        <Slider t={t} label="Months of delay" value={months} min={0} max={36} step={1} onChange={setMonths} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[6, 12, 24, 36].map((m) => <Chip key={m} t={t} on={months === m} label={`${m} months`} onPress={() => setMonths(m)} />)}</View>
      </View>
      <View style={[s.quote, { backgroundColor: t.card, borderColor: t.line }]} accessibilityLiveRegion="polite">
        <Text style={{ color: t.muted, fontSize: 13 }}>Extra rent you pay while you wait</Text>
        <Text style={{ color: t.fg, fontSize: 36, fontWeight: '800', letterSpacing: -0.5 }}>{short(d.rent)}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>{rupees(rent)} for each month it runs late, out of your pocket</Text>
        <View style={s.part}><Text style={{ color: t.muted, flex: 1 }}>Interest the builder owes you, if you claim it</Text><Text style={{ color: t.ready, fontWeight: '600' }}>{rupees(d.interestOwed)}</Text></View>
        <View style={s.part}><Text style={{ color: t.muted, flex: 1 }}>{d.net > 0 ? 'Still yours to bear after that' : 'Left over after rent, if paid in full'}</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{rupees(Math.abs(d.net))}</Text></View>
        <View style={s.part}><Text style={{ color: t.muted, flex: 1 }}>Rent and EMI together, a month</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{rupees(rent + emi)}</Text></View>
      </View>
      <View style={s.fields}>
        <Field t={t} label="Rent you pay each month" unit="₹" front value={rent} onChange={setRent} />
        <Field t={t} label="Paid to the builder so far" unit="₹" front value={paid} onChange={setPaid} />
        <Field t={t} label="Price of the home (for EMI)" unit="₹" front value={price} onChange={setPrice} />
        <Field t={t} label="Delay interest in agreement" unit="% a year" value={pct} onChange={setPct} />
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>Under RERA a builder who misses the possession date owes the buyer interest for every month of delay on the money paid, commonly at the State Bank of India’s lending rate plus 2%. Getting it paid can take a complaint to the state authority. The EMI is an example loan: {LOAN_DEFAULTS.downPct}% down at {LOAN_DEFAULTS.ratePct}% over {LOAN_DEFAULTS.years} years. This is arithmetic, not legal advice.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  verdict: { borderWidth: 1, borderRadius: 14, padding: 12 },
  quote: { borderWidth: 1.5, borderRadius: 18, padding: 14, gap: 10 },
  out: { borderRadius: 14, padding: 12, gap: 2 },
  part: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  add: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
