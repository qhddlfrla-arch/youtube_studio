
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, VisualStyle, CharacterProfile } from "../types";

export const refineScriptForYoutube = async (script: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `당신은 베테랑 유튜브 크리에이터이자 정책 전문가입니다. 
    다음 대본을 검토하여 유튜브 커뮤니티 가이드라인을 준수하도록 순화하고 시청 지속시간을 높일 수 있게 다듬어주세요.
    대본: ${script}`,
    config: { temperature: 0.7 }
  });
  return response.text || script;
};

export const analyzeScript = async (script: string): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `당신은 세계 최고의 영화 연출가이자 스토리보드 작가입니다. 주어진 대본을 바탕으로 "문장 단위"의 초고밀도 스토리보드를 구성하세요.

[분석 원칙 - 초고밀도 연출]
1. 문장별 매칭: 대본의 거의 모든 문장 혹은 반 문장 단위로 장면을 분할하세요. 
2. 최대 장면 생성: 대본이 충분히 길다면 최대 100개의 장면까지 생성하여 시청자가 눈을 뗄 수 없는 풍부한 볼거리를 제공해야 합니다.
3. 감정 및 동작 세분화: 인물의 말 한마디뿐만 아니라, 말을 하기 전의 망설임, 말을 마친 후의 여운, 사소한 손동작 하나까지 별도의 장면으로 구성하세요.
4. 스크립트 매칭: 각 장면이 대본의 어느 부분에 해당하는지 '시작 문장(scriptStartSentence)'과 '끝 문장(scriptEndSentence)'을 정확히 추출하세요.
5. 초정밀 Visual Prompt 생성: 이미지 생성 모델이 완벽하게 이해할 수 있도록 '영문(English)'으로 작성하세요. 
   - 필수 포함 요소: [Lighting], [Camera Angle], [Lens], [Atmosphere], [Character's detailed action and micro-expression].
6. Character Consistency: 대본 속 인물의 특징을 매 장면 프롬프트에 상세히 기술하여 일관성을 유지하세요.

핵심 인물 정보: 
- 문철수: 70대 한국 남성(Husband), 은발(Silver hair), 얇은 금테 안경(Thin gold glasses), 깊은 주름(Deep wrinkles), 인자한 눈빛.
- 박영순: 70대 한국 여성(Wife), 짧은 펌 회색 머리(Permed grey hair), 우아한 한복 혹은 단정한 앞치마, 따뜻한 미소.

대본: ${script}`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            narrative: { type: Type.STRING },
            scriptStartSentence: { type: Type.STRING, description: "해당 장면이 시작되는 대본상의 실제 문장" },
            scriptEndSentence: { type: Type.STRING, description: "해당 장면이 끝나는 대본상의 실제 문장" },
            visualPrompt: { type: Type.STRING, description: "Highly detailed English prompt including lighting, camera, and character description" },
            videoPrompt: { type: Type.STRING },
            cameraMovement: { type: Type.STRING },
            estimatedDuration: { type: Type.STRING }
          },
          required: ["sceneNumber", "title", "description", "narrative", "scriptStartSentence", "scriptEndSentence", "visualPrompt", "videoPrompt", "cameraMovement"]
        }
      }
    }
  });
  return JSON.parse(response.text.trim()) as Scene[];
};

export const generateCharacterImage = async (profile: CharacterProfile, style: VisualStyle): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const styleStr = style === 'Default' ? "Modern digital photography look, 2000s high-definition cinematic lighting, sharp focus, neutral colors" : style;
  const prompt = `${styleStr}. A centered high-quality portrait of ${profile.name}: ${profile.description}. Extremely detailed facial features, realistic skin texture, 8k resolution.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Character image failed");
};

export const generateSceneImage = async (prompt: string, style: VisualStyle, characters: CharacterProfile[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 캐릭터 일관성 강화를 위한 상세 묘사 결합
  let characterReferences = characters.map(char => 
    `Character Reference for ${char.name}: An elderly Korean person, ${char.description}.`
  ).join(" ");

  let enrichedPrompt = prompt;
  characters.forEach(char => {
    // 프롬프트 내의 이름을 실제 외모 묘사와 결합하여 치환 (일관성 유도)
    const charAppearance = `${char.name}(identical to reference: ${char.description})`;
    const regex = new RegExp(char.name, 'g');
    enrichedPrompt = enrichedPrompt.replace(regex, charAppearance);
  });

  // 'Default' 스타일을 2000년대 이후의 현대적이고 세련된 영상미로 변경
  const styleModifier = style === 'Default' 
    ? "Modern 2020s cinematic digital cinematography, sharp focus, natural daylight, sophisticated color grading, high dynamic range, photorealistic textures, 8k" 
    : style;

  // 최종 프롬프트 구성: 캐릭터 레퍼런스를 앞에 두어 모델이 인물의 외형을 먼저 인식하게 함
  const fullPrompt = `[VISUAL CONSISTENCY GUIDELINE: ${characterReferences}] Scene Description: ${enrichedPrompt}. [Art Style: ${styleModifier}]. Ensure characters' facial features and hair exactly match the references.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: fullPrompt }] },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Scene image failed");
};

export const generateSceneVideo = async (prompt: string, imageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const options: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Modern cinematic motion: ${prompt}`,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  };
  if (imageBase64) {
    options.image = { imageBytes: imageBase64.split(',')[1], mimeType: 'image/png' };
  }
  let operation = await ai.models.generateVideos(options);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
};
