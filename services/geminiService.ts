import { GoogleGenAI } from "@google/genai";
import { Coordinates, SuggestionResult } from "../types";

const apiKey = process.env.API_KEY || '';

export const getGeminiSuggestion = async (
  coords: Coordinates,
  userQuery?: string
): Promise<SuggestionResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = userQuery 
    ? `使用者正在位置 (${coords.lat}, ${coords.lng})。他們想知道："${userQuery}"。請提供簡短有用的建議，這將作為備忘錄的內容。`
    : `我正在位置 (${coords.lat}, ${coords.lng})。請告訴我這裡有什麼特別之處、著名地標或推薦的活動？請簡短總結，適合作為提醒事項。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
            retrievalConfig: {
                latLng: {
                    latitude: coords.lat,
                    longitude: coords.lng
                }
            }
        }
      },
    });

    const text = response.text || "無法取得建議。";
    
    // Extract grounding URLs if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingUrls = groundingChunks
      .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
      .map((chunk: any) => ({
        uri: chunk.web?.uri || chunk.maps?.uri,
        title: chunk.web?.title || chunk.maps?.title || "相關連結"
      }));

    return {
      text,
      groundingUrls
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
        text: "暫時無法使用 AI 建議功能，請稍後再試。",
        groundingUrls: []
    };
  }
};
