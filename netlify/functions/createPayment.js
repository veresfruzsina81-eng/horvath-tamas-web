// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    const BARION_POSKEY = process.env.BARION_POSKEY;
    if (!BARION_POSKEY) {
      throw new Error("Hiányzik a BARION_POSKEY környezeti változó!");
    }

    const { amount } = JSON.parse(event.body || "{}");
    console.log("Request body:", event.body);

    // Barion API payload
    const payload = {
      POSKey: BARION_POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      PaymentRequestId: "demo-" + Date.now(),
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/.netlify/functions/createPayment-callback",
      Transactions: [
        {
          POSTransactionId: "tr-" + Date.now(),
          Payee: "tanulovagyokhatna@gmail.com",   // <- KÖTELEZŐ
          Total: amount || 999,
          Items: [
            {
              Name: "Demo termék",
              Description: "Teszt vásárlás",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amount || 999,
              ItemTotal: amount || 999
            }
          ]
        }
      ]
    };

    console.log("Barion payload:", JSON.stringify(payload, null, 2));

    const resp = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log("Barion response:", JSON.stringify(data, null, 2));

    if (!resp.ok || data.Errors?.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.Errors || data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentUrl: data.GatewayUrl })
    };
  } catch (err) {
    console.error("Hiba:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
