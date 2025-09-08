// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.log("=== createPayment START ===");

  try {
    const POSKEY = process.env.BARION_POSKEY;
    const POSGUID = process.env.BARION_POSGUID;

    if (!POSKEY || !POSGUID) {
      throw new Error("BARION_POSKEY vagy BARION_POSGUID nincs beállítva!");
    }

    // 🔹 Sandbox teszt vevő e-mail
    const payerEmail = "sandbox-buyer@barion.com";

    // Kifizetendő összeg (teszt)
    const amount = 999;

    const body = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      PaymentRequestId: "demo-" + Date.now(),
      PayerHint: payerEmail,
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: payerEmail, // itt is teszt email
          Total: amount,
          Comment: "Teszt vásárlás (sandbox)"
        }
      ]
    };

    console.log("Barion payload:", body);

    const response = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log("Barion response status:", response.status);
    console.log("Barion response body:", result);

    if (!response.ok) {
      throw new Error("Barion API hiba: " + JSON.stringify(result));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        paymentId: result.PaymentId,
        gatewayUrl: result.GatewayUrl
      })
    };

  } catch (err) {
    console.error("Hiba:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
}
