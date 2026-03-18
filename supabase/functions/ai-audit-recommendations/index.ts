import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth token");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { userId, auditData } = await req.json();

    const prompt = `You are Andy Andrews reviewing a movement and lifestyle audit.
Be specific to their scores. No generic advice.
Reference their actual weak areas.
Max 3 priorities. Each max 2 sentences.

AUDIT DATA:
Overall Score: ${auditData.score}/100 (${auditData.tier})
Strength: ${auditData.strengthScore}/25
Engine/Conditioning: ${auditData.engineScore}/20
Movement/Mobility: ${auditData.movementScore}/20
Lifestyle: ${auditData.lifestyleScore}/10
Nutrition: ${auditData.nutritionScore}/25

Return ONLY valid JSON:
{
  "priority_1": { "title": "string", "description": "string", "action": "string" },
  "priority_2": { "title": "string", "description": "string", "action": "string" },
  "priority_3": { "title": "string", "description": "string", "action": "string" },
  "summary": "string (2-3 sentences)"
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) throw new Error("AI service error");
    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content ?? "{}";

    let recommendations;
    try {
      recommendations = JSON.parse(rawContent);
    } catch {
      recommendations = {
        priority_1: { title: "Build Consistency", description: "Focus on showing up regularly before optimising.", action: "Train 3x this week minimum." },
        priority_2: { title: "Improve Recovery", description: "Sleep and stress management are limiting your progress.", action: "Get 7+ hours sleep for 5 consecutive nights." },
        priority_3: { title: "Track Nutrition", description: "Without data, we can't improve what we can't measure.", action: "Log hand portions for every meal this week." },
        summary: rawContent,
      };
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-audit-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
