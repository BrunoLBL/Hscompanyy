import express from 'express';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

const app = express();
app.use(cors());
app.use(express.json());

let qrDataURL = null;
let isConnected = false;
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code recebido, escaneie no frontend');
    qrDataURL = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
    console.log('Cliente WhatsApp está pronto!');
    isReady = true;
    isConnected = true;
    qrDataURL = null;
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso');
    isConnected = true;
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado', reason);
    isConnected = false;
    isReady = false;
    // Tenta reinicializar se a sessão foi desconectada
    client.initialize();
});

// Tratamento de erros
client.on('auth_failure', msg => {
    console.error('Falha na autenticação', msg);
    isConnected = false;
    isReady = false;
});

client.initialize();

// Rota para status e QRCode
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        ready: isReady,
        connected: isConnected,
        qr: qrDataURL
    });
});

// Rota para disparar mensagens
app.post('/api/whatsapp/send', async (req, res) => {
    if (!isReady) {
        return res.status(400).json({ error: 'WhatsApp não está pronto. Por favor, aguarde ou escaneie o QR Code.' });
    }

    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Formato inválido' });
    }

    console.log(`Iniciando envio de ${messages.length} mensagens...`);

    // Responde imediatamente ao frontend para não travar a requisição,
    // já que vamos enviar com intervalo (ex: 3s)
    res.json({ success: true, message: 'Disparo iniciado em segundo plano.', total: messages.length });

    for (const msg of messages) {
        try {
            // Tenta obter o ID real do usuário no WhatsApp
            // Isso resolve automaticamente problemas com o 9º dígito no Brasil
            const numberId = await client.getNumberId(msg.phone);
            
            if (numberId) {
                await client.sendMessage(numberId._serialized, msg.text);
                console.log(`Mensagem enviada com sucesso para ${msg.phone} (ID: ${numberId._serialized})`);
            } else {
                console.log(`Número não encontrado no WhatsApp: ${msg.phone}`);
            }
            
            // Atraso de 3 a 5 segundos para evitar banimento do WhatsApp
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
        } catch (error) {
            console.error(`Erro ao enviar mensagem para ${msg.phone}:`, error);
        }
    }
    
    console.log('Disparo concluído!');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor WhatsApp rodando na porta ${PORT}`);
});
