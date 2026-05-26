const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

// ========== KONFIGURASI ==========
const NOMOR_TUJUAN = "628123456789@s.whatsapp.net"; // Ganti nomor tujuan
const TRIGGER_KATA = "mulai"; // Kata untuk memulai tes
// =================================

// Urutan command yang akan dikirim berantai
const COMMANDS = [
  ".menu",
  ".download https://tiktok.com/xyz",
  ".info",
];

let tahapan = -1; // -1 = idle
let sock;

async function kirimPesan(teks) {
  await sock.sendMessage(NOMOR_TUJUAN, { text: teks });
  console.log(`[KIRIM] ${teks}`);
}

async function mulaiBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("[KONEKSI] Terputus. Reconnect:", shouldReconnect);
      if (shouldReconnect) mulaiBot();
    } else if (connection === "open") {
      console.log("[KONEKSI] WhatsApp terhubung!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const dari = msg.key.remoteJid;
    const teks = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""
    ).trim().toLowerCase();

    console.log(`[MASUK] dari: ${dari} | pesan: ${teks}`);

    // Trigger "mulai" dari siapa saja
    if (teks === TRIGGER_KATA) {
      tahapan = 0;
      console.log(`[MULAI] Memulai urutan command...`);
      await kirimPesan(COMMANDS[tahapan]);
      return;
    }

    // Balasan dari nomor tujuan
    if (dari === NOMOR_TUJUAN && tahapan >= 0) {
      tahapan++;

      if (tahapan < COMMANDS.length) {
        console.log(`[TAHAPAN ${tahapan}] Mengirim command berikutnya...`);
        await kirimPesan(COMMANDS[tahapan]);
      } else {
        console.log(`[SELESAI] Semua command telah dijalankan. Reset.`);
        tahapan = -1;
      }
    }
  });
}

mulaiBot();
