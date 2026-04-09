import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 50 calls/user/day
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "enrich-contact",
      p_max_calls: 50,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Daily limit exceeded (50 enrichments/day)" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { first_name, last_name, company, job_title } = await req.json();
    if (!first_name && !last_name && !company) {
      return new Response(JSON.stringify({ error: "Need at least a name or company to search" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const fullName = `${first_name || ""} ${last_name || ""}`.trim();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at finding professional contact information. You must return ONLY valid JSON with these fields:
- linkedin_url: The most likely LinkedIn profile URL for this person (use format linkedin.com/in/firstname-lastname, accounting for common variations)
- email: The most likely professional email address (research common email formats used at the company like firstname.lastname@domain.com, first.last@domain.com, flastname@domain.com, etc.)
- company_website: The company's main website domain
- linkedin_confidence: "high", "medium", or "low" - how confident you are about the LinkedIn URL
- email_confidence: "high", "medium", or "low" - how confident you are about the email

Consider:
- Common LinkedIn URL patterns (first-last, firstlast, first-middle-last)
- Known email formats for major companies
- The person's seniority and role may affect their LinkedIn presence`
          },
          {
            role: "user",
            content: `Find contact details for: ${fullName}${job_title ? `, ${job_title}` : ""}${company ? ` at ${company}` : ""}`
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI enrichment failed");
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { linkedin_url: null, email: null, company_website: null, linkedin_confidence: "low", email_confidence: "low" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-contact error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
