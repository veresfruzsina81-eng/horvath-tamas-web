// netlify/functions/createPayment.js
export async function handler(event) {
  try {
    const BARION_POSKEY = process.env.BARION_POSKEY;
    if (!BARION_POSKEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "BARION_POSKEY hiányzik" }) };
    }

    // (Opcionális) frontend is küldhet majd összeget; most 1000 Ft
    const { amount = 1000 } = JSON.parse(event.body || "{}");

    const orderId = "demo-" + Date.now();

    const body = {
      POSKey: BARION_POSKEY,
      PaymentType: "Immediate",
      GuestCheckOut: true,          
      FundingSources: ["All"],
      PaymentRequestId: orderId,
      Locale: "hu-HU",
      Currency: "HUF",
      RedirectUrl: "https://horvath-tamas-web.netlify.app/thanks.html",
      Transactions: [
        {
          POSTransactionId: orderId,
          Payee: "tanulovagyokhatna@gmail.com",   // <- itt most a te sandbox címed
          Total: amount,
          Items: [
            { Name: "Webshop rendelés (demo)", Quantity: 1, Unit: "db", UnitPrice: amount, ItemTotal: amount }
          ]
        }
      ]
    };

    const res = await fetch("https://api.test.barion.com/v2/Payment/Start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    return { 
      statusCode: 200, 
      body: JSON.stringify({ gatewayUrl: data?.GatewayUrl || null, raw: data }) 
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
