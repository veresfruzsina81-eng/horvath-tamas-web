// netlify/functions/createPayment.js
export async function handler(event) {
  try {
    console.log("=== createPayment start ===");

    // nézzük, van-e beállítva a környezeti változó
    if (!process.env.BARION_POSKEY) {
      console.error("❌ BARION_POSKEY nincs beállítva!");
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "BARION_POSKEY missing" })
      };
    }
    console.log("BARION_POSKEY: OK (be van állítva)");

    // kliensről jövő body kiíratás
    const body = JSON.parse(event.body || "{}");
    console.log("Request body:", body);

    // itt jönne a Barion API hívás
    // egyelőre csak demo választ adunk vissza
    console.log("Fizetési kérés feldolgozva (demo)");

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        msg: "Payment created (demo)",
        request: body
      })
    };
  } catch (err) {
    console.error("Hiba történt:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
}
