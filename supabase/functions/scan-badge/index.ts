import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Extract badge data using vision
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a conference badge reader. Extract the following from this badge photo: first_name, last_name, job_title, company_name. Return ONLY valid JSON. If you cannot read a field, set it to null."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the information from this conference badge." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
      }),
    });

    if (!extractResponse.ok) {
      const errText = await extractResponse.text();
      console.error("AI extraction error:", extractResponse.status, errText);
      if (extractResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (extractResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to extract badge data");
    }

    const extractData = await extractResponse.json();
    let badgeText = extractData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    badgeText = badgeText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let badgeData;
    try {
      badgeData = JSON.parse(badgeText);
    } catch {
      badgeData = { first_name: null, last_name: null, job_title: null, company_name: null };
    }

    // Step 2: Enrichment
    if (badgeData.first_name || badgeData.last_name || badgeData.company_name) {
      const enrichResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: "You are a business contact enrichment assistant. Return ONLY valid JSON."
            },
            {
              role: "user",
              content: `Given this person: ${badgeData.first_name || ""} ${badgeData.last_name || ""}, ${badgeData.job_title || ""} at ${badgeData.company_name || ""}.
1. Guess their LinkedIn profile URL format (linkedin.com/in/firstname-lastname)
2. Guess their email (most common format: firstname.lastname@companydomain.com)
3. Find the company website domain
Return ONLY valid JSON with: linkedin_url, email_guess, company_website`
            },
          ],
        }),
      });

      if (enrichResponse.ok) {
        const enrichData = await enrichResponse.json();
        let enrichText = enrichData.choices?.[0]?.message?.content || "";
        enrichText = enrichText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          const enriched = JSON.parse(enrichText);
          badgeData.linkedin_url = enriched.linkedin_url || null;
          badgeData.email_guess = enriched.email_guess || null;
          badgeData.company_website = enriched.company_website || null;
        } catch {
          // enrichment failed, non-blocking
        }
      }
    }

    return new Response(JSON.stringify(badgeData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-badge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
