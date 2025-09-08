// netlify/functions/createPayment.js
// Valódi Barion Sandbox hívás – Create Payment

const MERCHANT_EMAIL = "tanulovagyokhatna@gmail.com"; // a sandbox fiókod e-mailje
const BARION_START_URL = "https://api.test.barion.com/v2/Payment/Start";

export async function handler(event) {
  try {
    console.log("=== createPayment start ===");

    const POSKEY = process.env.BARION_POSKEY;
    if (!POSKEY) {
      console.error("❌ BARION_POSKEY hiányzik!");
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "BARION_POSKEY missing" }) };
    }
    console.log("BARION_POSKEY: OK");

    const { amount = 0 } = JSON.parse(event.body || "{}");
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid amount" }) };
    }

    // Oldalad hostja (redirect/callback URL-ekhez)
    const proto = (event.headers["x-forwarded-proto"] || "https");
    const host  = event.headers.host;
    const baseUrl = `${proto}://${host}`;

    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      OrderNumber: "DEMO-" + Date.now(),
      RedirectUrl: `${baseUrl}/thanks.html`,                // sikeres/ megszakított után ide tér vissza
      CallbackUrl: `${baseUrl}/.netlify/functions/hook`,    // opcionális (most nem kezeljük külön)
      Transactions: [
        {
          POSTransactionId: "TR-" + Date.now(),
          Payee: MERCHANT_EMAIL,       // a saját (sandbox) elfogadóhely e-mail címed
          Total: amt,
          Items: [
            {
              Name: "Webshop rendelés (demo)",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amt,
              ItemTotal: amt
            }
          ]
        }
      ]
    };

    console.log("Barion payload:", JSON.stringify(payload));

    const res = await fetch(BARION_START_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    console.log("Barion response status:", res.status);
    console.log("Barion response body:", data);

    // Siker esetén itt kapunk vissza egy GatewayUrl-t
    if (res.ok && data && data.GatewayUrl) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, gatewayUrl: data.GatewayUrl, paymentId: data.PaymentId || null })
      };
    }

    // Ha a Barion hibát adott
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        error: "Barion error",
        details: data
      })
    };

  } catch (err) {
    console.error("Hiba:", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
}
