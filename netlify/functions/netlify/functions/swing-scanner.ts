import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { GoogleGenAI, Type } from "@google/genai";

webpush.setVapidDetails(
  "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ASSETS = ["XAU/USD", "EUR/USD", "BTC/USD"];

const signalSchema = {
  type: Type.OBJECT,
  properties: {
    symbol: { type: Type.STRING },
    signal: { type: Type.STRING },
    confidence_score: { type: Type.INTEGER },
    reasoning: { type: Type.STRING }
  },
  required: ["symbol", "signal", "confidence_score", "reasoning"]
};

export default async () => {
  try {
    const store = getStore("push-subscriptions");
    const subscription = await store.getJSON("device_primary");
    if (!subscription) return;

    for (const symbol of ASSETS) {
      const res = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=4h&outputsize=30&apikey=${process.env.TWELVE_DATA_API_KEY}`
      );
      const data = await res.json();
      if (!data.values) continue;

      const prices = data.values.map((v: any) => parseFloat(v.close)).reverse();
      const currentPrice = prices[prices.length - 1];

      const prompt = `Analyze market for ${symbol}. Current Price: ${currentPrice}. Last 5 closes: ${prices.slice(-5).join(", ")}. Return strict JSON evaluation with confidence_score (0-100).`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: signalSchema,
          temperature: 0.2
        }
      });

      const result = JSON.parse(response.text!);

      if (result.confidence_score >= 70 && result.signal !== "NEUTRAL") {
        const payload = JSON.stringify({
          title: `🔥 70%+ SWING SIGNAL: ${symbol}`,
          body: `${result.reasoning} (Score: ${result.confidence_score}%)`,
          url: "/"
        });

        await webpush.sendNotification(subscription as any, payload);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

export const config: Config = {
  schedule: "0 */4 * * *",
};
