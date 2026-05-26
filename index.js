const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

const PREFIX = "🖕";

const commands = {
  menu: {
    desc: "Tampilkan daftar perintah",
    exec: async (sock, from) => {
      const text = `
╔══════════════════════╗
║      🤖 *BOT MENU*      ║
╚══════════════════════╝

${PREFIX}menu - Tampilkan menu ini
${PREFIX}ping - Cek bot aktif
${PREFIX}info - Info bot
${PREFIX}say [teks] - Bot ucapkan teks
${PREFIX}ulangi [teks] - Bot ulangi pesanmu
${PREFIX}waktu - Tampilkan waktu sekarang

_Prefix: ${PREFIX}_
      `.trim();
      await sock.sendMessage(from, { text });
    }
  },

  ping: {
    desc: "Cek bot aktif",
    exec: async (sock, from) => {
      const start = Date.now();
      await sock.sendMessage(from, { text: "🏓 Pong! " + (Date.now() - start) + "ms" });
    }
  },

  info: {
    desc: "Info bot",
    exec: async (sock, from) => {
      const text = `
╔══════════════════════╗
║      ℹ️ *INFO BOT*      ║
╚══════════════════════╝

🤖 *Nama:* WA Bot
⚡ *Library:* Baileys
🔧 *Prefix:* ${PREFIX}
☁️ *Host:* Render

Ketik *${PREFIX}menu* untuk daftar perintah.
      `.trim();
      await sock.sendMessage(from, { text });
    }
  },

  say: {
    desc: "Bot ucapkan teks",
    exec: async (sock, from, args) => {
      const teks = args.join(" ");
      if (!teks) return sock.sendMessage(from, { text: `Contoh: ${PREFIX}say Halo dunia!` });
      await sock.sendMessage(from, { text: teks });
    }
  },

  ulangi: {
    desc: "Bot ulangi pesanmu",
    exec: async (sock, from, args) => {
      const teks = args.join(" ");
      if (!teks) return sock.sendMessage(from, { text: `Contoh: ${PREFIX}ulangi Halo!` });
      await sock.sendMessage(from, { text: `🔁 ${teks}` });
    }
  },

  waktu: {
    desc: "Tampilkan waktu sekarang",
    exec: async (sock, from) => {
      const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
      await sock.sendMessage(from, { text: `🕐 Waktu sekarang: *${now} WIB*` });
    }
  },
};

async function mulaiBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
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

    const from = msg.key.remoteJid;
    const body = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""
    ).trim();

    if (!body.startsWith(PREFIX)) return;

    const [rawCmd, ...args] = body.slice(PREFIX.length).trim().split(" ");
    const cmd = rawCmd.toLowerCase();

    console.log(`[CMD] ${from} => ${PREFIX}${cmd} ${args.join(" ")}`);

    if (commands[cmd]) {
      try {
        await commands[cmd].exec(sock, from, args);
      } catch (err) {
        console.error("[ERROR]", err);
        await sock.sendMessage(from, { text: "❌ Terjadi error saat menjalankan perintah." });
      }
    } else {
      await sock.sendMessage(from, { text: `❓ Perintah tidak dikenal. Ketik *${PREFIX}menu* untuk daftar perintah.` });
    }
  });
}

mulaiBot();
