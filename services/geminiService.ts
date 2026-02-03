import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceAddressWithAI = async (rawAddress: string, district: string): Promise<string> => {
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