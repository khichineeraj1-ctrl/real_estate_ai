import type { CityCosts } from './finance';
import type { Confidence, PublicDealer } from './trust';

export type PropertyType = 'APARTMENT' | 'VILLA' | 'BUILDER_FLOOR' | 'PLOT';
export type Status = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
export interface Place { slug: string; name: string }
export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }
export interface BhkRow { bhk: number; count: number; minPrice: number | null }

export interface PropertyCard {
  slug: string; title: string; type: PropertyType; bhk: number; bathrooms: number; priceInr: number; areaSqft: number;
  status: Status; possession: string | null; listedBy: 'OWNER' | 'BUILDER' | 'AGENT'; postedAt: string;
  locality: Place & { city: Place };
  project: (Place & { builder: string; brand: Place | null }) | null;
  /** At most one on cards (the cover); every photo on the detail page. */
  photos: { file: string; width?: number; height?: number; category?: string | null }[];
  /** YouTube videos, on the detail page only. */
  videos?: { youtubeId: string; title: string | null }[];
  /** How far the home and its seller are verified, 0 (not yet) to 3 (high). */
  confidence?: number;
}
export interface ProjectLink extends Place { builder: string; brand: Place | null; /** The cover photo, when the project has photos. */ photos?: { file: string }[]; /** Verified agents selling it. */ agents?: number; status: Status; locality?: { name: string }; registerSource?: string | null }

