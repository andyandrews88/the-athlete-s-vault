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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const supabaseKey = serviceRoleKey ?? anonKey;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
      });
      return new Response(JSON.stringify({ error: "Server configuration error: missing Supabase credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { userId } = await req.json();

    // Verify same user or admin
    if (userId !== user.id) {
      const { data: roleCheck } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
      if (!roleCheck || roleCheck.length === 0) throw new Error("Unauthorized");
    }

    // Get last 7 days date range
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    // Fetch data in parallel
    const [sessionsRes, checkinsRes, portionsRes, macrosRes, prsRes, setsRes] = await Promise.all([
      supabase.from("training_sessions").select("date, total_ntu, completed").eq("user_id", userId).gte("date", weekAgoStr).order("date"),
      supabase.from("daily_checkins").select("sleep, energy, stress, mood").eq("user_id", userId).gte("date", weekAgoStr),
      supabase.from("hand_portion_logs").select("date").eq("user_id", userId).gte("date", weekAgoStr),
      supabase.from("macro_logs").select("date, protein_g").eq("user_id", userId).gte("date", weekAgoStr),
      supabase.from("personal_records").select("weight_kg, exercise_id").eq("user_id", userId).gte("achieved_at", weekAgoStr),
      // For RIR we need session_exercises -> exercise_sets
      supabase.from("training_sessions").select("id").eq("user_id", userId).gte("date", weekAgoStr).eq("completed", true),
    ]);

    const sessions = sessionsRes.data ?? [];
    const checkins = checkinsRes.data ?? [];
    const portions = portionsRes.data ?? [];
    const macros = macrosRes.data ?? [];
    const prs = prsRes.data ?? [];
    const completedSessions = setsRes.data ?? [];

    const completedCount = sessions.filter((s: any) => s.completed).length;
    const totalNtu = sessions.reduce((sum: number, s: any) => sum + (s.total_ntu ?? 0), 0);
    const avgSleep = checkins.length > 0 ? (checkins.reduce((s: number, c: any) => s + (c.sleep ?? 0), 0) / checkins.length).toFixed(1) : "N/A";
    const avgStress = checkins.length > 0 ? (checkins.reduce((s: number, c: any) => s + (c.stress ?? 0), 0) / checkins.length).toFixed(1) : "N/A";
    const avgEnergy = checkins.length > 0 ? (checkins.reduce((s: number, c: any) => s + (c.energy ?? 0), 0) / checkins.length).toFixed(1) : "N/A";
    const nutritionDays = new Set(portions.map((p: any) => p.date)).size + new Set(macros.map((m: any) => m.date)).size;
    const uniqueNutritionDays = Math.min(nutritionDays, 7);

    // Get avg RIR from exercise sets
    let avgRir = "N/A";
    if (completedSessions.length > 0) {
      const sessionIds = completedSessions.map((s: any) => s.id);
      const { data: sesExercises } = await supabase.from("session_exercises").select("id").in("session_id", sessionIds);
      if (sesExercises && sesExercises.length > 0) {
        const seIds = sesExercises.map((se: any) => se.id);
        const { data: sets } = await supabase.from("exercise_sets").select("rir").in("session_exercise_id", seIds.slice(0, 200));
        if (sets) {
          const rirVals = sets.filter((s: any) => s.rir != null).map((s: any) => s.rir);
          if (rirVals.length > 0) avgRir = (rirVals.reduce((a: number, b: number) => a + b, 0) / rirVals.length).toFixed(1);
        }
      }
    }

    const prompt = `You are Andy Andrews reviewing your client's week.
Be specific. Reference actual numbers.
Tone: direct coach, warm but no fluff.

WEEK DATA:
Sessions: ${completedCount}
Total NTU: ${totalNtu}
Avg Sleep: ${avgSleep}
Avg Stress: ${avgStress}
Avg Energy: ${avgEnergy}
PRs: ${prs.length > 0 ? prs.map((p: any) => `${p.weight_kg}kg`).join(", ") : "None"}
Avg RIR: ${avgRir}
Nutrition logged: ${uniqueNutritionDays}/7 days

Write a weekly review with:
1. ONE specific win (reference actual data)
2. ONE thing to improve (be direct)
3. ONE action for next week (specific)
4. Overall score out of 10

Format as JSON:
{
  "win": "string",
  "improve": "string",
  "action": "string",
  "score": number,
  "summary": "string (2-3 sentences overall)"
}

Return ONLY valid JSON, no markdown.`;

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

    let review;
    try {
      review = JSON.parse(rawContent);
    } catch {
      review = { win: "Data insufficient", improve: "Log more consistently", action: "Complete check-ins daily", score: 5, summary: rawContent };
    }

    // Save to weekly_reviews
    await supabase.from("weekly_reviews").insert({
      user_id: userId,
      summary: review.summary,
      highlights: { win: review.win, improve: review.improve, action: review.action, score: review.score },
      generated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(review), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-weekly-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
