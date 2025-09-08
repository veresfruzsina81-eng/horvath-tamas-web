// netlify/functions/createPayment.js

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    // 1) POSKEY környezeti változó (Netlify -> Settings -> Environment -> BARION_POSKEY)
    const POSKEY = process.env.BARION_POSKEY;
    if (!POSKEY) {
      console.error("Hiányzó BARION_POSKEY!");
      return { statusCode: 500, body: "Barion POSKEY nincs beállítva." };
    }

    // 2) Kliens felől kapott összeg (HUF)
    const body = JSON.parse(event.body || "{}");
    const amount = Number(body.amount || 999);
    console.log("Request body / amount:", amount);

    // 3) Barion payload (SANDBOX)
    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      // CallbackUrl lehet később, ha visszaigazolást is dolgozol fel szerveren
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          // **KÖTELEZŐ**: sandbox elfogadó email
          Payee: "tanulovagyokhatna@gmail.com",
          Total: amount
        }
      ]
    };

    console.log("Barion payload:", payload);

    // 4) Hívás a Barion SANDBOX API-ra
    const resp = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log("Barion response status:", resp.status);
    console.log("Barion response body:", data);

    if (!resp.ok) {
      // Barion hibát adott vissza – továbbküldjük a kliensnek
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data })
      };
    }

    // Siker – visszaadjuk a GatewayUrl-t a kliensnek
    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.GatewayUrl || null, data })
    };
  } catch (err) {
    console.error("Hiba a createPayment-ben:", err);
    return { statusCode: 500, body: "Szerverhiba: " + err.message };
  }
}
