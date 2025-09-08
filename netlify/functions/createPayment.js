// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    const POSKEY = process.env.BARION_POSKEY;
    if (!POSKEY) {
      console.error("Hiányzó BARION_POSKEY!");
      return { statusCode: 500, body: "Barion POSKEY nincs beállítva." };
    }

    const body = JSON.parse(event.body || "{}");
    console.log("Request body:", body);

    // Alap adatok a fizetéshez
    const payload = {
      POSKey: POSKEY,
      Payee: "tanulovagyokhatna@gmail.com", // <- a sandbox elfogadó email
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: "tanulovagyokhatna@gmail.com", // kötelező ide is
          Total: body.amount || 999
        }
      ]
    };

    console.log("Barion payload:", payload);

    // Sandbox API hívás
    const resp = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log("Barion response:", data);

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.GatewayUrl || null, data })
    };
  } catch (err) {
    console.error("Hiba a createPayment-ben:", err);
    return { statusCode: 500, body: "Szerverhiba: " + err.message };
  }
}
