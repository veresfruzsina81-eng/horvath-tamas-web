// netlify/functions/createPayment.js
import fetch from "node-fetch";

export const handler = async (event) => {
  const POSKEY = process.env.BARION_POSKEY; // <- Netlify env
  const PAYEE_EMAIL = "tanulovagyokhatna@gmail.com"; // Sandbox pénztárca e-mail

  // Gyors egészség-ellenőrzés GET-re
  if (event.httpMethod === "GET") {
    const ok = Boolean(POSKEY && POSKEY.length > 20);
    console.log("HEALTHCHECK -> POSKEY present:", ok);
    return {
      statusCode: ok ? 200 : 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok, message: ok ? "POSKEY elérhető" : "Hiányzó BARION_POSKEY" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { amount } = JSON.parse(event.body || "{}");
    const total = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 999;

    if (!POSKEY) {
      console.error("HIBA: Nincs BARION_POSKEY beállítva!");
      return { statusCode: 500, body: "Szerver beállítási hiba (POSKEY hiányzik)" };
    }

    const payload = {
      POSKey: POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],

      // legalább 1 tranzakció kell
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: PAYEE_EMAIL, // a sandbox fiókod e-mailje
          Total: total,
        },
      ],

      // Hova térjen vissza siker/hiba után (sandboxban is mehet a netlify oldaladra)
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",

      // Opcionális: értesítés (most nem kötelező, lehet üres is)
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
    };

    console.log("== createPayment START ==");
    console.log("POSKEY present:", !!POSKEY, " total:", total);

    const res = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    console.log("Barion status:", res.status);
    if (data?.Errors) console.log("Barion Errors:", data.Errors);

    if (!res.ok || data.Errors?.length) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          message: "Barion hiba",
          status: res.status,
          errors: data.Errors || [],
        }),
      };
    }

    // Siker: a Barion visszaad egy PaymentId-t és egy GuestUrl-t (erre kell átirányítani)
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        paymentId: data.PaymentId,
        guestUrl: data.GuestUrl,
      }),
    };
  } catch (err) {
    console.error("createPayment Exception:", err);
    return { statusCode: 500, body: "Szerver hiba" };
  }
};
