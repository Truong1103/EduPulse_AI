import { GoogleGenAI } from '@google/genai';

export interface SupportDraftRequest {
  barrier: string;
  sourceCitation?: string;
  evidenceLevel?: 'other_population' | 'design_principle' | 'direct_population';
  studentContext?: string;
}

export interface SupportDraftResult {
  title: string;
  body: string;
}

const barrierProfiles: Record<string, {
  label: string;
  focus: string;
  action: string;
  tone: string;
  title: string;
  body: string;
}> = {
  fatigue_overload: {
    label: 'Quá tải / kiệt sức',
    focus: 'giảm tải tâm lý và giúp học sinh chọn lại nhịp học nhỏ hơn',
    action: 'chia mục tiêu thành 3 bước ngắn, ưu tiên việc quan trọng nhất, nhấn mạnh việc học đều đặn hơn là hoàn thành tất cả',
    tone: 'thân thiện, không phán xét, chốt rõ nhịp học nhỏ và bền',
    title: 'Giảm quá tải và chia nhỏ nhiệm vụ',
    body: 'Bạn không cần cố gắng làm hết mọi thứ trong một tuần. Hãy chia mục tiêu lớn thành 3 bước ngắn, mỗi bước chỉ cần 15–20 phút và tập trung vào việc quan trọng nhất trước tiên. Nếu bạn thấy mệt, hãy nghỉ 5 phút rồi tiếp tục ở mức nhỏ hơn, vì nhịp học đều đặn tốt hơn là học dài nhưng gián đoạn.'
  },
  time: {
    label: 'Thiếu thời gian',
    focus: 'giúp học sinh xây khung học thực tế và không cảm thấy bị đẩy quá tải',
    action: 'chọn 1 khung học cố định, ưu tiên 1–2 hoạt động cốt lõi, thiết lập mức tối thiểu bắt đầu',
    tone: 'có tính thực tế, không mông lung, nhấn mạnh khung cố định',
    title: 'Tối ưu thời gian học theo nhịp thực tế',
    body: 'Thiếu thời gian không phải là dấu hiệu bạn không đủ nỗ lực, mà là dấu hiệu cần thiết lập khung học rõ ràng hơn. Hãy chọn một khung học cố định trong ngày, ưu tiên 1–2 hoạt động cốt lõi, và thực hiện ở mức nhỏ nhưng đều đặn. Một buổi học ngắn 20 phút đều đặn sẽ hiệu quả hơn việc học dài nhưng không kéo dài được.'
  },
  task_difficulty: {
    label: 'Nhiệm vụ quá khó',
    focus: 'giảm độ khó cảm nhận và giúp học sinh bắt đầu bằng phần dễ nhất',
    action: 'tách bài thành các bước rất nhỏ, ưu tiên hoàn thành một phần thật sự làm được, đổi sang nhịp thấp hơn nếu cần',
    tone: 'đỡ áp lực, hỗ trợ hành động ngắn và khả thi',
    title: 'Giảm độ khó để bắt đầu lại',
    body: 'Khi nhiệm vụ quá khó, cách hiệu quả nhất là làm phần dễ nhất trước. Hãy tách nhiệm vụ thành từng bước rất nhỏ, bắt đầu với việc hoàn thành được 1 phần bất kỳ, rồi tiếp tục dần theo nhịp. Đừng chờ đến khi “hết sức” mới lên kế hoạch — tiến bộ nhỏ hàng ngày cũng là một dấu hiệu bạn đang đi đúng hướng.'
  },
  lack_progress: {
    label: 'Chưa thấy tiến bộ',
    focus: 'kiểm soát cảm giác “không đi được” bằng các dấu hiệu tiến bộ rõ ràng',
    action: 'đánh dấu 1 điểm tiến bộ mỗi buổi, nhìn lại tiến độ theo tuần thay vì cả quãng đường dài',
    tone: 'động viên, giúp định hướng lại nhịp, không chê trách',
    title: 'Tái lập tiến độ bằng mục tiêu nhỏ',
    body: 'Nỗi lo vì chưa thấy tiến bộ là điều rất bình thường. Thay vì nhìn cả quãng đường dài, hãy hỏi: “Tuần này mình đã làm được gì đáng kể?” Hãy xác định một điểm tiến bộ rõ ràng mỗi buổi và ghi lại nó. Khi bạn nhìn thấy tiến bộ rõ ràng, cảm giác mất động lực sẽ dễ giảm xuống.'
  },
  no_companion: {
    label: 'Thiếu người đồng hành',
    focus: 'đưa thêm sự hỗ trợ và nhắc nhở định kỳ để giảm cảm giác cô lập',
    action: 'gọi thêm 1 người đồng hành, đặt mốc kiểm tra tiến độ 2–3 ngày, ưu tiên một lời nhắc ngắn thay vì một kế hoạch quá lớn',
    tone: 'ấm áp, xã hội hóa động lực, không cảm giác bị bỏ mặc',
    title: 'Tạo nhịp đồng hành và kiểm tra tiến độ',
    body: 'Mất động lực dễ xảy ra khi bạn học một mình. Hãy tìm 1 người đồng hành, dù là bạn học, phụ huynh, hoặc mentor, để cùng theo dõi tiến độ trong 2–3 ngày. Một lời nhắc ngắn và một tiến độ nhỏ đều có thể giúp bạn quay lại nhịp học và bớt cảm giác cô lập.'
  },
  change_goal: {
    label: 'Muốn đổi mục tiêu',
    focus: 'giúp học sinh điều chỉnh mục tiêu theo thực tế mà vẫn giữ động lực',
    action: 'giảm phạm vi mục tiêu trong lúc này, giữ hướng đi nhưng chọn một mục tiêu vừa đủ để làm được trước',
    tone: 'thấu hiểu, không định kiến, nhấn mạnh điều chỉnh là hành động khôn ngoan',
    title: 'Điều chỉnh mục tiêu cho phù hợp thực tế',
    body: 'Nếu mục tiêu hiện tại quá rộng hoặc không còn phù hợp với giai đoạn này, bạn hoàn toàn có thể giảm nhẹ nó để giữ nhịp. Chọn một mục tiêu vừa đủ để làm được và vẫn giữ được hướng đi, rồi gia tăng dần khi cảm giác ổn định trở lại. Điều chỉnh mục tiêu không phải là bỏ cuộc; đó là cách giữ động lực sống sót và bền vững.'
  }
};

