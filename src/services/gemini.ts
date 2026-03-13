import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PredictionResult {
  totalCapacityMl: number;
  currentVolumeMl: number;
  shotsLeft: number;
  confidenceScore: number;
  explanation: string;
  isBottleDetected: boolean;
  errorMessage?: string;
}

export async function predictShots(base64Image: string): Promise<PredictionResult> {
  const model = "gemini-3-flash-preview";
  
  // Fetch recent feedback to "fine-tune" the prompt
  let feedbackContext = "";
  try {
    const response = await fetch("/api/feedback/recent");
    if (response.ok) {
      const recentFeedback = await response.json();
      if (recentFeedback.length > 0) {
        feedbackContext = "\n\nPAST CORRECTIONS (Learn from these mistakes):\n" + 
          recentFeedback.map((f: any) => {
            const pred = JSON.parse(f.prediction_json);
            return `- Predicted ${pred.shotsLeft} shots, but user said ${f.actual_shots} shots. Reason: ${f.user_comment || 'N/A'}`;
          }).join("\n");
      }
    }
  } catch (e) {
    console.warn("Could not fetch feedback context", e);
  }

  const prompt = `Analyze this image of a water bottle. 
  1. Detect if there is a water bottle or similar liquid container in the image.
  2. If a bottle is detected:
     - Estimate the total capacity of the bottle in milliliters (ml).
     - Estimate the current volume of liquid inside in milliliters (ml).
     - Calculate how many 'shots' are left (1 shot = 25ml).
  3. If no bottle is detected, or if the image is too blurry/dark to see the liquid level, set isBottleDetected to false and provide a helpful errorMessage.
  
  Be as precise as possible based on the bottle's shape, size relative to surroundings, and the liquid level.${feedbackContext}`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalCapacityMl: { type: Type.NUMBER },
          currentVolumeMl: { type: Type.NUMBER },
          shotsLeft: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
          isBottleDetected: { type: Type.BOOLEAN },
          errorMessage: { type: Type.STRING },
        },
        required: ["totalCapacityMl", "currentVolumeMl", "shotsLeft", "confidenceScore", "explanation", "isBottleDetected"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze the image. Please try again.");
  }
}
