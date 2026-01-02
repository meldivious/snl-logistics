
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface MarketRateResult {
  estimatedPrice?: number;
  currency: string;
  summary: string;
  sources: { title: string; uri: string }[];
}

export const getLogisticsAdvice = async (destination: string, weight: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide one short sentence of advice for a ${weight}kg parcel to ${destination}. Do not use headers or bold text.`,
    });
    return response.text?.trim() || "Ensure items are properly packed for customs.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Standard shipping regulations apply.";
  }
};

export const lookupPostalCode = async (city: string, state: string, country: string): Promise<string> => {
  if (!city || !country) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `What is a common postal code for ${city}, ${state} in ${country}? Respond with ONLY the postal code string. If none exists, respond with a valid placeholder for that region.`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Postal Lookup Error:", error);
    return "";
  }
};

export const fetchLiveMarketRate = async (destination: string, weight: number): Promise<MarketRateResult> => {
  try {
    const prompt = `Find the estimated standard retail DHL price for ${weight}kg from Lagos to ${destination}. Provide the price in NGN and a one-sentence market summary. ABSOLUTELY NO HEADERS, NO BOLD TEXT, NO BULLET POINTS. Just plain text.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "";
    text = text.replace(/#+\s?/g, '').replace(/\*+/g, '').replace(/^- /gm, '').trim();

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Shipping Source",
        uri: chunk.web?.uri || ""
      }));

    const priceMatch = text.match(/(?:NGN|₦|Naira)\s?([\d,]+)/i);
    const estimatedPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : undefined;

    return {
      estimatedPrice,
      currency: 'NGN',
      summary: text,
      sources: sources.slice(0, 2)
    };
  } catch (error) {
    console.error("Live Rate Error:", error);
    return {
      currency: 'NGN',
      summary: "Live market data unavailable.",
      sources: []
    };
  }
};
