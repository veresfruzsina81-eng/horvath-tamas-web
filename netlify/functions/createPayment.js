// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    const { amount = 999 } = JSON.parse(event.body || "{}");

    const POSKEY = process.env.BARION_POSKEY;
    if (!POSKEY) {
      throw new Error("BARION_POSKEY nincs beállítva a Netlify environment variables között.");
    }

    // A Barion fiókodhoz tartozó e-mail
    const MERCHANT_EMAIL = "tanulovagyokhatna@gmail.com";

    // Payment létrehozásához szükséges body
    const body = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      Transactions: [
        {
          POSTransactionId: "demo-1",
          Payee: MERCHANT_EMAIL, // ide az email megy, nem a POSKey!
          Total: amount
        }
      ],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback"
    };

    console.log("Request body:", body);

    // Hívás a Barion sandbox API-hoz
    const resp = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    console.log("Barion response status:", resp.status);
    console.log("Barion response body:", data);

    if (!resp.ok || data.Errors?.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.Errors || "Ismeretlen hiba" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.GatewayUrl })
    };
  } catch (err) {
    console.error("Hiba a fizetés indításakor:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
