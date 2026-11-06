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

    const { goalDescription, startDate, endDate, interests, dailyAvailableMinutes, currentLevel, activityGroup } = await req.json();

    if (!goalDescription || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Bạn là một Chuyên gia Lên Kế Hoạch Học Tập & Công Việc Cá Nhân thông minh.
Nhiệm vụ: Tạo một lộ trình kế hoạch với các giai đoạn (phases) và danh sách nhiệm vụ (tasks) thực tế.

Thông tin kế hoạch:
- Mô tả mục tiêu: "${goalDescription}"
- Nhóm hoạt động: "${activityGroup || 'Học tập'}"
- Ngày bắt đầu: ${startDate}
- Ngày kết thúc: ${endDate}
- Sở thích của người học: ${interests?.length ? interests.join(", ") : "Chung"}
- Thời gian có thể dành mỗi ngày: ${dailyAvailableMinutes || 45} phút
- Trình độ hiện tại: ${currentLevel || "Người mới bắt đầu"}

Yêu cầu nghiêm ngặt:
1. Tất cả nhiệm vụ 'due_date' PHẢI nằm trong khoảng từ ${startDate} đến ${endDate} (định dạng YYYY-MM-DD).
2. Không phân bổ quá tải (không quá 3-4 việc một ngày, mỗi việc từ 15 đến 90 phút).
3. 'priority' chỉ được là một trong: "low", "medium", "high".
4. 'difficulty' là số nguyên từ 1 đến 5.
5. 'estimated_minutes' là số nguyên (phút).
6. Tích hợp nhẹ nhàng sở thích vào ví dụ/bài tập nếu phù hợp.
7. Trả về DUY NHẤT một JSON hợp lệ (không bọc trong \`\`\`json) theo đúng cấu trúc:
{
  "phases": [
    {
      "name": "Tên giai đoạn 1",
      "description": "Mô tả ngắn gọn",
      "tasks": [
        {
          "title": "Tên công việc cụ thể",
          "description": "Mô tả việc cần làm",
          "due_date": "YYYY-MM-DD",
          "priority": "medium",
          "estimated_minutes": 30,
          "difficulty": 2
        }
      ]
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
      return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

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

