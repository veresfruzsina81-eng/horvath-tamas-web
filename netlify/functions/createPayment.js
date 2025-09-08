// netlify/functions/createPayment.js
import fetch from "node-fetch";

/**
 * Helper: CORS headerek
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ ok: false, error: "Only POST allowed" }),
    };
  }

  // --- ENV változók ---
  const POSKEY = process.env.BARION_POSKEY;   // Titkos azonosító
  const POSGUID = process.env.BARION_POSGUID; // Publikus azonosító (Payee-hez)
  if (!POSKEY) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ ok: false, error: "Missing BARION_POSKEY env" }),
    };
  }

  // --- Bejövő adatok a kliensből ---
  // { amount: number, email?: string, cart?: [...] }
  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    // ignore
  }
  const amount = Number(payload.amount) > 0 ? Math.round(Number(payload.amount)) : 999;
  const email = (payload.email || "").toString().trim() || "demo@example.com";

  // Köszönőoldal (site URL + /thanks.html)
  const siteUrl =
    process.env.URL ||
    (event.headers && event.headers.host ? `https://${event.headers.host}` : "");
  const redirectUrl = siteUrl ? `${siteUrl}/thanks.html` : "https://example.com";

  // Tétel(ek) – ha nem jön részletes kosár, egy darab “Összesen” tétel megy
  const items =
    Array.isArray(payload.cart) && payload.cart.length
      ? payload.cart.map((it, i) => {
          const qty = Number(it.qty) > 0 ? Number(it.qty) : 1;
          const unitPrice = Math.round(Number(it.price) || 0);
          return {
            Name: (it.name || `Tétel ${i + 1}`).toString().slice(0, 50),
            Description: (it.desc || "").toString().slice(0, 200),
            Quantity: qty,
            Unit: "piece",
            UnitPrice: unitPrice,
            ItemTotal: unitPrice * qty,
          };
        })
      : [
          {
            Name: "Összesen",
            Description: "Demo rendelés",
            Quantity: 1,
            Unit: "piece",
            UnitPrice: amount,
            ItemTotal: amount,
          },
        ];

  // Tranzakció blokk (Payee = POSGUID ajánlott)
  const transaction = {
    POSTransactionId: `demo-${Date.now()}`,
    Total: amount,
    Items: items,
  };
  if (POSGUID) transaction.Payee = POSGUID;

  // Barion Payment/Start kérés
  const body = {
    POSKey: POSKEY,
    PaymentType: "Immediate",
    GuestCheckOut: true,
    FundingSources: ["All"],
    PaymentRequestId: `demo-${Date.now()}`, // kliens oldali azonosító
    PayerHint: email,
    Locale: "hu-HU",
    Currency: "HUF",
    RedirectUrl: redirectUrl,
    Transactions: [transaction],
  };

  const BARION_URL = "https://api.test.barion.com/v2/Payment/Start";

  try {
    console.log("== createPayment START ==");
    console.log("Barion payload:", JSON.stringify(body));

    const res = await fetch(BARION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    console.log("Barion response status:", res.status);
    console.log("Barion response body:", JSON.stringify(data));

    // Sikeres indítás esetén Status === "Success" és van GatewayUrl
    if (res.ok && data && data.Status === "Success" && data.GatewayUrl) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, redirectUrl: data.GatewayUrl }),
      };
    }

    // Hiba esetén Barion Errors tömböt küldi
    const errors = (data && data.Errors) || [];
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({
        ok: false,
        error: "Barion error",
        details: errors,
      }),
    };
  } catch (err) {
    console.error("Barion exception:", err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ ok: false, error: err.message || "Unknown error" }),
    };
  }
}
