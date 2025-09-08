// netlify/functions/createPayment.js

export async function handler(event) {
  console.log("=== createPayment start ===");

  try {
    const { amount } = JSON.parse(event.body);

    const resp = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        POSKey: process.env.BARION_POSKEY,
        PaymentType: "Immediate",
        GuestCheckOut: true,
        FundingSources: ["All"],
        Currency: "HUF",
        RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
        Transactions: [
          {
            POSTransactionId: "demo-" + Date.now(),
            Payee: "tanulovagyokhatna@gmail.com",   // a sandbox fiók email címe
            Total: amount || 1000,
            Items: [
              {
                Name: "Demo termék",
                Description: "Teszt vásárlás",
                Quantity: 1,
                Unit: "db",
                UnitPrice: amount || 1000,
                ItemTotal: amount || 1000
              }
            ]
          }
        ]
      })
    });

    const data = await resp.json();
    console.log("Barion response:", data);

    if (data.Errors && data.Errors.length) {
      return { statusCode: 400, body: JSON.stringify(data) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, url: data.GatewayUrl })
    };

  } catch (err) {
    console.error("createPayment error", err);
    return { statusCode: 500, body: "Server error" };
  }
}
