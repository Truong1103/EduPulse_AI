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

    const { studentId, goalId, tasks, journals, goal, localMetrics } = await req.json();

    // RLS check
    if (studentId !== user.id) {
      return new Response(JSON.stringify({ error: "Không được phép phân tích dữ liệu của người khác" }), {
        status: 403,
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

    const prompt = `Bạn là hệ thống AI Phân tích Nguy cơ Bỏ Cuộc và Quá Tải Học Tập của EduPulse AI.
Dữ liệu phân tích của học sinh:
- Số nhiệm vụ đã hoàn thành / Tổng số: ${localMetrics?.completionRate ? Math.round(localMetrics.completionRate * 100) : 0}%
- Số việc trễ hạn (overdue): ${localMetrics?.overdueTasks ?? 0}
- Số ngày không ghi nhận hoạt động (14 ngày qua): ${localMetrics?.inactiveDays ?? 0}
- Lịch sử nhật ký gần nhất: ${JSON.stringify(journals?.slice(0, 5) || [])}
- Mục tiêu: ${JSON.stringify(goal || {})}

Quy tắc phân loại:
- "normal": Tiến độ đều đặn, không có biểu hiện quá tải hay bỏ cuộc kéo dài.
- "attention": Có vài việc trễ hạn (1-3 việc) hoặc động lực giảm sút nhẹ, cần chú ý hỗ trợ.
- "high_risk": Trễ hạn nhiều liên tiếp, động lực thấp kéo dài hoặc không hoạt động nhiều ngày.
LƯU Ý:
- KHÔNG kết luận chắc chắn rằng người dùng sẽ bỏ cuộc.
- KHÔNG đánh giá nguy cơ cao chỉ vì nghỉ 1 ngày bình thường.
- Phải kèm nguyên nhân có khả năng và giải pháp hỗ trợ thiết thực, tôn trọng người dùng.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "riskLevel": "normal" | "attention" | "high_risk",
  "completionRate": ${localMetrics?.completionRate ?? 0},
  "overdueTasks": ${localMetrics?.overdueTasks ?? 0},
  "inactiveDays": ${localMetrics?.inactiveDays ?? 0},
  "avgMotivation": 3.5,
  "avgDifficulty": 3.0,
  "overloadScore": 2.5,
  "reasons": ["Lý do phân tích 1", "Lý do 2"],
  "suggestions": ["Gợi ý giải pháp 1", "Gợi ý giải pháp 2"],
  "dataEvidence": {
    "totalTasks": ${tasks?.length || 0},
    "overdueCount": ${localMetrics?.overdueTasks ?? 0}
  }
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
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

    // Tự động lưu vào bảng ai_risk_assessments
    await supabaseClient.from("ai_risk_assessments").insert({
      student_id: studentId,
      goal_id: goalId,
      risk_level: parsedData.riskLevel,
      completion_rate: parsedData.completionRate,
      overdue_tasks: parsedData.overdueTasks,
      inactive_days: parsedData.inactiveDays,
      avg_motivation: parsedData.avgMotivation,
      avg_difficulty: parsedData.avgDifficulty,
      overload_score: parsedData.overloadScore,
      reasons: parsedData.reasons,
      suggestions: parsedData.suggestions,
      data_evidence: parsedData.dataEvidence,
    });

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

