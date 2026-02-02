import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// Note: In a real production app, ensure this is behind a proxy or env variable is handled securely.
const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const enhanceAddressWithAI = async (rawAddress: string, district: string): Promise<string> => {
  if (!ai) {
    console.warn("API Key missing for Gemini");
    return rawAddress;
  }

  try {
    const prompt = `
      Sen profesyonel bir veri düzenleme asistanısın.
      Aşağıdaki ham taksi durağı adresini ve ilçe bilgisini alıp, resmi, düzgün formatlanmış ve anlaşılır bir adres metnine dönüştür.
      Yazım hatalarını düzelt. Sadece adresi döndür, başka açıklama yapma.
      
      İlçe: ${district}
      Ham Adres: ${rawAddress}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || rawAddress;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return rawAddress;
  }
};

export const generateDescriptionWithAI = async (standName: string, capacity: number, district: string): Promise<string> => {
    if (!ai) return "";

    try {
        const prompt = `${district} ilçesindeki ${standName} isimli, ${capacity} araç kapasiteli taksi durağı için kısa, resmi bir tanıtım/bilgi notu yaz. 1 cümleyi geçmesin.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return "";
    }
}