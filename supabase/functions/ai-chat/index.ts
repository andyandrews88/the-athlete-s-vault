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

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const userId = user.id;
    const { messages, context = "general" } = await req.json();

    // Get profile
    const { data: profile } = await supabase.from("profiles").select("tier, audit_score, audit_tier").eq("id", userId).single();

    const tier = profile?.tier ?? "free";

    // Check usage limits based on tier
    if (tier === "coaching") {
      // Unlimited — no limit check
    } else if (tier === "premium") {
      // 500 prompts per month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { count } = await supabase
        .from("ai_usage")
        .select("prompt_count", { count: "exact", head: false })
        .eq("user_id", userId)
        .gte("date", monthStart);

      // Sum prompt_count for the month
      const { data: monthUsage } = await supabase
        .from("ai_usage")
        .select("prompt_count")
        .eq("user_id", userId)
        .gte("date", monthStart);

      const monthTotal = (monthUsage ?? []).reduce((sum: number, row: any) => sum + (row.prompt_count ?? 0), 0);

      if (monthTotal >= 500) {
        return new Response(JSON.stringify({ limitReached: true, error: "Monthly prompt limit reached (500). Upgrade to coaching for unlimited." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Free tier: 2 prompts per day
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("prompt_count")
        .eq("user_id", userId)
        .eq("date", todayStr)
        .single();

      const currentCount = usage?.prompt_count ?? 0;

      if (currentCount >= 2) {
        return new Response(JSON.stringify({ limitReached: true, error: "Daily prompt limit reached" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch user context data in parallel
    const [auditRes, checkinsRes, sessionsRes, progRes, prsRes, knowledgeRes] = await Promise.all([
      supabase.from("audit_results").select("score, tier, strength_score, conditioning_score, mobility_score, lifestyle_score").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("daily_checkins").select("sleep, energy, stress, mood, date").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("training_sessions").select("date, total_ntu, completed").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("training_programmes").select("name").eq("user_id", userId).eq("is_active", true).limit(1),
      supabase.from("personal_records").select("weight_kg, exercise_id").eq("user_id", userId).order("achieved_at", { ascending: false }).limit(5),
      supabase.from("ai_knowledge_base").select("content").eq("category", context).limit(3),
    ]);

    const audit = auditRes.data?.[0];
    const checkins = checkinsRes.data ?? [];
    const sessions = sessionsRes.data ?? [];
    const programme = progRes.data?.[0];
    const prs = prsRes.data ?? [];
    const knowledge = knowledgeRes.data ?? [];

    const sessionCount = sessions.filter((s: any) => s.completed).length;
    const avgNtu = sessions.length > 0
      ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.total_ntu ?? 0), 0) / sessions.length)
      : 0;

    const latestCheckin = checkins[0];
    const prSummary = prs.map((p: any) => `${p.weight_kg}kg`).join(", ") || "None yet";
    const knowledgeContext = knowledge.map((k: any) => k.content).join("\n\n");

    const systemPrompt = `You are Andy Andrews — 6-Time Fittest Man in Sri Lanka and CrossFit Games Athlete. You are a performance coach with over a decade of real coaching experience.

YOUR VOICE:
- Direct and honest. No fluff.
- Evidence-based but practical
- You care about results, not feelings
- You speak like a coach in a gym, not a corporate wellness app
- Short sentences. No waffle.
- You reference the client's actual data when relevant

YOUR METHODOLOGY:
- Movement quality before load
- Consistency beats intensity
- Sleep and recovery are training
- Hand portions over calorie counting
- NTU system for training load
- Readiness drives intensity each day

CLIENT DATA:
Audit Score: ${audit?.score ?? profile?.audit_score ?? "Not completed"} (${audit?.tier ?? profile?.audit_tier ?? "unknown"})
Active Programme: ${programme?.name ?? "None assigned"}
Last 7 days: ${sessionCount} sessions, avg NTU ${avgNtu}
Latest readiness: Sleep ${latestCheckin?.sleep ?? "?"}, Stress ${latestCheckin?.stress ?? "?"}, Energy ${latestCheckin?.energy ?? "?"}
Top PRs: ${prSummary}

${knowledgeContext ? `KNOWLEDGE BASE:\n${knowledgeContext}` : ""}

RULES:
- Never give dangerous medical advice
- If asked about injury: recommend seeing a professional
- Keep responses under 150 words unless detail is genuinely needed
- Never mention you are an AI
- Never say "As Andy Andrews..."
- Just respond as Andy would`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      throw new Error("AI service error");
    }

    const openaiData = await openaiRes.json();
    const reply = openaiData.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    // Log usage
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("prompt_count")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .single();

    if (usage) {
      await supabase.from("ai_usage").update({ prompt_count: (usage.prompt_count ?? 0) + 1 }).eq("user_id", userId).eq("date", todayStr);
    } else {
      await supabase.from("ai_usage").insert({ user_id: userId, date: todayStr, prompt_count: 1 });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
