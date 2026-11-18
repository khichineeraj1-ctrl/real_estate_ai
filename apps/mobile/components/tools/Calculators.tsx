import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { LOAN_DEFAULTS, affordability, buyingCosts, loanPlan, type CityCosts } from '../../lib/finance';
import { num, price as short } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

const rupees = (n: number) => `₹${num(Math.round(n))}`;

/** A labelled number box. Keeps what was typed as text so a half-typed value like "8." is not rewritten under the cursor. */
function NumberField({ t, label, value, onChange, hint, decimal }: { t: Theme; label: string; value: number; onChange: (n: number) => void; hint?: string; decimal?: boolean }) {
  const [text, setText] = useState(String(value));
  return (
    <View style={s.field}>
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <TextInput
        value={text} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} accessibilityLabel={label} maxLength={12}
        onChangeText={(v) => { const clean = v.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, ''); setText(clean); const n = Number(clean); if (Number.isFinite(n)) onChange(n); }}
        style={[s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }]}
      />
      {hint ? <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

function Result({ t, rows, big }: { t: Theme; big: [string, string]; rows: [string, string][] }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <View><Text style={{ color: t.muted }}>{big[0]}</Text><Text style={{ color: t.fg, fontSize: 30, fontWeight: '800' }}>{big[1]}</Text></View>
      {rows.map(([k, v]) => (
        <View key={k} style={[s.row, { borderColor: t.line }]}><Text style={{ color: t.muted, flexShrink: 1 }}>{k}</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{v}</Text></View>
      ))}
    </View>
  );
}

const Box = ({ t, children }: { t: Theme; children: React.ReactNode }) => <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>{children}</View>;
const Note = ({ t, children }: { t: Theme; children: React.ReactNode }) => <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{children}</Text>;

/** Home-loan instalment. With `price` given (the property screen) the price is fixed; otherwise the buyer types it. */
export function EmiCalculator({ price }: { price?: number }) {
  const t = useTheme();
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [downPct, setDownPct] = useState(LOAN_DEFAULTS.downPct);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const p = loanPlan(amount, downPct, rate, Math.min(Math.max(years, 1), 30));
  return (
    <Box t={t}>
      {price == null && <NumberField t={t} label="Home price (₹)" value={amount} onChange={setAmount} hint={short(amount)} />}
      <View style={s.pair}>
        <NumberField t={t} label="Down payment (%)" value={downPct} onChange={setDownPct} hint={rupees(p.downPayment)} decimal />
        <NumberField t={t} label="Loan period (years)" value={years} onChange={setYears} hint="1 to 30" />
      </View>
      <NumberField t={t} label="Interest rate (% a year)" value={rate} onChange={setRate} decimal hint="An example rate. Use the rate your bank offers you." />
      <Result t={t} big={['Monthly EMI', rupees(p.monthly)]} rows={[['Loan amount', short(p.loan)], [`Interest over ${Math.min(Math.max(years, 1), 30)} years`, short(p.interest)], ['Total you repay', short(p.totalPaid)]]} />
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
  const a = affordability(income, other, savings, rate, Math.min(Math.max(years, 1), 30));
  return (
    <Box t={t}>
      <NumberField t={t} label="Household take-home pay (₹ a month)" value={income} onChange={setIncome} />
      <NumberField t={t} label="Other loan EMIs (₹ a month)" value={other} onChange={setOther} hint="Car, personal or education loans you already repay." />
      <NumberField t={t} label="Savings for the down payment (₹)" value={savings} onChange={setSavings} hint={short(savings)} />
      <View style={s.pair}>
        <NumberField t={t} label="Interest rate (%)" value={rate} onChange={setRate} decimal />
        <NumberField t={t} label="Loan period (years)" value={years} onChange={setYears} />
      </View>
      <Result t={t} big={['Home budget', short(a.budget)]} rows={[['Loan you could repay', short(a.loan)], ['EMI you could carry', rupees(a.spare)], ['From your savings', short(savings)]]} />
      <Note t={t}>Assumes all your loan EMIs together may take {LOAN_DEFAULTS.incomeSharePct}% of take-home pay, which is what lenders commonly allow. An estimate, not a loan offer.</Note>
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
  const chip = (on: boolean) => [s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }];
  return (
    <Box t={t}>
      {price == null && <NumberField t={t} label="Home price (₹)" value={amount} onChange={setAmount} hint={short(amount)} />}
      {!costs && (
        <View style={s.field}>
          <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>City</Text>
          <View style={s.chips} accessibilityRole="radiogroup">
            {usable.map((c) => (
              <Pressable key={c.slug} accessibilityRole="radio" accessibilityState={{ selected: c.slug === citySlug }} onPress={() => setCitySlug(c.slug)} style={chip(c.slug === citySlug)}>
                <Text style={{ color: c.slug === citySlug ? t.brandInk : t.fg }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {underConstruction == null && (
        <View style={s.chips} accessibilityRole="radiogroup">
          {([['Ready to move', false], ['Under construction', true]] as const).map(([label, v]) => (
            <Pressable key={label} accessibilityRole="radio" accessibilityState={{ selected: building === v }} onPress={() => setBuilding(v)} style={chip(building === v)}>
              <Text style={{ color: building === v ? t.brandInk : t.fg }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={woman} onValueChange={setWoman} accessibilityLabel="The home will be in a woman's name alone" trackColor={{ true: t.brand }} />
        <Text style={{ color: t.muted, flex: 1, fontSize: 13 }}>In a woman’s name alone{concession ? ` (stamp duty ${rule.stampDutyWomenPct}% instead of ${rule.stampDutyPct}% in ${place})` : ` (no lower rate in ${place})`}</Text>
      </View>
      <Result t={t} big={['Total cost to buy', short(b.total)]} rows={[
        ['Listed price', short(amount)], [`Stamp duty (${b.stampDutyPct}%)`, rupees(b.stampDuty)], ['Registration fee', rupees(b.registration)],
        [building ? `GST (${b.gstPct}%, under construction)` : 'GST (none on a ready home)', rupees(b.gst)], ['Charges on top of the price', short(b.charges)],
      ]} />
      <Note t={t}>
        An estimate for {place}, not a quote. {rule.note} It leaves out the lawyer, brokerage, society transfer fees, loan processing and interiors.{' '}
        {rule.reviewedAt ? `Rates last checked by our team on ${new Date(rule.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'These rates have not yet been checked by our team against the official schedule.'}{' '}
        Confirm the exact amount with the sub-registrar’s office or your lawyer before you pay.
      </Note>
    </Box>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  field: { gap: 4, flex: 1 },
  pair: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
