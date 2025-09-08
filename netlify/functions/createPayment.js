// netlify/functions/createPayment.js
import fetch from "node-fetch";

export const handler = async (event) => {
  // egyszerű health-check
  if (event.httpMethod === "GET") {
    return resp(200, { ok: true, message: "POSKEY elérhető?" , hasKey: !!process.env.BARION_POSKEY });
  }

  if (event.httpMethod !== "POST") {
    return resp(405, { error: "Method Not Allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const amount = Number(body.amount || 999); // Ft

    const POSKEY = process.env.BARION_POSKEY;        // Titkos azonosító (POSKey)
    // *** IDE FIXEN A SANDBOX FIAK E-MAILJE ***
    const PAYEE_EMAIL = "tanulovagyokhatna@gmail.com";

    if (!POSKEY) return resp(500, { error: "Nincs BARION_POSKEY beállítva" });

    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: PAYEE_EMAIL,         // <- EZ A LÉNYEG
          Total: amount
        }
      ],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://example.com/barion-callback" // demo
    };

    // Sandbox endpoint
    const res = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.GatewayUrl) {
      // siker: visszaadjuk az átirányítási URL-t
      return resp(200, { ok: true, redirectUrl: data.GatewayUrl, paymentId: data.PaymentId });
    }

    // hiba a Bariontól
    return resp(400, {
      ok: false,
      error: "Barion hiba",
      status: res.status,
      errors: data.Errors || []
    });

  } catch (e) {
    return resp(500, { ok: false, error: e.message });
  }
};

// segédfüggvény
function resp(status, json) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
  };
}
