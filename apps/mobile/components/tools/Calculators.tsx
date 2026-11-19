import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { LOAN_DEFAULTS, affordability, buyingCosts, loanPlan, type CityCosts } from '../../lib/finance';
import { num, price as short } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

const rupees = (n: number) => `₹${num(Math.round(n))}`;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/* ---------- Inputs: a slider to drag, the exact figure to type, and one-tap common values ---------- */

/** A slider drawn from plain views, so it needs nothing installed. Drag or tap along the track; screen readers get step up and step down. */
export function Slider({ t, label, value, min, max, step, onChange }: { t: Theme; label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  const [width, setWidth] = useState(0);
  const at = clamp((value - min) / (max - min), 0, 1);
  const snap = (n: number) => clamp(Number((Math.round(n / step) * step).toFixed(2)), min, max);
  const move = (e: GestureResponderEvent) => { if (width > 0) onChange(snap(min + clamp(e.nativeEvent.locationX / width, 0, 1) * (max - min))); };
  return (
    <View
      accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: clamp(value, min, max) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
      onResponderGrant={move} onResponderMove={move}
      style={s.slider}
    >
      <View pointerEvents="none" style={[s.track, { backgroundColor: t.line }]}><View style={{ width: `${at * 100}%`, height: '100%', borderRadius: 3, backgroundColor: t.brand }} /></View>
      <View pointerEvents="none" style={[s.thumb, { left: at * Math.max(width - 22, 0), backgroundColor: t.brand, borderColor: t.card }]} />
    </View>
  );
}

interface Preset { label: string; value: number }
interface SliderProps { t: Theme; label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; hint?: string; presets?: Preset[]; decimal?: boolean }

const chipStyle = (t: Theme, on: boolean) => [s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }];

