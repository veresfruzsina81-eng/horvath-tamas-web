// Netlify Function – Barion Sandbox fizetés indítása
// FONTOS: a Netlifyban állítsd be ezeket az env változókat:
//  BARION_POSKEY        -> a "Titkos azonosító (POSKey)"
//  BARION_PAYEE_EMAIL   -> a sandbox tárca (elfogadóhely) e-mail címe
//
// Opcionális, de nem kötelező:
//  BARION_POSGUID       -> Publikus azonosító (POSGuid) – csak logoljuk

exports.handler = async (event) => {
  // Egyszerű healthcheck GET-re
  if (event.httpMethod === "GET") {
    const ok = !!process.env.BARION_POSKEY;
    return {
      statusCode: 200,
      body: JSON.stringify({ ok, message: ok ? "POSKEY elérhető" : "Hiányzik a POSKEY" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Csak POST engedélyezett" }) };
  }

  // --- ENV ---
  const POSKEY = process.env.BARION_POSKEY;
  const PAYEE_EMAIL = process.env.BARION_PAYEE_EMAIL || "tanulovagyokhatna@gmail.com"; // sandbox e-mail
  const POSGUID = process.env.BARION_POSGUID || "";

  if (!POSKEY || !PAYEE_EMAIL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Hiányzik a BARION_POSKEY vagy a BARION_PAYEE_EMAIL a Netlify környezetben." }),
    };
  }

  // --- KLIENS KÉRÉS ---
  let amount = 999;
  let items = null;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (body && Number.isFinite(body.amount)) amount = Math.max(1, Math.floor(body.amount));
    if (Array.isArray(body.items)) items = body.items;
  } catch (_) {}

  // --- BARION PAYLOAD ---
  const now = Date.now().toString();
  const orderId = `demo-${now}`;
  const trxId = `demo-${now}`;

  const payload = {
    POSKey: POSKEY,
    PaymentType: "Immediate",
    GuestCheckout: true,
    FundingSources: ["All"],       // Sandboxban mindegy
    Currency: "HUF",
    Locale: "hu-HU",
    PaymentRequestId: orderId,
    PayerHint: PAYEE_EMAIL,        // sandboxban elfogadható
    RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
    CallbackUrl: "https://horvath-tamas-web.netlify.app/.netlify/functions/createPayment", // minta
    Transactions: [
      {
        POSTransactionId: trxId,
        Payee: PAYEE_EMAIL,        // NEM a POSKey/Guid! -> a Barion (sandbox) tárca e-mail címe
        Total: amount,
        Items: items && items.length
          ? items
          : [
              {
                Name: "Demo termék",
                Description: "Sandbox vásárlás – illusztráció",
                Quantity: 1,
                Unit: "db",
                UnitPrice: amount,
                ItemTotal: amount,
              },
            ],
      },
    ],
  };

  // --- KÜLDÉS A BARION SANDBOXBA ---
  const url = "https://api.test.barion.com/v2/Payment/Start";
  try {
    console.log("== createPayment START ==");
    console.log("POSGUID:", POSGUID ? POSGUID : "(nincs megadva)");
    console.log("Payee (email):", PAYEE_EMAIL);
    console.log("Küldött összeg:", amount);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));
    console.log("Barion status:", resp.status, "body:", data);

    // Siker esetén Barion GatewayUrl-t ad vissza (erre kell átirányítani)
    if (resp.ok && data && data.GatewayUrl) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          gatewayUrl: data.GatewayUrl,
          paymentId: data.PaymentId || null,
        }),
      };
    }

    // Ha Barion hibát ad
    const errors = data && data.Errors ? data.Errors : [];
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        message: "Barion API hiba",
        errors,
      }),
    };
  } catch (err) {
    console.error("Hiba a Barion hívásnál:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: "Szerver hiba", error: String(err && err.message || err) }),
    };
  }
};
