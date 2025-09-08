// netlify/functions/createPayment.js
import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const { amount = 999 } = JSON.parse(event.body || "{}");

    const POSKEY  = process.env.BARION_POSKEY;   // Titkos azonosító (hosszú, nem f-fel kezd)
    const POSGUID = process.env.BARION_POSGUID;  // Publikus azonosító (f-fel kezd)

    if (!POSKEY || !POSGUID) {
      console.error("Missing env", { hasPosKey: !!POSKEY, hasPosGuid: !!POSGUID });
      return resp(500, { ok: false, error: "Hiányzó Barion env változók" });
    }

    // csak logoljuk, hogy tényleg a GUID megy be (első 8 karakter)
    console.log("createPayment start", { POSGUID: POSGUID.slice(0, 8), amount });

    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      PaymentRequestId: "demo-" + Date.now(),
      GuestCheckOut: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/.netlify/functions/barionWebhook",
      Transactions: [
        {
          Payee: POSGUID,           // ← EZ ITT A LÉNYEG!
          Total: Number(amount)
        }
      ]
    };

    const r = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    console.log("barion status:", r.status, "errors:", data?.Errors);

    if (!r.ok) {
      return resp(400, { ok: false, error: "Barion API hiba", details: data?.Errors || data });
    }

    // siker: visszaadjuk a fizetési URL-t
    return resp(200, { ok: true, paymentId: data.PaymentId, paymentUrl: data.GatewayUrl });
  } catch (e) {
    console.error("exception", e);
    return resp(500, { ok: false, error: "Szerver hiba", details: String(e) });
  }
};

function resp(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
