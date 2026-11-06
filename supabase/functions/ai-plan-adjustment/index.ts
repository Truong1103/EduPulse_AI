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

    const { riskAssessment, tasks, goal } = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Bạn là Chuyên gia Cố vấn Điều chỉnh Kế hoạch của EduPulse AI.
Học sinh đang có đánh giá nguy cơ:
- Mức độ: ${riskAssessment?.riskLevel}
- Lý do: ${JSON.stringify(riskAssessment?.reasons || [])}
- Danh sách công việc hiện tại: ${JSON.stringify(tasks?.slice(0, 10) || [])}
- Kế hoạch: ${JSON.stringify(goal || {})}

Nhiệm vụ: Đề xuất các điều chỉnh thông minh (chia nhỏ nhiệm vụ, giảm độ khó, dời lịch hợp lý hoặc thêm ngày nghỉ phục hồi).
Học sinh sẽ được xem so sánh TRƯỚC và SAU và phải xác nhận mới lưu.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "studentId": "${user.id}",
  "goalId": "${goal?.id || ''}",
  "createdAt": "${new Date().toISOString()}",
  "status": "pending",
  "riskLevel": "${riskAssessment?.riskLevel || 'attention'}",
  "summary": "Tóm tắt ngắn gọn đề xuất điều chỉnh kế hoạch",
  "taskChanges": [
    {
      "taskId": "id_nhiệm_vụ_cũ_nếu_có",
      "action": "split" | "reschedule" | "reduce_difficulty" | "remove" | "add",
      "originalTask": { "title": "Tên cũ", "dueDate": "YYYY-MM-DD" },
      "newTask": { "title": "Tên mới được tinh gọn", "dueDate": "YYYY-MM-DD", "priority": "medium", "estimatedMinutes": 20, "difficulty": 2 },
      "reason": "Lý do thay đổi cụ thể"
    }
  ]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
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

