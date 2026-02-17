// bot-simple.js - Siêu đơn giản, chạy được ngay
console.log('🚀 Khởi động bot...');

// ==================== BỎ QUA LỖI ====================
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ==================== DISCORD ====================
const { Client, GatewayIntentBits } = require('discord.js');

// ==================== THÔNG TIN CỦA BẠN ====================
const TOKEN = 'MTQ1Njk2NDc5NDIxMjE1OTcwMg.GEvb_q.UIxdf1LtmKM8S46VrCp6tFowBWj-j8SW181dFA';
const CHANNEL_ID = '1456595444477198508';

// ==================== KIỂM TRA TOKEN ====================
if (!TOKEN || TOKEN.length < 50) {
    console.log('❌ TOKEN KHÔNG HỢP LỆ!');
    console.log('📝 Lấy token mới tại: https://discord.com/developers/applications');
    process.exit(1);
}

console.log('✅ Token OK, đang kết nối Discord...');

// ==================== TẠO BOT ĐƠN GIẢN ====================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// ==================== KHI BOT ONLINE ====================
client.once('ready', () => {
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        channel.send('✅ **BOT ĐÃ ONLINE** - Gõ `!help`');
        console.log('✅ Đã gửi tin nhắn thành công!');
    } else {
        console.log('❌ Không tìm thấy channel! Kiểm tra CHANNEL_ID');
    }
});

// ==================== XỬ LÝ TIN NHẮN ====================
client.on('messageCreate', (msg) => {
    if (msg.channel.id !== CHANNEL_ID) return;
    if (!msg.content.startsWith('!')) return;
    
    const args = msg.content.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    if (cmd === 'ping') {
        msg.reply('🏓 Pong! ' + Date.now() - msg.createdTimestamp + 'ms');
    }
    
    if (cmd === 'help') {
        msg.channel.send(`
**📚 BOT ĐƠN GIẢN**
\`!ping\` - Kiểm tra bot
\`!help\` - Hướng dẫn
\`!test\` - Test
        `);
    }
    
    if (cmd === 'test') {
        msg.channel.send('✅ Bot hoạt động tốt!');
    }
});

// ==================== LOGIN ====================
client.login(TOKEN).then(() => {
    console.log('✅ Đăng nhập Discord thành công!');
}).catch(err => {
    console.log('❌ LỖI ĐĂNG NHẬP:');
    console.log(err.message);
    console.log('\n📝 CÁCH FIX:');
    console.log('1. Vào https://discord.com/developers/applications');
    console.log('2. Chọn bot của bạn');
    console.log('3. Reset token và copy TOKEN MỚI');
    console.log('4. Dán token mới vào file này');
});
