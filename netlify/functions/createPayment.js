// netlify/functions/createPayment.js
import fetch from "node-fetch";

export const handler = async (event) => {
  console.log("=== createPayment start ===");

  try {
    const BARION_POSKEY = process.env.BARION_POSKEY;
    const BARION_POSGUID = process.env.BARION_POSGUID;

    if (!BARION_POSKEY || !BARION_POSGUID) {
      throw new Error("Hiányzik a BARION_POSKEY vagy BARION_POSGUID környezeti változó!");
    }

    const body = JSON.parse(event.body || "{}");
    const amount = body.amount || 999; // alapértelmezett teszt összeg

    const payload = {
      POSKey: BARION_POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,
      FundingSources: ["All"],
      PaymentRequestId: "demo-" + Date.now(),
      PayerHint: "tanulovagyokhatna@gmail.com", // sandbox email
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
      Transactions: [
        {
          POSTransactionId: "demo-" + Date.now(),
          Payee: BARION_POSGUID, // ide kerül a Publicus azonosító (POSGuid)
          Total: amount,
          Items: [
            {
              Name: "Teszt termék",
              Description: "Sandbox teszt",
              Quantity: 1,
              Unit: "db",
              UnitPrice: amount,
              ItemTotal: amount
            }
          ]
        }
      ]
    };

    console.log("Barion payload:", payload);

    const response = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // --- extra log ---
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
};
