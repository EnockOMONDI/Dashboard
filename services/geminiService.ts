
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

export async function generateTaskStrategy(title: string, notes: string, existingTools: string[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are a Senior Project Manager and Strategic Systems Thinker.
    Analyze the following task and notes to create a high-leverage execution strategy.

    Task Title: ${title}
    Rough Notes: ${notes}
    Existing Tools in Knowledge Brain: ${existingTools.join(", ")}

    Your goal is to:
    1. Refine the title for maximum clarity and impact.
    2. Define a clear Strategic Objective (The "Why").
    3. Define a Success Metric (How to know it's "Done-Done").
    4. Expand the notes into a professional, structured project brief.
    5. Generate up to 10 actionable subtasks (The "Roadmap").
    6. Suggest tools that are best suited for this job. 
       - If a tool exists in the Knowledge Brain, flag it as "existing".
       - If it's a new suggestion, flag it as "new".
       - Provide a brief description for new tools.

    Return a JSON object:
    {
      "refinedTitle": "string",
      "strategicObjective": "string",
      "successMetric": "string",
      "expandedNotes": "string (Markdown formatted)",
      "subtasks": [
        { "title": "string", "status": "Todo" }
      ],
      "suggestedTools": [
        { "name": "string", "type": "existing" | "new", "description": "string" }
      ]
    }

    CRITICAL: You MUST always return at least 5-10 actionable subtasks in the "subtasks" array. Do not return an empty array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    
    const text = response.text;
    if (!text) return null;
    
    // Clean up response text in case of markdown blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("generateTaskStrategy failed:", error);
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
