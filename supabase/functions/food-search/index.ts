import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { query } = await req.json();
  const apiKey = Deno.env.get('USDA_API_KEY') ?? '';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=SR%20Legacy,Survey%20(FNDDS),Foundation&pageSize=10&api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  const foods = (data.foods ?? []).map((f: any) => {
    const get = (id: number) => f.foodNutrients?.find((n: any) => n.nutrientId === id)?.value ?? 0;
    return {
      fdcId: f.fdcId,
      name: f.description,
      brandOwner: f.brandOwner ?? null,
      calories: Math.round(get(1008)),
      protein_g: Math.round(get(1003) * 10) / 10,
      carbs_g: Math.round(get(1005) * 10) / 10,
      fat_g: Math.round(get(1004) * 10) / 10,
      serving_g: 100,
    };
  });

  return new Response(JSON.stringify({ foods }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