function normalizeSupportText(value: string) {
  return value
    .replace(/```json|```/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildFallbackDraft({ barrier, sourceCitation }: { barrier: string; sourceCitation?: string }) {
  const profile = barrierProfiles[barrier] || barrierProfiles.fatigue_overload;
  const sourceLine = sourceCitation ? `\n\nNền tảng khoa học: ${sourceCitation}` : '';

  return {
    title: profile.title,
    body: `${profile.body}${sourceLine}`
  };
}

export async function generateSupportDraft(request: SupportDraftRequest): Promise<SupportDraftResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  const profile = barrierProfiles[request.barrier] || barrierProfiles.fatigue_overload;

  if (!apiKey) {
    return buildFallbackDraft({
      barrier: request.barrier,
      sourceCitation: request.sourceCitation
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Bạn là chuyên gia tâm lý học và hỗ trợ học tập. Viết 1 thông điệp ngắn, ấm áp, rõ ràng và thực tế cho học sinh đang gặp khó khăn trong việc duy trì kế hoạch học tập.

Rào cản cần xử lý: ${profile.label}
Mục tiêu chính: ${profile.focus}
Cách hành động nên nhấn mạnh: ${profile.action}
Tông giọng nên có: ${profile.tone}
Nguồn khoa học: ${request.sourceCitation || 'không có'}
Mức độ chứng cứ: ${request.evidenceLevel || 'design_principle'}
Bối cảnh học sinh: ${request.studentContext || 'cần duy trì nhịp học đều đặn'}

Yêu cầu:
- Viết bằng tiếng Việt tự nhiên, thân thiện và không chê trách
- Bắt đầu bằng động viên ngắn và tích cực
- Có 3 phần rõ ràng: động viên, hành động cụ thể, nhấn mạnh tiến bộ nhỏ
- Giữ khoảng 90-150 từ
- Không hứa chắc chắn thành công
- Không dùng ngôn ngữ đe dọa, chê bai hoặc quá lời
- Trả về JSON thuần: { "title": "...", "body": "..." }
- Chỉ trả về JSON, không giải thích thêm.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = typeof (response as any)?.text === 'string'
      ? (response as any).text
      : (response as any)?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part.text ?? '')
          .join('') || '';

    const clean = normalizeSupportText(text);
    if (!clean) {
      return buildFallbackDraft({ barrier: request.barrier, sourceCitation: request.sourceCitation });
    }

    const jsonStart = clean.indexOf('{');
    const jsonEnd = clean.lastIndexOf('}');
    const payloadText = jsonStart >= 0 && jsonEnd > jsonStart ? clean.slice(jsonStart, jsonEnd + 1) : clean;

    try {
      const payload = JSON.parse(payloadText) as Partial<SupportDraftResult>;
      if (payload.title && payload.body) {
        return {
          title: String(payload.title).trim().slice(0, 120),
          body: String(payload.body).trim().slice(0, 400)
        };
      }
    } catch {
      // fallback to structured template below
    }

    return buildFallbackDraft({ barrier: request.barrier, sourceCitation: request.sourceCitation });
  } catch {
    return buildFallbackDraft({ barrier: request.barrier, sourceCitation: request.sourceCitation });
  }
}
