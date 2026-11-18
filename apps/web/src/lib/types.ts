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
  project: (Place & { builder: string }) | null;
  /** At most one on cards (the cover); every photo on the detail page. */
  photos: { file: string; width?: number; height?: number }[];
  /** How far the home and its seller are verified, 0 (not yet) to 3 (high). */
  confidence?: number;
}
export interface ProjectLink extends Place { builder: string; status: Status; locality?: { name: string } }

export interface CitySummary extends Place { state: string; intro: string; localities: Place[]; stats: Stats; costs: CityCosts | null }
export interface CityDetail extends Place {
  state: string; intro: string; lat: number; lng: number; stats: Stats; bhk: BhkRow[];
  localities: (Place & { stats: Stats })[]; projects: ProjectLink[];
}
export interface LocalityDetail extends Place {
  intro: string; highlights: string[]; lat: number; lng: number; city: Place & { state: string };
  stats: Stats; bhk: BhkRow[]; projects: ProjectLink[]; nearby: Place[];
}
export interface ProjectDetail extends Place {
  builder: string; description: string; status: Status; possession: string | null; reraId: string | null; totalUnits: number; amenities: string[];
  locality: Place & { lat: number; lng: number }; city: Place & { state: string }; properties: PropertyCard[]; stats: Stats; bhk: BhkRow[];
}
export interface PropertyDetail extends Omit<PropertyCard, 'locality' | 'project' | 'confidence'> {
  /** The level with what it rests on, and the seller's public card when the home has an outside seller. */
  confidence: Confidence; seller: PublicDealer | null; staffVerifiedAt: string | null;
  description: string; floor: number | null; totalFloors: number | null; facing: string | null; furnishing: string | null; amenities: string[];
  locality: Place & { lat: number; lng: number; highlights: string[] }; city: Place & { state: string };
  project: (Place & { builder: string; reraId: string | null }) | null; localityStats: Stats; similar: PropertyCard[];
  /** Government charges for the home's city; null when we have none on record. */
  costs: CityCosts | null;
}
export interface Listing { items: PropertyCard[]; total: number; page: number; pageSize: number; stats: Stats }
export interface AskResult { reply: string; live: boolean; properties: PropertyCard[]; total: number; page: { path: string; label: string } | null; relaxed: string | null }
export interface SitemapData {
  cities: { slug: string; localities: string[] }[];
  configs: { city: string; locality: string; bhk: number; count: number }[];
  comparisons: { city: string; pair: string }[];
  properties: { slug: string; postedAt: string }[];
  projects: { slug: string }[];
}
