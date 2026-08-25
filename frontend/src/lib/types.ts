export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  plant_type?: string;
}

export interface Nutrition {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  price_eur: number;
}

export type KcalBucket = '<500' | '500-1000' | '>1000';

export type SourceType = 'blog' | 'instagram' | 'tiktok' | 'youtube' | 'manual';

export interface Recipe {
  id?: string;
  ownerId: string;
  title: string;
  source_url?: string;
  source_type: SourceType;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  image_url?: string;
  estimated_nutrition?: Nutrition;
  estimated_price?: number;
  folders: string[];
  kcal_bucket?: KcalBucket;
  createdAt?: number;
  updatedAt?: number;
}

export interface Folder {
  id?: string;
  ownerId: string;
  name: string;
  is_default: boolean;
}

export interface ModelSettings {
  extract: string;
  vision: string;
  nutrition: string;
  adjust: string;
  review: string;
}
