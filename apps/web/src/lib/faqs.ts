import { price, rate } from './format';
import type { BhkRow, Stats } from './types';

/** Questions buyers actually ask about an area, answered from the live numbers on the page. */
export function areaFaqs(place: string, stats: Stats, bhk: BhkRow[], extra: { q: string; a: string }[] = []) {
  if (!stats.count) return extra;
  const common = [...bhk].sort((a, b) => b.count - a.count)[0];
  return [
    { q: `What is the price of property in ${place}?`, a: `Homes listed in ${place} are priced from ${price(stats.minPrice)} to ${price(stats.maxPrice)}, with an average asking rate of ${rate(stats.avgRate)}.` },
    ...(common ? [{ q: `Which home sizes are available in ${place}?`, a: `${bhk.map((b) => `${b.bhk} BHK (${b.count} listed, from ${price(b.minPrice)})`).join(', ')}. ${common.bhk} BHK homes are the most common.` }] : []),
    { q: `How many properties are for sale in ${place}?`, a: `${stats.count} ${stats.count === 1 ? 'property is' : 'properties are'} listed for sale in ${place} right now.` },
    ...extra,
  ];
}
