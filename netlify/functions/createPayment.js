// netlify/functions/createPayment.js
// Node 18+ alatt a fetch be van építve, nem kell node-fetch.

export async function handler(event) {
  // Csak POST
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    const { amount } = JSON.parse(event.body || "{}");

    // 1) Összeg validálás (HUF, egész Ft)
    const amt = Number.isFinite(amount) ? Math.round(amount) : 0;
    if (!amt || amt < 1) {
      return json(400, { error: "Érvénytelen összeg." });
    }

    // 2) ENV változók
    const POSKEY = process.env.BARION_POSKEY;       // Sandbox POSKey
    const PAYEE  = process.env.BARION_PAYEE || "";  // Sandbox payee (e-mail/azonosító)
    const SITE   =
      process.env.SITE_URL ||
      `https://${process.env.URL || event.headers.host}`;

    if (!POSKEY) return json(500, { error: "Hiányzik a BARION_POSKEY." });
    if (!PAYEE)  return json(500, { error: "Hiányzik a BARION_PAYEE." });

    // 3) Visszairányítások
    const RedirectUrl = `${SITE}/thanks.html`;
    const CallbackUrl = `${SITE}/.netlify/functions/barionCallback`; // opcionális

    // 4) Barion StartPayment kérés (SANDBOX)
    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      Currency: "HUF",
      RedirectUrl,
      CallbackUrl,
      Locale: "hu-HU",
      OrderNumber: `DEMO-${Date.now()}`,
      Transactions: [
        {
          POSTransactionId: `TX-${Date.now()}`,
          Payee: PAYEE,
          Total: amt,
          Items: [
            {
              Name: "Webshop kosár",
              Description: "DemoShop rendelés",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amt,
              ItemTotal: amt
            }
          ]
        }
      ]
    };

    const r = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const barion = await r.json().catch(() => ({}));

    // Log a Netlify Functions logba – hibaelhárításhoz hasznos
    console.info("Barion status:", r.status, "PaymentId:", barion?.PaymentId);
    console.info("GatewayUrl:", barion?.GatewayUrl);

    if (!r.ok) {
      return json(r.status, { error: barion?.Message || "Barion hiba." });
    }
    if (!barion?.GatewayUrl) {
      return json(502, { error: "A Barion nem adott GatewayUrl-t." });
    }

    // 5) VÁLASZ: csak a lényeg
    return json(200, {
      GatewayUrl: barion.GatewayUrl,
      PaymentId: barion.PaymentId || null
    });

  } catch (err) {
    return json(500, { error: err?.message || "Ismeretlen szerverhiba." });
  }
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(obj)
  };
}
