// netlify/functions/createPayment.js
import fetch from "node-fetch";

/**
 * Környezeti változók (Netlify → Site settings → Environment variables):
 * - BARION_POSKEY   : a Titkos azonosító (POSKey)  – hosszú hex string
 * - BARION_POSGUID  : a Publikus azonosító (POSGuid) – f-el kezdődő GUID
 * - BARION_PAYER    : (opcionális) a fizető email (pl. a sandbox wallet email)
 */

const BARION_API = "https://api-test.barion.com/v2/Payment/Start";

export const handler = async (event) => {
  // Egészségügyi ellenőrzés (GET)
  if (event.httpMethod === "GET") {
    const ok = !!process.env.BARION_POSKEY;
    return json({ ok, message: ok ? "POSKEY elérhető" : "Hiányzik a POSKEY" });
  }

  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const POSKEY = process.env.BARION_POSKEY;
    const POSGUID = process.env.BARION_POSGUID;
    const PAYER = process.env.BARION_PAYER || "buyer@example.com";

    if (!POSKEY || !POSGUID) {
      return json(
        { ok: false, error: "Hiányzó környezeti változók (POSKEY/POSGUID)!" },
        500
      );
    }

    // A kliens felől érkező kérés (összeg Ft-ban)
    let bodyIn = {};
    try {
      bodyIn = event.body ? JSON.parse(event.body) : {};
    } catch (_) {
      /* no-op */
    }
    const amount = Number(bodyIn.amount || 999); // Ft
    if (!Number.isFinite(amount) || amount < 1) {
      return json({ ok: false, error: "Érvénytelen összeg" }, 400);
    }

    // Netlify site origin kinyerése a host fejlécből
    const host = event.headers["x-forwarded-host"] || event.headers.host || "";
    const scheme = (event.headers["x-forwarded-proto"] || "https").split(",")[0];
    const origin = `${scheme}://${host}`;

    // Kötelező mezők + sandbox beállítások
    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      Locale: "hu-HU",
      Currency: "HUF",
      OrderNumber: `DEMO-${Date.now()}`,
      PayerHint: PAYER,
      RedirectUrl: `${origin}/thanks.html`, // sikeres visszatérés
      CallbackUrl: `${origin}/.netlify/functions/createPayment`, // (opcionális) webhook
      Transactions: [
        {
          POSTransactionId: `pos-${Date.now()}`,
          Payee: POSGUID, // Sandboxban elfogadja a POSGuid-ot
          Total: amount,
          Items: [
            {
              Name: "Teszt termék",
              Description: "Demo vásárlás (sandbox)",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amount,
              ItemTotal: amount,
            },
          ],
        },
      ],
    };

    // Kérés a Barion sandbox API-ra
    const res = await fetch(BARION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    // Barion hiba esetén
    if (!res.ok || data.Errors?.length) {
      return json(
        {
          ok: false,
          error: "Barion API hiba",
          status: res.status,
          errors: data.Errors || [],
        },
        502
      );
    }

    // Siker: átirányítási URL vissza a kliensnek
    return json({
      ok: true,
      paymentId: data.PaymentId,
      gatewayUrl: data.GatewayUrl,
    });
  } catch (err) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
};

// Segédfüggvény JSON válaszhoz
function json(obj, status = 200) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}
  // Ha sikeres a Barion válasz
  console.log("Barion response body:", data);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      message: "Barion válasz érkezett",
      response: data
    })
  };
} catch (error) {
  console.error("Hiba a Barion hívásban:", error);

  return {
    statusCode: 500,
    body: JSON.stringify({
      ok: false,
      message: "Barion hívás sikertelen",
      error: error.message
    })
  };
}
