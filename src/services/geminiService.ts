import { GoogleGenAI } from "@google/genai";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
}

export async function getSmartStatusUpdate(status: string, location: string) {
  const ai = getClient();
  if (!ai) return `Package is ${status.toLowerCase()} at ${location}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, professional, and reassuring status update for a package that is currently "${status}" at "${location}". Keep it under 15 words.`,
    });
    return response.text || "Status updated successfully.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Package is ${status.toLowerCase()} at ${location}.`;
  }
}

export async function getRouteInsights(stops: string[]) {
  const ai = getClient();
  if (!ai) return "Maintain steady speed for optimal fuel efficiency.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given these delivery stops: ${stops.join(", ")}, provide a very brief (1 sentence) logistical insight or optimization tip for the driver.`,
    });
    return response.text || "Route optimized for efficiency.";
  } catch (error) {
    return "Maintain steady speed for optimal fuel efficiency.";
  }
}
