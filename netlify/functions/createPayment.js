// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    console.log("=== createPayment START ===");

    const POSKEY = process.env.BARION_POSKEY;
    const POSGUID = process.env.BARION_POSGUID;

    if (!POSKEY || !POSGUID) {
      throw new Error("POSKEY vagy POSGUID hiányzik a Netlify environment variables közül!");
    }

    const body = JSON.parse(event.body || "{}");
    const amount = body.amount || 999;

    const paymentData = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: "", // <- ezt teljesen kivesszük vagy üresen hagyjuk
          Total: amount,
          Items: [
            {
              Name: "Teszt termék",
              Description: "Demo vásárlás",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amount,
              ItemTotal: amount
            }
          ]
        }
      ],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/.netlify/functions/createPayment"
    };

    console.log("Barion payload:", paymentData);

    const response = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();
    console.log("Barion response:", result);

    if (!response.ok) {
      throw new Error(`Barion API hiba: ${JSON.stringify(result)}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, paymentUrl: result.GatewayUrl }),
    };

  } catch (err) {
    console.error("Hiba:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
}
