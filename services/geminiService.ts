
import { GoogleGenAI } from "@google/genai";
import { Entity } from "../types";

// Removed global initialization to ensure the most up-to-date API key is used inside functions
// as per the requirement for models that may require user-selected keys.

export async function getDailyRecommendations(entities: Entity[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this set of personal operating system data for a high-leverage builder.
    Recommend "What to Build Today" based on:
    1. High-priority knowledge/ideas that haven't been acted upon.
    2. Overdue or high-priority client tasks.
    3. Active gig opportunities (Discovery jobs marked as High priority).
    4. Resurfacing "stagnant" knowledge.

    Data: ${JSON.stringify(entities.slice(0, 50))}

    Return a JSON object:
    {
      "recommendation": "A concise, high-leverage suggestion",
      "rationale": "One sentence explanation",
      "actionItems": ["Task 1", "Task 2"],
      "focusChecklist": ["Daily Protocol Item 1", "Daily Protocol Item 2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini failed:", error);
    return null;
  }
}

export async function scoutJobDetails(url: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Extract Job Role, Company/Platform, estimated Pay Range, and required skills (tags) from this URL: ${url}. 
  If it is an AI training gig, note specifically if it is coding or writing.
  Return JSON: {"role": string, "company": string, "payRange": string, "confidence": number (1-5), "tags": string[]}`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return null;
  }
}
