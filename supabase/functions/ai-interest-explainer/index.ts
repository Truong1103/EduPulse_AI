import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, interests, activityGroup, currentLevel } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Thiếu câu hỏi cần giải thích" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Bạn là Gia Sư AI Sáng Tạo của EduPulse AI.
Học sinh muốn hiểu khái niệm/câu hỏi: "${question}"
Lĩnh vực: "${activityGroup || 'Học tập'}"
Sở thích cá nhân: ${interests?.length ? interests.join(', ') : 'Trò chơi điện tử, Công nghệ'}
Trình độ: "${currentLevel || 'Cơ bản'}"

Yêu cầu:
Dùng chính sở thích của người học để giải thích khái niệm (ví dụ: giải thích Giải thuật qua cơ chế game; giải thích Xác suất qua tỉ lệ rơi đồ; giải thích Vật lý qua đua xe).
Tạo 1 bài tập thực hành nhỏ và 1 câu hỏi kiểm tra nhanh.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "explanation": "Lời giải thích sinh động kết nối trực tiếp với sở thích của người học...",
  "examples": [
    "Ví dụ thực tế 1 gắn liền sở thích",
    "Ví dụ thực tế 2"
  ],
  "miniExercise": "1 thử thách nhỏ làm ngay trong 5-10 phút",
  "checkQuestion": "1 câu hỏi trắc nghiệm hoặc câu hỏi tư duy ngắn để kiểm tra mức độ hiểu"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(rawText);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

