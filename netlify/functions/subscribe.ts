import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const subscription = await req.json();
    const store = getStore("push-subscriptions");
    await store.setJSON("device_primary", subscription);

    return new Response(JSON.stringify({ message: "Saved successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to store" }), { status: 500 });
  }
};
