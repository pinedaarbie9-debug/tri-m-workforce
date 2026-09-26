// backend/scripts/simulate-punch.js
//
// SIMULATOR — ginagaya nito ang HTTP push na ginagawa ng isang tunay na
// ZKTeco/eSSL fingerprint device papunta sa ADMS listener natin
// (backend/src/routes/deviceattendance.js), para matest natin ang buong
// flow (webhook -> match employee -> update attendance -> dashboard)
// KAHIT WALA PANG physical na fingerprint device.
//
// PAANO GAMITIN:
//   1. Siguraduhing tumatakbo ang backend server mo (npm run dev sa backend folder)
//   2. Sa isang BAGONG terminal window, patakbuhin:
//        node scripts/simulate-punch.js 1001
//      kung saan "1001" ang Device PIN ng employee na na-enroll mo sa
//      Biometric Auth page (credential_id column).
//   3. Tingnan ang terminal ng backend server mo — dapat may lumabas na
//      "✅ CHECK_IN na-log para sa employee_id=..." o "✅ CHECK_OUT..."
//   4. Patakbuhin mo ulit ang parehong command (parehong PIN) -> dapat
//      CHECK_OUT na ito, dahil may check-in ka nang naitala ngayong araw.
//   5. I-refresh ang Dashboard sa browser -> dapat may bagong entry sa
//      "Recent Activity".

const SERVER_URL = "http://localhost:4000"; // baguhin kung ibang PORT ang backend mo
const DEVICE_SN = "SIMULATOR001"; // fake serial number, kahit ano lang

const pin = process.argv[2];

if (!pin) {
  console.error("❌ Kailangan mong maglagay ng Device PIN.");
  console.error("   Halimbawa: node scripts/simulate-punch.js 1001");
  process.exit(1);
}

// Kinukuha ang kasalukuyang petsa/oras sa format na "YYYY-MM-DD HH:MM:SS"
// -- ito mismo ang format na ipinapadala ng totoong fingerprint device.
function nowFormatted() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function simulatePunch() {
  const timestamp = nowFormatted();

  // Ito ang eksaktong format ng ATTLOG na ipinapadala ng device:
  // PIN <TAB> TIMESTAMP <TAB> STATUS <TAB> VERIFY_TYPE <TAB> ...
  // Sapat na ang unang dalawang field para gumana ang parser natin.
  const body = `${pin}\t${timestamp}\t0\t1\t0\t0`;

  const url = `${SERVER_URL}/iclock/cdata?SN=${DEVICE_SN}&table=ATTLOG`;

  console.log(`📡 Nagpapadala ng simulated fingerprint scan...`);
  console.log(`   PIN: ${pin}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   URL: ${url}`);
  console.log("");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
    });

    const text = await res.text();
    console.log(`📥 Sagot ng server (HTTP ${res.status}): "${text}"`);

    if (text.startsWith("OK:") && !text.includes("OK: 0")) {
      console.log("✅ Matagumpay! Tingnan mo ang Dashboard o terminal ng backend server para sa detalye.");
    } else if (text.includes("OK: 0")) {
      console.log("⚠️  Natanggap ng server pero WALANG na-match na employee.");
      console.log(`   I-check mo kung na-enroll ang PIN "${pin}" sa Biometric Auth page (credential_id).`);
    } else {
      console.log("⚠️  Hindi inaasahang sagot. I-check ang logs ng backend server.");
    }
  } catch (err) {
    console.error("❌ Hindi ma-reach ang server. Siguraduhing tumatakbo ang backend (npm run dev).");
    console.error(err.message);
  }
}

simulatePunch();