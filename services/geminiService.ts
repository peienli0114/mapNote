import { Coordinates, SuggestionResult } from "../types";

// 此版本已移除 Gemini API 依賴，僅保留介面以相容舊程式碼結構
export const getGeminiSuggestion = async (
  coords: Coordinates,
  userQuery?: string
): Promise<SuggestionResult> => {
  // 模擬延遲
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    text: "此靜態版本未啟用 AI 功能。",
    groundingUrls: []
  };
};