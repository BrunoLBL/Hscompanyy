import express from 'express';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';

// Resolver __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rotas de dados locais foram removidas (Migração para Supabase/localStorage)

// ─── Servir Frontend Estático (produção) ────────────────────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('📂 Servindo frontend estático de ./dist');
} else {
  console.log('⚠️  Pasta dist/ não encontrada. Rode "npm run build" primeiro ou use "npm run start".');
}

// ─── WhatsApp Client ────────────────────────────────────────────────
let qrDataURL = null;
let isConnected = false;
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    // Resolve o bug de carregamento infinito do WhatsApp Web atualizando a versão do client
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
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
    setTimeout(() => {
        client.initialize().catch(err => {
            console.error('❌ Erro ao reconectar WhatsApp:', err.message);
        });
    }, 5000);
});

// Tratamento de erros
client.on('auth_failure', msg => {
    console.error('Falha na autenticação', msg);
    isConnected = false;
    isReady = false;
});

// Captura erros não tratados para que o servidor não crash
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  Erro não tratado (ignorado para manter o servidor rodando):', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
    // Não deixa o servidor morrer por erros do Puppeteer/WhatsApp
    console.error('⚠️  Exceção não capturada (ignorado):', err?.message || err);
});

// Inicialização com tratamento de erro
async function initWhatsApp() {
    try {
        await client.initialize();
    } catch (err) {
        console.error('');
        console.error('❌ Erro ao inicializar o WhatsApp:', err.message);
        console.error('   Tente apagar a pasta .wwebjs_auth e reiniciar o sistema.');
        console.error('   O servidor continua rodando — recarregue a página para tentar novamente.');
        console.error('');
    }
}

initWhatsApp();

// ─── Rotas API WhatsApp ─────────────────────────────────────────────

// Rota para status e QRCode
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        ready: isReady,
        connected: isConnected,
        qr: qrDataURL
    });
});

// Rota para reinicializar o WhatsApp
app.post('/api/whatsapp/restart', async (req, res) => {
    try {
        console.log('🔄 Reinicializando cliente WhatsApp...');
        isReady = false;
        isConnected = false;
        qrDataURL = null;
        
        try { await client.destroy(); } catch (e) { /* ignora */ }
        
        setTimeout(() => {
            client.initialize().catch(err => {
                console.error('❌ Erro ao reinicializar WhatsApp:', err.message);
            });
        }, 2000);

        res.json({ success: true, message: 'Reinicializando WhatsApp...' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao reinicializar: ' + err.message });
    }
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

// ─── SPA Fallback (deve vir DEPOIS das rotas /api) ──────────────────
if (fs.existsSync(distPath)) {
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Iniciar Servidor ───────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🦷 HS Corp — Gestão Odontológica');
    console.log(`  🌐 Acesse: http://localhost:${PORT}`);
    console.log('  📱 WhatsApp API ativa');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  ⚠️  Para rodar o front-end localmente, use: npm run dev');
    console.log('');
});