/** The slider covers the usual range; the box beside the label takes any figure, including ones beyond the slider. */
export function SliderField({ t, label, value, onChange, min, max, step, hint, presets, decimal }: SliderProps) {
  // What was typed is kept as text so a half-typed "8." is not rewritten under the cursor; a change from the slider replaces it.
  const [text, setText] = useState(String(value));
  const shown = Number(text) === value ? text : String(value);
  return (
    <View style={{ gap: 6 }}>
      <View style={s.top}>
        <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14, flex: 1 }}>{label}</Text>
        <TextInput
          value={shown} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} accessibilityLabel={label} maxLength={12}
          onChangeText={(v) => { const clean = v.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, ''); setText(clean); const n = Number(clean); if (Number.isFinite(n)) onChange(n); }}
          style={[s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }]}
        />
      </View>
      <Slider t={t} label={`${label}, slider`} value={value} min={min} max={max} step={step} onChange={onChange} />
      {presets && (
        <View style={s.chips}>
          {presets.map((p) => (
            <Pressable key={p.value} accessibilityRole="button" accessibilityState={{ selected: value === p.value }} onPress={() => onChange(p.value)} style={chipStyle(t, value === p.value)}>
              <Text style={{ color: value === p.value ? t.brandInk : t.fg, fontSize: 13, fontWeight: value === p.value ? '600' : '400' }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export const PRICES: Preset[] = [{ label: '₹50 L', value: 5_000_000 }, { label: '₹1 Cr', value: 10_000_000 }, { label: '₹2 Cr', value: 20_000_000 }, { label: '₹5 Cr', value: 50_000_000 }];
const YEARS: Preset[] = [10, 15, 20, 25, 30].map((y) => ({ label: `${y}`, value: y }));
type Bind = { t: Theme; value: number; onChange: (n: number) => void };
export const PriceField = (p: Bind) => <SliderField {...p} label="Home price (₹)" min={1_000_000} max={50_000_000} step={100_000} presets={PRICES} hint={short(p.value)} />;
const RateField = (p: Bind) => <SliderField {...p} label="Interest rate (% a year)" min={6} max={14} step={0.05} decimal hint="An example rate. Use the rate your bank offers you." />;
const YearsField = (p: Bind) => <SliderField {...p} label="Loan period (years)" min={1} max={30} step={1} presets={YEARS} />;

/* ---------- One whole split into its parts: a bar to look at, and the same figures listed beneath it ---------- */

interface Part { name: string; value: number; slot: 's1' | 's2' | 's3' }

function Split({ t, title, parts, money = short }: { t: Theme; title: string; parts: Part[]; money?: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = parts.reduce((sum, p) => sum + Math.max(p.value, 0), 0);
  const share = (p: Part) => (total > 0 ? Math.max(p.value, 0) / total : 0);
  const pct = (p: Part) => { const x = share(p) * 100; return x > 0 && x < 1 ? '<1%' : `${Math.round(x)}%`; };
  const toggle = (i: number) => setActive((a) => (a === i ? null : i));
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{title}</Text>
      <View style={s.bar} accessible accessibilityRole="image" accessibilityLabel={`${title}: ${parts.map((p) => `${p.name} ${money(p.value)}, ${pct(p)}`).join('; ')}`}>
        {total > 0 ? parts.map((p, i) => p.value > 0 && (
          <Pressable key={p.name} onPress={() => toggle(i)} style={[s.seg, { flexGrow: p.value, backgroundColor: t[p.slot], opacity: active != null && active !== i ? 0.35 : 1 }]}>
            {share(p) >= 0.16 ? <Text style={s.segText}>{pct(p)}</Text> : null}
          </Pressable>
        )) : <View style={[s.seg, { flexGrow: 1, backgroundColor: t.line }]} />}
      </View>
      <View>
        {parts.map((p, i) => (
          <Pressable key={p.name} onPress={() => toggle(i)} style={[s.legend, active === i && { backgroundColor: t.soft }]}>
            <View style={[s.key, { backgroundColor: t[p.slot] }]} />
            <Text style={{ color: t.muted, flex: 1 }}>{p.name}</Text>
            <Text style={{ color: t.fg, fontWeight: '600' }}>{money(p.value)}</Text>
            <Text style={{ color: t.muted, width: 40, textAlign: 'right', fontSize: 13 }}>{pct(p)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Out({ t, label, value, sub, children }: { t: Theme; label: string; value: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={[s.out, { backgroundColor: t.bg, borderColor: t.line }]}>
      <View accessibilityLiveRegion="polite">
        <Text style={{ color: t.muted }}>{label}</Text>
        <Text style={{ color: t.fg, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 }}>{value}</Text>
        {sub ? <Text style={{ color: t.muted, fontSize: 13 }}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const Box = ({ t, children }: { t: Theme; children: React.ReactNode }) => <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>{children}</View>;
const Note = ({ t, children }: { t: Theme; children: React.ReactNode }) => <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{children}</Text>;

/* ---------- The calculators ---------- */

/** Home-loan instalment. With `price` given (the property screen) the price is fixed; otherwise the buyer sets it. */
export function EmiCalculator({ price }: { price?: number }) {
  const t = useTheme();
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [downPct, setDownPct] = useState(LOAN_DEFAULTS.downPct);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const span = clamp(years, 1, 30);
  const p = loanPlan(amount, downPct, rate, span);
  return (
    <Box t={t}>
      {price == null && <PriceField t={t} value={amount} onChange={setAmount} />}
      <SliderField t={t} label="Down payment (% of price)" value={downPct} onChange={(n) => setDownPct(Math.min(n, 100))} min={0} max={90} step={1} decimal hint={`${rupees(p.downPayment)} from your own money`} presets={[10, 20, 30, 40].map((v) => ({ label: `${v}%`, value: v }))} />
      <RateField t={t} value={rate} onChange={setRate} />
      <YearsField t={t} value={years} onChange={setYears} />
      <Out t={t} label="Monthly EMI" value={rupees(p.monthly)} sub={`for ${span} years on a loan of ${short(p.loan)}`}>
        <Split t={t} title={`Everything you pay over ${span} years`} parts={[{ name: 'Loan repaid', value: p.loan, slot: 's1' }, { name: 'Interest to the bank', value: p.interest, slot: 's2' }, { name: 'Down payment', value: p.downPayment, slot: 's3' }]} />
        <View style={[s.row, { borderColor: t.line }]}><Text style={{ color: t.muted }}>Total you repay the bank</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{short(p.totalPaid)}</Text></View>
      </Out>
    </Box>
  );
}

export function AffordabilityCalculator() {
  const t = useTheme();
  const [income, setIncome] = useState(150_000);
  const [other, setOther] = useState(0);
  const [savings, setSavings] = useState(2_000_000);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const [share, setShare] = useState(LOAN_DEFAULTS.incomeSharePct);
  const a = affordability(income, other, savings, rate, clamp(years, 1, 30), share);
  return (
    <Box t={t}>
      <SliderField t={t} label="Take-home pay (₹ a month)" value={income} onChange={setIncome} min={25_000} max={1_000_000} step={5_000} hint={`${short(income * 12)} a year, for the whole household`} />
      <SliderField t={t} label="Other loan EMIs (₹ a month)" value={other} onChange={setOther} min={0} max={200_000} step={1_000} hint="Car, personal or education loans you already repay." />
      <SliderField t={t} label="Savings for the down payment (₹)" value={savings} onChange={setSavings} min={0} max={20_000_000} step={50_000} hint={short(savings)} />
      <SliderField t={t} label="Share of pay for all EMIs (%)" value={share} onChange={setShare} min={10} max={70} step={1} hint="Lenders commonly allow 40–50%." presets={[35, 40, 45, 50].map((v) => ({ label: `${v}%`, value: v }))} />
      <RateField t={t} value={rate} onChange={setRate} />
      <YearsField t={t} value={years} onChange={setYears} />
      <Out t={t} label="Home budget" value={short(a.budget)} sub={`with a home EMI of up to ${rupees(a.spare)} a month`}>
        <Split t={t} title="Where the budget comes from" parts={[{ name: 'Loan you could repay', value: a.loan, slot: 's1' }, { name: 'Your savings', value: savings, slot: 's3' }]} />
        <Split t={t} title="Your pay each month" money={rupees} parts={[{ name: 'Home EMI', value: a.spare, slot: 's1' }, { name: 'Other EMIs', value: Math.min(other, income), slot: 's2' }, { name: 'Left for everything else', value: Math.max(income - other - a.spare, 0), slot: 's3' }]} />
      </Out>
      {a.spare === 0 && <Note t={t}>Your existing EMIs already use the whole share of pay a lender would allow, so the budget is your savings alone.</Note>}
      <Note t={t}>An estimate, not a loan offer.</Note>
    </Box>
  );
}

interface City { slug: string; name: string; costs: CityCosts | null }

/** Stamp duty, registration and GST on top of the price. On the property screen the price, city and status are fixed. */
export function CostCalculator({ price, costs, cityName, underConstruction, cities }: { price?: number; costs?: CityCosts; cityName?: string; underConstruction?: boolean; cities?: City[] }) {
  const t = useTheme();
  const usable = (cities ?? []).filter((c): c is City & { costs: CityCosts } => !!c.costs);
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [citySlug, setCitySlug] = useState(usable[0]?.slug ?? '');
  const [building, setBuilding] = useState(underConstruction ?? false);
  const [woman, setWoman] = useState(false);
  const city = usable.find((c) => c.slug === citySlug);
  const rule = costs ?? city?.costs;
  const place = cityName ?? city?.name;
  if (!rule) return <Text style={{ color: t.muted }}>We do not have the government charges for this city yet.</Text>;
  const b = buyingCosts(amount, rule, { woman, underConstruction: building });
  const concession = rule.stampDutyWomenPct < rule.stampDutyPct;
  const onTop = amount > 0 ? (b.charges / amount) * 100 : 0;
  return (
    <Box t={t}>
      {price == null && <PriceField t={t} value={amount} onChange={setAmount} />}
      {!costs && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>City</Text>
          <View style={s.chips} accessibilityRole="radiogroup">
            {usable.map((c) => (
              <Pressable key={c.slug} accessibilityRole="radio" accessibilityState={{ selected: c.slug === citySlug }} onPress={() => setCitySlug(c.slug)} style={chipStyle(t, c.slug === citySlug)}>
                <Text style={{ color: c.slug === citySlug ? t.brandInk : t.fg }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {underConstruction == null && (
        <View style={s.chips} accessibilityRole="radiogroup">
          {([['Ready to move', false], ['Under construction', true]] as const).map(([label, v]) => (
            <Pressable key={label} accessibilityRole="radio" accessibilityState={{ selected: building === v }} onPress={() => setBuilding(v)} style={chipStyle(t, building === v)}>
              <Text style={{ color: building === v ? t.brandInk : t.fg }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={woman} onValueChange={setWoman} accessibilityLabel="The home will be in a woman's name alone" trackColor={{ true: t.brand, false: '#aeb6c2' }} />
        <Text style={{ color: t.muted, flex: 1, fontSize: 13 }}>In a woman’s name alone{concession ? ` (stamp duty ${rule.stampDutyWomenPct}% instead of ${rule.stampDutyPct}% in ${place})` : ` (no lower rate in ${place})`}</Text>
      </View>
      <Out t={t} label="Total cost to buy" value={short(b.total)} sub={`${short(amount)} listed price + ${short(b.charges)} in charges (${onTop.toFixed(1)}% on top)`}>
        <Split t={t} title="Charges on top of the price" money={rupees} parts={[{ name: `Stamp duty (${b.stampDutyPct}%)`, value: b.stampDuty, slot: 's1' }, { name: 'Registration fee', value: b.registration, slot: 's2' }, { name: building ? `GST (${b.gstPct}%)` : 'GST (none on a ready home)', value: b.gst, slot: 's3' }]} />
      </Out>
      <Note t={t}>
        An estimate for {place}, not a quote. {rule.note} It leaves out the lawyer, brokerage, society transfer fees, loan processing and interiors.{' '}
        {rule.reviewedAt ? `Rates last checked by our team on ${new Date(rule.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'These rates have not yet been checked by our team against the official schedule.'}{' '}
        Confirm the exact amount with the sub-registrar’s office or your lawyer before you pay.
      </Note>
    </Box>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 16 },
  out: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 16, fontWeight: '600', textAlign: 'right', width: 132 },
  slider: { height: 32, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  thumb: { position: 'absolute', top: 5, width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  bar: { flexDirection: 'row', gap: 2, height: 28 },
  seg: { flexBasis: 0, minWidth: 3, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 8 },
  segText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8 },
  key: { width: 10, height: 10, borderRadius: 3 },
});
