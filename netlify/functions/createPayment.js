// netlify/functions/createPayment.js
import fetch from "node-fetch"; // kötelező a node-fetch

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    const body = JSON.parse(event.body);
    const posKey = process.env.BARION_POSKEY;
    const payee = process.env.BARION_PAYEE;

    const paymentRequest = {
      POSKey: posKey,
      Payee: payee,
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: payee,
          Total: body.amount || 999
        }
      ],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback"
    };

    console.log("Request body:", JSON.stringify(paymentRequest, null, 2));

    const response = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentRequest)
    });

    const data = await response.json();
    console.log("Barion response:", data);

    if (data.GatewayUrl) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, url: data.GatewayUrl })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: data })
      };
    }
  } catch (err) {
    console.error("ERROR:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