export interface CitySummary extends Place { state: string; intro: string; localities: Place[]; stats: Stats; costs: CityCosts | null }
export interface CityDetail extends Place {
  state: string; intro: string; lat: number; lng: number; stats: Stats; bhk: BhkRow[];
  localities: (Place & { stats: Stats })[]; projects: ProjectLink[];
  /** Builders with projects in the city, busiest first; `total` counts them all. */
  builders: { total: number; top: (Place & { projects: number })[] };
}
export interface LocalityDetail extends Place {
  intro: string; highlights: string[]; lat: number; lng: number; city: Place & { state: string };
  stats: Stats; bhk: BhkRow[]; projects: ProjectLink[]; nearby: Place[];
}
/** A builder as buyers know it, across the companies its projects are registered under. */
export interface BuilderSummary extends Place { projects: number; cities: Place[] }
export type Tone = 'good' | 'warn' | 'info' | 'none';
/** A builder's registrations by where each stands, with a plain verdict (see the API's guidance.ts). */
export interface BuilderRecord { total: number; current: number; ended: number; lapsed: number; unknown: number; since: number | null; latest: number | null; nextDue: { name: string; date: string } | null; lapsedNames: string[]; verdict: { tone: Tone; title: string; text: string } }
/** One thing to check, ask for or refuse before paying for a project. */
export interface CheckItem { key: string; tone: Tone; title: string; why: string; link?: { href: string; label: string } }
export interface BuilderDetail extends Place {
  record: BuilderRecord;
  registeredAs: string[]; cities: Place[];
  projects: (Place & { builder: string; status: Status; reraId: string | null; registerSource: string | null; registerStatus: string | null; registerValidUntil: string | null; homes: number; agents?: number; photos?: { file: string }[]; locality: Place; city: Place })[];
  /** Projects the register lists for this builder in the city that we have no page for (outside the localities we cover). */
  alsoRegistered: { name: string; location: string; regNo: string; status: string | null; validUntil: string | null; sourceUrl: string; registerName: string }[];
  alsoRegisteredTotal: number;
  /** False when the page says no more than its one project's own page, so it is kept out of search. */
  indexable: boolean;
}
export interface ProjectUnit { id: string; label: string; bhk: number | null; carpetMinSqft: number; carpetMaxSqft: number | null; priceMinInr: number | null; priceMaxInr: number | null; planFile: string | null; ratePerCarpetSqft: number | null }
export interface NearbyGroup { kind: string; label: string; icon: string; items: { name: string; km: number }[] }
export interface ProjectDetail extends Place {
  /** The kinds of home on offer, as stated by the builder; empty until our team has them. */
  units: ProjectUnit[];
  amenityGroups: { group: string; items: { label: string; icon: string }[] }[];
  /** Where distances are measured from: the project's own pin (exact) or the centre of its locality. */
  place: { lat: number; lng: number; exact: boolean; nearby: NearbyGroup[] };
  checklist: CheckItem[];
  /** What the builder declared in its registration application, where we have read it; unchecked. */
  declared: { litigation: boolean | null; apartments: number | null; towers: number | null; start: string | null; completion: string | null; readAt: string } | null;
  /** Every photo of the project, cover first. */
  photos: { file: string; width: number; height: number; category?: string | null }[];
  videos?: { youtubeId: string; title: string | null }[];
  /** The promoter's name as registered. `brand` is the builder page the project is listed under. */
  brand: Place | null;
  builder: string; description: string; status: Status; possession: string | null; reraId: string | null; totalUnits: number | null; amenities: string[];
  /** Set when the page was made from a public RERA register and the builder has not confirmed it. */
  registerSource: string | null; registerName: string | null; registerStatus: string | null; registerValidUntil: string | null; sourceUrl: string | null; sourceFetchedAt: string | null;
  locality: Place & { lat: number; lng: number }; city: Place & { state: string }; properties: PropertyCard[]; stats: Stats; bhk: BhkRow[];
  /** Other projects by the same builder in this city, and by other builders in the same locality. */
  more: { byBuilder: ProjectLink[]; inLocality: ProjectLink[] };
  /** Agents our team has verified who sell this project. Their phone number is shown only to a buyer who asks to be connected. */
  agents: { id: string; name: string; firmName: string | null; yearsInBusiness: number | null; level: number; label: string }[];
}
export interface PropertyDetail extends Omit<PropertyCard, 'locality' | 'project' | 'confidence'> {
  /** The level with what it rests on, and the seller's public card when the home has an outside seller. */
  confidence: Confidence; seller: PublicDealer | null; staffVerifiedAt: string | null;
  /** 'seller': an owner or agent posted it, and their contact is shown after an enquiry. 'callback': a builder's stock or our own listing, which takes a lead. */
  contact: 'seller' | 'callback';
  description: string; floor: number | null; totalFloors: number | null; facing: string | null; furnishing: string | null; amenities: string[];
  locality: Place & { lat: number; lng: number; highlights: string[] }; city: Place & { state: string };
  project: (Place & { builder: string; reraId: string | null; brand: Place | null }) | null; localityStats: Stats; similar: PropertyCard[];
  /** Government charges for the home's city; null when we have none on record. */
  costs: CityCosts | null;
}
export interface Listing { items: PropertyCard[]; total: number; page: number; pageSize: number; stats: Stats }
/** A builder's project in an answer from the assistant. */
export type ProjectHit = { slug: string; name: string; builder: string; brand: Place | null; registerSource: string | null; registerStatus: string | null; registerValidUntil: string | null; agents?: number; photos?: { file: string; width?: number; height?: number }[]; locality: Place; city: Place };
export interface AskResult { reply: string; live: boolean; properties: PropertyCard[]; total: number; page: { path: string; label: string } | null; relaxed: string | null; projects?: ProjectHit[]; projectsTotal?: number; land?: import('@/components/land/cards').LandItem[] }
export interface SitemapData {
  cities: { slug: string; localities: string[] }[];
  configs: { city: string; locality: string; bhk: number; count: number }[];
  comparisons: { city: string; pair: string }[];
  properties: { slug: string; postedAt: string }[];
  projects: { slug: string; city: string; builder: string }[];
  /** Each builder's page in each city it works in, and the builders that work in more than one city. */
  builderCities: { city: string; builder: string }[];
  builders: { slug: string }[];
}
