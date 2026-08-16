import { createClient } from '../supabase/client';
import { Food } from '../types/database';

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: number;
  serving_unit: string;
  barcode?: string;
  source: 'local' | 'openfoodfacts';
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = createClient();
  const results: FoodSearchResult[] = [];

  // 1. Search local Supabase database
  try {
    const { data: localFoods } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${query.trim()}%`)
      .limit(10);

    if (localFoods && localFoods.length > 0) {
      localFoods.forEach((food: Food) => {
        results.push({
          id: food.id,
          name: food.name,
          brand: food.brand,
          calories: food.calories,
          protein_g: Number(food.protein_g),
          carbs_g: Number(food.carbs_g),
          fat_g: Number(food.fat_g),
          serving_size: Number(food.serving_size),
          serving_unit: food.serving_unit,
          barcode: food.barcode,
          source: 'local',
        });
      });
    }
  } catch (error) {
    console.error('Local food search error:', error);
  }

  // 2. Query OpenFoodFacts API if fewer than 6 local results
  if (results.length < 6) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          query.trim()
        )}&search_simple=1&action=process&json=1&page_size=8`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          data.products.forEach((product: any) => {
            const nutriments = product.nutriments || {};
            const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
            const protein = parseFloat((nutriments.proteins_100g || nutriments.proteins || 0).toFixed(1));
            const carbs = parseFloat((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0).toFixed(1));
            const fat = parseFloat((nutriments.fat_100g || nutriments.fat || 0).toFixed(1));

            if (product.product_name && calories > 0) {
              results.push({
                id: `off_${product._id || product.code || Math.random()}`,
                name: product.product_name,
                brand: product.brands || 'Generic',
                calories,
                protein_g: protein,
                carbs_g: carbs,
                fat_g: fat,
                serving_size: 100,
                serving_unit: 'g',
                barcode: product.code,
                source: 'openfoodfacts',
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('OpenFoodFacts API search error:', error);
    }
  }

  return results;
}

export async function fetchFoodByBarcode(barcode: string): Promise<FoodSearchResult | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        return {
          id: `off_${p.code}`,
          name: p.product_name || 'Scanned Product',
          brand: p.brands || 'Generic',
          calories: Math.round(nutriments['energy-kcal_100g'] || 0),
          protein_g: parseFloat((nutriments.proteins_100g || 0).toFixed(1)),
          carbs_g: parseFloat((nutriments.carbohydrates_100g || 0).toFixed(1)),
          fat_g: parseFloat((nutriments.fat_100g || 0).toFixed(1)),
          serving_size: 100,
          serving_unit: 'g',
          barcode: p.code,
          source: 'openfoodfacts',
        };
      }
    }
  } catch (err) {
    console.error('Barcode lookup error:', err);
  }
  return null;
}
