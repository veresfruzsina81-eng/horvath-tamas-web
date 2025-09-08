// netlify/functions/createPayment.js
// Node 18+ (fetch beépített)

export default async function handler(req, res) {
  try {
    // csak POST-ot engedünk
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, message: 'Only POST is allowed' });
    }

    const POSKEY = process.env.BARION_POSKEY;  // Titkos kulcs (POSKey)
    if (!POSKEY) {
      return res.status(500).json({ ok: false, message: 'Hiányzik a BARION_POSKEY env változó' });
    }

    // a kliens (index.html) ezt küldi: { amount, items }
    const { amount, items } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    if (!amount || amount < 1) {
      return res.status(400).json({ ok: false, message: 'Hiányzó vagy hibás összeg' });
    }

    // --- Barion payload (Sandbox) ---
    const payload = {
      POSKey: POSKEY,                     // titkos kulcs (env)
      PaymentType: 'Immediate',
      GuestCheckOut: true,
      FundingSources: ['All'],
      Currency: 'HUF',
      CallbackUrl: 'https://horvath-tamas-web.netlify.app/thanks.html', // demo
      RedirectUrl: 'https://horvath-tamas-web.netlify.app/thanks.html', // demo
      Locale: 'hu-HU',
      Transactions: [
        {
          // !!! Payee = Barion fiókod e-mail címe, NEM a POSGuid !!!
          Payee: 'tanulovagyokhatna@gmail.com',

          Total: amount,
          Items: Array.isArray(items) && items.length
            ? items.map((it, i) => ({
                Name: it.name || `Tétel ${i + 1}`,
                Description: it.desc || '',
                Quantity: Number(it.qty || 1),
                Unit: 'db',
                UnitPrice: Number(it.price || 0),
                ItemTotal: Number((it.qty || 1) * (it.price || 0))
              }))
            : [
                {
                  Name: 'Webshop rendelés (demo)',
                  Description: 'Kosár tartalma',
                  Quantity: 1,
                  Unit: 'db',
                  UnitPrice: amount,
                  ItemTotal: amount
                }
              ]
        }
      ]
    };

    // Sandbox endpoint
    const resp = await fetch('https://api.test.barion.com/v2/Payment/Start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => ({}));

    // Barion hibák kezelése
    if (!resp.ok || (data?.Errors && data.Errors.length)) {
      console.error('Barion hiba:', data);
      return res.status(400).json({
        ok: false,
        message: data?.Errors?.[0]?.Description || 'Barion API hiba',
        errors: data?.Errors || []
      });
    }

    // Siker: visszaadjuk az ugró linket
    return res.status(200).json({
      ok: true,
      paymentId: data.PaymentId,
      gatewayUrl: data.GatewayUrl
    });
  } catch (err) {
    console.error('createPayment exception:', err);
    return res.status(500).json({ ok: false, message: 'Szerver hiba' });
  }
}
