// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    // 🔑 környezeti változók
    const POSKEY = process.env.BARION_POSKEY;
    const POSGUID = process.env.BARION_POSGUID; // ha kell a jövőben
    console.log("POSKEY:", POSKEY ? "OK" : "HIÁNYZIK");

    if (!POSKEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Nincs beállítva a BARION_POSKEY" })
      };
    }

    // 💳 fizetési adatok
    const paymentData = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: "tanulovagyokhatna@gmail.com", // Barion fiók e-mail
          Total: 999
        }
      ]
    };

    console.log("Request body:", paymentData);

    // 🔗 Barion Sandbox API hívás
    const response = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    console.log("Barion response:", result);

    // ✅ választ mindig adjunk vissza!
    return {
      statusCode: response.status,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Hiba a createPayment-ben:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
