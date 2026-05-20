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

// ─── Persistência de Dados em Arquivo ───────────────────────────────
const dataDir = path.join(__dirname, 'data');
const backupsDir = path.join(dataDir, 'backups');
const dataFile = path.join(dataDir, 'clinic-data.json');

// Criar pastas se não existirem
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

let lastBackupDate = null;

function createDailyBackup() {
    const today = new Date().toISOString().slice(0, 10);
    if (lastBackupDate === today) return; // Já fez backup hoje
    
    if (fs.existsSync(dataFile)) {
        const backupFile = path.join(backupsDir, `backup_${today}.json`);
        if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(dataFile, backupFile);
            console.log(`📋 Backup diário criado: backup_${today}.json`);
        }
        lastBackupDate = today;
        
        // Limpar backups com mais de 30 dias
        try {
            const files = fs.readdirSync(backupsDir);
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            files.forEach(file => {
                const match = file.match(/backup_(\d{4}-\d{2}-\d{2})\.json/);
                if (match) {
                    const fileDate = new Date(match[1]).getTime();
                    if (fileDate < cutoff) {
                        fs.unlinkSync(path.join(backupsDir, file));
                        console.log(`🗑️  Backup antigo removido: ${file}`);
                    }
                }
            });
        } catch (e) { /* ignora erros de limpeza */ }
    }
}

// Rota: Sincronizar dados (frontend → arquivo)
app.post('/api/data/sync', (req, res) => {
    try {
        const data = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Dados inválidos' });
        }
        
        createDailyBackup();
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
        
        res.json({ 
            success: true, 
            timestamp: new Date().toISOString(),
            size: (JSON.stringify(data).length / 1024).toFixed(1) + ' KB'
        });
    } catch (err) {
        console.error('❌ Erro ao salvar dados:', err.message);
        res.status(500).json({ error: 'Erro ao salvar: ' + err.message });
    }
});

// Rota: Carregar dados (arquivo → frontend)
app.get('/api/data/load', (req, res) => {
    try {
        if (!fs.existsSync(dataFile)) {
            return res.json({ exists: false, data: null });
        }
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const data = JSON.parse(raw);
        res.json({ exists: true, data });
    } catch (err) {
        console.error('❌ Erro ao carregar dados:', err.message);
        res.status(500).json({ error: 'Erro ao carregar: ' + err.message });
    }
});

// Rota: Listar backups disponíveis
app.get('/api/data/backups', (req, res) => {
    try {
        if (!fs.existsSync(backupsDir)) {
            return res.json({ backups: [] });
        }
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse()
            .map(f => {
                const stats = fs.statSync(path.join(backupsDir, f));
                return {
                    name: f,
                    date: f.match(/backup_(.+)\.json/)?.[1] || f,
                    size: (stats.size / 1024).toFixed(1) + ' KB'
                };
            });
        res.json({ backups: files });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar backups: ' + err.message });
    }
});

// Rota: Restaurar backup específico
app.post('/api/data/restore', (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: 'Nome do arquivo não informado' });
        
        const backupPath = path.join(backupsDir, filename);
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup não encontrado' });
        }
        
        // Criar backup do estado atual antes de restaurar
        createDailyBackup();
        
        const raw = fs.readFileSync(backupPath, 'utf-8');
        const data = JSON.parse(raw);
        
        // Sobrescrever dados atuais com o backup
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
        
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao restaurar: ' + err.message });
    }
});

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
    console.log('  ⚠️  Não feche esta janela enquanto estiver usando o sistema.');
    console.log('');

    // Abrir navegador automaticamente no Windows
    const url = `http://localhost:${PORT}`;
    const command = process.platform === 'win32' ? `start ${url}`
                  : process.platform === 'darwin' ? `open ${url}`
                  : `xdg-open ${url}`;
    
    exec(command, (err) => {
      if (err) console.log('Não foi possível abrir o navegador automaticamente. Acesse manualmente:', url);
    });
});
