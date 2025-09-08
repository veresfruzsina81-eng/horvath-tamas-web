// netlify/functions/createPayment.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const BARION_POSKEY = process.env.BARION_POSKEY;

    // Kosár tartalom (demo példa)
    const items = [
      {
        Name: "Demo termék",
        Description: "Teszt vásárlás",
        Quantity: 1,
        Unit: "db",
        UnitPrice: 1000,
        ItemTotal: 1000,
      },
    ];

    const body = {
      POSKey: BARION_POSKEY,
      PaymentType: "Immediate",
      GuestCheckout: true,
      FundingSources: ["All"],
      PaymentRequestId: "demo-" + Date.now(),
      PayerHint: "teszt@teszt.hu",
      Transactions: [
        {
          POSTransactionId: "trans-" + Date.now(),
          Payee: "tesztshop@example.com", // ide majd a saját Barion email címed
          Total: 1000,
          Items: items,
        },
      ],
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      CallbackUrl: "https://horvath-tamas-web.netlify.app/api/barion-callback",
      Locale: "hu-HU",
      Currency: "HUF",
    };

    const response = await fetch(
      "https://api.test.barion.com/v2/Payment/Start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
