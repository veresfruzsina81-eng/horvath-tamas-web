// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  console.info("=== createPayment start ===");

  const posKey = process.env.BARION_POSKEY; // Titkos azonosító (POSKey)
  if (!posKey) {
    console.error("BARION_POSKEY nincs beállítva");
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: "Hiányzó BARION_POSKEY." }),
    };
  }

  // kliens felől opcionálisan jöhet amount (Ft)
  let req;
  try {
    req = JSON.parse(event.body || "{}");
  } catch {
    req = {};
  }
  const amount = Math.max(1, Number(req.amount || 0) | 0) || 999; // default: 999 Ft demo

  // --- Barion Payment/Start payload ---
  const paymentRequest = {
    POSKey: posKey,
    PaymentType: "Immediate",
    GuestCheckout: true,
    FundingSources: ["All"],
    Locale: "hu-HU",
    Currency: "HUF",
    PaymentRequestId: "demo-" + Date.now(),
    PayerHint: "tanulovagyokhatna@gmail.com",

    // VISSZAIRÁNYÍTÁS (siker/megállás után)
    RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",

    // EGY tranzakció – itt kell a PAYEE = Publikus azonosító (POSGuid)
    Transactions: [
      {
        POSTransactionId: "demo-" + Date.now(),
        // !!! IDE A PUBLIKUS AZONOSÍTÓ (POSGuid)
        Payee: "fa2b28b6-5985-4d7e-bd02-de31c40fe36d",
        Total: amount, // összeg Ft-ban
        Comment: "DemoShop rendelés (sandbox)"
      },
    ],
  };

  // Sandbox endpoint:
  const url = "https://api.test.barion.com/v2/Payment/Start";

  try {
    console.info("Barion payload:", {
      POSKey: "[OK]",
      Payee: paymentRequest.Transactions[0].Payee,
      Total: amount,
    });

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(paymentRequest),
    });

    let data = {};
    try {
      data = await resp.json();
    } catch (e) {
      console.error("JSON parse hiba:", e);
    }

    console.info("Barion response status:", resp.status);
    if (data?.Errors?.length) console.error("Barion Errors:", data.Errors);

    if (!resp.ok || data?.Errors?.length) {
      const firstErr = data?.Errors?.[0];
      return {
        statusCode: 502,
        body: JSON.stringify({
          ok: false,
          message:
            firstErr?.Description ||
            "A Barion visszautasította a kérést (sandbox).",
          errors: data?.Errors || [],
        }),
      };
    }

    // Siker – visszaadjuk a GatewayUrl-t
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        paymentId: data.PaymentId,
        status: data.Status,
        gatewayUrl: data.GatewayUrl,
      }),
    };
  } catch (err) {
    console.error("createPayment kivétel:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: "Szerverhiba a fizetés indításakor.",
      }),
    };
  }
}
