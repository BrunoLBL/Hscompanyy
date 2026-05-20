import { generateId } from '../utils/helpers.js';
import { createClient } from '@supabase/supabase-js';

const STORE_KEY = 'hscorp_data';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

function getAll() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}

// ─── Sincronização com Nuvem (Supabase) ──────────────────
let _syncTimeout = null;
export let lastSyncTime = null;
export let syncStatus = 'idle'; // 'idle' | 'syncing' | 'success' | 'error'

async function syncToSupabase(data) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('app_state').upsert({ id: 1, data });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro na sync Supabase:', err);
    return false;
  }
}

async function loadFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('app_state').select('data').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error; // ignora row not found
    return data?.data || null;
  } catch (err) {
    console.warn('Erro ao ler do Supabase:', err);
    return null;
  }
}

function syncToServer(data) {
  // Debounce: espera 2s sem novas alterações antes de sincronizar
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(async () => {
    syncStatus = 'syncing';
    if (supabase) {
      const ok = await syncToSupabase(data);
      if (ok) {
        lastSyncTime = new Date().toISOString();
        syncStatus = 'success';
        console.log(`💾 Dados salvos no Supabase`);
      } else {
        syncStatus = 'error';
      }
    } else {
      // Se não há Supabase, fica apenas no localStorage
      syncStatus = 'success';
    }
  }, 2000);
}

export async function forceSync() {
  const data = getAll();
  if (!data) return { success: false, error: 'Sem dados para sincronizar' };
  
  syncStatus = 'syncing';
  if (supabase) {
    const ok = await syncToSupabase(data);
    if (ok) {
      lastSyncTime = new Date().toISOString();
      syncStatus = 'success';
      return { success: true, timestamp: lastSyncTime };
    }
    syncStatus = 'error';
    return { success: false, error: 'Falha no Supabase' };
  } else {
    syncStatus = 'success';
    return { success: true };
  }
}

export function saveAll(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  syncToServer(data); // Sincroniza em background
}

let _data = null;

export async function initStore() {
  // 1. Tenta carregar do Supabase primeiro
  if (supabase) {
    const remoteData = await loadFromSupabase();
    if (remoteData) {
      _data = remoteData;
      normalizeDentists(_data);
      localStorage.setItem(STORE_KEY, JSON.stringify(_data));
      console.log('✅ Dados carregados do Supabase');
      return _data;
    }
  }

  // 2. Fallback para localStorage
  _data = getAll();
  
  if (!_data) {
    // 3. Se tudo falhar, gera demo
    _data = seedDemoData();
    saveAll(_data);
    console.log('Criados dados demo de fallback.');
  } else {
    normalizeDentists(_data);
    if (supabase) syncToServer(_data); // sob a nuvem se estiver vazia mas tiver local
  }
  
  return _data;
}

// Garante que o array de dentistas esteja no novo formato de objeto {id, name, photo}
function normalizeDentists(data) {
  if (data && data.settings && Array.isArray(data.settings.dentists)) {
    data.settings.dentists = data.settings.dentists.map(d => {
      if (typeof d === 'string') {
        return { id: generateId(), name: d, photo: null };
      }
      return d;
    });
  }
}

export function getCurrentUser() {
  return localStorage.getItem('hscorp_user') || 'Administrador';
}
export function setCurrentUser(role) {
  localStorage.setItem('hscorp_user', role);
}

export function getData() { if (!_data) initStore(); return _data; }

export function getPatients() { return getData().patients || []; }
export function getPatient(id) { return getPatients().find(p => p.id === id); }
export function savePatient(p) {
  const d = getData();
  const idx = d.patients.findIndex(x => x.id === p.id);
  if (idx >= 0) d.patients[idx] = { ...d.patients[idx], ...p, updatedAt: new Date().toISOString() };
  else { p.id = p.id || generateId(); p.createdAt = new Date().toISOString(); p.updatedAt = p.createdAt; d.patients.push(p); }
  saveAll(d); return p;
}
export function deletePatient(id) { const d = getData(); d.patients = d.patients.filter(p => p.id !== id); saveAll(d); }

export function getAppointments() { return getData().appointments || []; }
export function getAppointment(id) { return getAppointments().find(a => a.id === id); }
export function saveAppointment(a) {
  const d = getData();
  const idx = d.appointments.findIndex(x => x.id === a.id);
  if (idx >= 0) d.appointments[idx] = { ...d.appointments[idx], ...a };
  else { a.id = a.id || generateId(); d.appointments.push(a); }
  saveAll(d); return a;
}
export function deleteAppointment(id) { const d = getData(); d.appointments = d.appointments.filter(a => a.id !== id); saveAll(d); }

export function getTransactions() { return getData().transactions || []; }
export function saveTransaction(t) {
  const d = getData();
  const idx = d.transactions.findIndex(x => x.id === t.id);
  if (idx >= 0) d.transactions[idx] = { ...d.transactions[idx], ...t };
  else { t.id = t.id || generateId(); d.transactions.push(t); }
  saveAll(d); return t;
}
export function deleteTransaction(id) { const d = getData(); d.transactions = d.transactions.filter(t => t.id !== id); saveAll(d); }

export function getInventory() { return getData().inventory || []; }
export function saveInventoryItem(item) {
  const d = getData();
  const idx = d.inventory.findIndex(x => x.id === item.id);
  if (idx >= 0) d.inventory[idx] = { ...d.inventory[idx], ...item };
  else { item.id = item.id || generateId(); d.inventory.push(item); }
  saveAll(d); return item;
}
export function deleteInventoryItem(id) { const d = getData(); d.inventory = d.inventory.filter(i => i.id !== id); saveAll(d); }

export function getAttendances() { return getData().attendances || []; }
export function saveAttendance(a) {
  const d = getData();
  if (!d.attendances) d.attendances = [];
  const idx = d.attendances.findIndex(x => x.id === a.id);
  if (idx >= 0) d.attendances[idx] = { ...d.attendances[idx], ...a };
  else { a.id = a.id || generateId(); a.createdAt = new Date().toISOString(); d.attendances.push(a); }
  saveAll(d); return a;
}
export function deleteAttendance(id) { const d = getData(); d.attendances = (d.attendances||[]).filter(a => a.id !== id); saveAll(d); }


export function getClinicalRecords(patientId) { return (getData().clinicalRecords || []).filter(r => r.patientId === patientId); }
export function saveClinicalRecord(r) {
  const d = getData();
  if (!d.clinicalRecords) d.clinicalRecords = [];
  const idx = d.clinicalRecords.findIndex(x => x.id === r.id);
  if (idx >= 0) d.clinicalRecords[idx] = { ...d.clinicalRecords[idx], ...r };
  else { r.id = r.id || generateId(); d.clinicalRecords.push(r); }
  saveAll(d); return r;
}

export function getPhotos(patientId) { return (getData().photos || []).filter(p => p.patientId === patientId); }
export function savePhoto(p) {
  const d = getData();
  if (!d.photos) d.photos = [];
  p.id = p.id || generateId(); p.createdAt = new Date().toISOString();
  d.photos.push(p); saveAll(d); return p;
}
export function deletePhoto(id) { const d = getData(); d.photos = (d.photos||[]).filter(p => p.id !== id); saveAll(d); }

export function getOdontogram(patientId) { return (getData().odontograms || {})[patientId] || {}; }
export function saveOdontogram(patientId, data) {
  const d = getData();
  if (!d.odontograms) d.odontograms = {};
  d.odontograms[patientId] = data; saveAll(d);
}

export function getTreatments(patientId) { return (getData().treatments || []).filter(t => t.patientId === patientId); }
export function saveTreatment(t) {
  const d = getData();
  if (!d.treatments) d.treatments = [];
  const idx = d.treatments.findIndex(x => x.id === t.id);
  if (idx >= 0) d.treatments[idx] = { ...d.treatments[idx], ...t };
  else { t.id = t.id || generateId(); d.treatments.push(t); }
  saveAll(d); return t;
}

function seedDemoData() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const patients = [
    { id:'p1',name:'Maria Silva Santos',cpf:'12345678901',phone:'11987654321',email:'maria@email.com',birth:'1985-03-15',gender:'F',address:'Rua das Flores, 123 - São Paulo/SP',status:'active',tags:['Particular','VIP'],notes:'Paciente desde 2020' },
    { id:'p2',name:'João Carlos Oliveira',cpf:'98765432100',phone:'11976543210',email:'joao@email.com',birth:'1978-07-22',gender:'M',address:'Av. Paulista, 456 - São Paulo/SP',status:'active',tags:['Convênio'],notes:'Convênio Amil' },
    { id:'p3',name:'Ana Beatriz Ferreira',cpf:'45678912300',phone:'11965432109',email:'ana@email.com',birth:'1992-11-08',gender:'F',address:'Rua Augusta, 789 - São Paulo/SP',status:'active',tags:['Particular'],notes:'' },
    { id:'p4',name:'Carlos Eduardo Lima',cpf:'78912345600',phone:'11954321098',email:'carlos@email.com',birth:'1968-01-30',gender:'M',address:'Rua Oscar Freire, 321 - São Paulo/SP',status:'active',tags:['Particular'],notes:'Tratamento ortodôntico em andamento' },
    { id:'p5',name:'Juliana Costa Pereira',cpf:'32165498700',phone:'11943210987',email:'juliana@email.com',birth:'2000-05-12',gender:'F',address:'Av. Brasil, 654 - São Paulo/SP',status:'inactive',tags:['Convênio'],notes:'Mudou de cidade' },
    { id:'p6',name:'Roberto Almeida Souza',cpf:'65498732100',phone:'11932109876',email:'roberto@email.com',birth:'1955-09-03',gender:'M',address:'Rua Consolação, 987 - São Paulo/SP',status:'active',tags:['Particular','VIP'],notes:'Implantes - acompanhamento semestral' },
    { id:'p7',name:'Fernanda Rodrigues',cpf:'14725836900',phone:'11921098765',email:'fernanda@email.com',birth:'1990-12-25',gender:'F',address:'Rua Haddock Lobo, 147 - São Paulo/SP',status:'active',tags:['Particular'],notes:'' },
    { id:'p8',name:'Lucas Martins',cpf:'25836914700',phone:'11910987654',email:'lucas@email.com',birth:'1995-04-18',gender:'M',address:'Av. Rebouças, 258 - São Paulo/SP',status:'active',tags:['Convênio'],notes:'Convênio Bradesco Dental' },
  ].map(p => ({ ...p, createdAt: new Date(y, m - 3, 1).toISOString(), updatedAt: new Date().toISOString() }));

  const procedures = ['Limpeza','Restauração','Extração','Canal','Clareamento','Implante','Ortodontia','Prótese','Avaliação','Raio-X'];
  const dentists = [
    { id: generateId(), name: 'Dra. Helena Souza', photo: null },
    { id: generateId(), name: 'Dr. Ricardo Mendes', photo: null }
  ];
  const statuses = ['confirmed','pending','completed','cancelled'];

  const appointments = [];
  for (let i = -20; i < 15; i++) {
    const dt = new Date(y, m, now.getDate() + i);
    const count = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < count; j++) {
      const h = 8 + Math.floor(Math.random() * 10);
      const pt = patients[Math.floor(Math.random() * patients.length)];
      const st = i < 0 ? (Math.random() > .15 ? 'completed' : 'cancelled') : (i === 0 ? 'confirmed' : (Math.random() > .3 ? 'confirmed' : 'pending'));
      appointments.push({
        id: generateId(), patientId: pt.id, patientName: pt.name,
        date: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${Math.random()>.5?'00':'30'}`,
        duration: 30 + Math.floor(Math.random() * 4) * 15,
        procedure: procedures[Math.floor(Math.random() * procedures.length)],
        dentist: dentists[Math.floor(Math.random() * dentists.length)].name,
        status: st, notes: ''
      });
    }
  }

  const categories = ['Material','Aluguel','Salário','Marketing','Manutenção','Outros'];
  const payMethods = ['PIX','Cartão Crédito','Cartão Débito','Dinheiro','Boleto'];
  const transactions = [];
  for (let i = 5; i >= 0; i--) {
    const month = m - i;
    for (let j = 0; j < 15; j++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const isIncome = Math.random() > .35;
      const pt = patients[Math.floor(Math.random() * patients.length)];
      transactions.push({
        id: generateId(), type: isIncome ? 'income' : 'expense',
        date: `${y}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        amount: isIncome ? (Math.floor(Math.random() * 30) + 1) * 100 : (Math.floor(Math.random() * 15) + 1) * 50,
        description: isIncome ? procedures[Math.floor(Math.random() * procedures.length)] : categories[Math.floor(Math.random() * categories.length)],
        category: isIncome ? 'Procedimento' : categories[Math.floor(Math.random() * categories.length)],
        patientId: isIncome ? pt.id : null, patientName: isIncome ? pt.name : null,
        method: payMethods[Math.floor(Math.random() * payMethods.length)],
        status: Math.random() > .1 ? 'paid' : 'pending'
      });
    }
  }

  const inventory = [
    { id:'inv1',name:'Resina Composta Z350',category:'Material',qty:25,minQty:10,unit:'unidade',cost:85,expiry:`${y+1}-06-15` },
    { id:'inv2',name:'Anestésico Lidocaína 2%',category:'Material',qty:50,minQty:20,unit:'tubete',cost:12,expiry:`${y}-12-30` },
    { id:'inv3',name:'Luvas de Procedimento M',category:'Descartável',qty:500,minQty:200,unit:'unidade',cost:0.35,expiry:`${y+2}-01-01` },
    { id:'inv4',name:'Fio de Sutura 4-0',category:'Material',qty:8,minQty:15,unit:'unidade',cost:22,expiry:`${y+1}-03-20` },
    { id:'inv5',name:'Cimento Ionômero de Vidro',category:'Material',qty:12,minQty:5,unit:'frasco',cost:65,expiry:`${y+1}-09-10` },
    { id:'inv6',name:'Broca Diamantada 1012',category:'Instrumento',qty:30,minQty:10,unit:'unidade',cost:8.5,expiry:null },
    { id:'inv7',name:'Sugador Descartável',category:'Descartável',qty:150,minQty:100,unit:'unidade',cost:0.15,expiry:null },
    { id:'inv8',name:'Algodão Rolete',category:'Descartável',qty:3,minQty:5,unit:'pacote',cost:6,expiry:null },
  ];

  const clinicalRecords = [
    { id:'cr1',patientId:'p1',date:new Date(y,m-2,10).toISOString(),procedure:'Limpeza',dentist:'Dra. Helena Souza',notes:'Limpeza completa realizada. Gengiva saudável.',tooth:null },
    { id:'cr2',patientId:'p1',date:new Date(y,m-1,5).toISOString(),procedure:'Restauração',dentist:'Dra. Helena Souza',notes:'Restauração em resina no dente 36, face oclusal.',tooth:'36' },
    { id:'cr3',patientId:'p1',date:new Date(y,m,2).toISOString(),procedure:'Clareamento',dentist:'Dr. Ricardo Mendes',notes:'1ª sessão de clareamento a laser. Próxima em 15 dias.',tooth:null },
    { id:'cr4',patientId:'p2',date:new Date(y,m-1,20).toISOString(),procedure:'Avaliação',dentist:'Dr. Ricardo Mendes',notes:'Avaliação geral. Indicado tratamento de canal no dente 46.',tooth:'46' },
    { id:'cr5',patientId:'p2',date:new Date(y,m,1).toISOString(),procedure:'Canal',dentist:'Dr. Ricardo Mendes',notes:'Início do tratamento de canal dente 46. Primeira etapa concluída.',tooth:'46' },
  ];

  const treatments = [
    { id:'tr1',patientId:'p1',procedure:'Clareamento a Laser',status:'in_progress',totalSessions:3,completedSessions:1,value:1500,paid:500,dentist:'Dr. Ricardo Mendes',startDate:new Date(y,m,2).toISOString() },
    { id:'tr2',patientId:'p2',procedure:'Tratamento de Canal - Dente 46',status:'in_progress',totalSessions:3,completedSessions:1,value:1200,paid:400,dentist:'Dr. Ricardo Mendes',startDate:new Date(y,m,1).toISOString() },
    { id:'tr3',patientId:'p4',procedure:'Ortodontia - Aparelho Fixo',status:'in_progress',totalSessions:24,completedSessions:8,value:6000,paid:2000,dentist:'Dra. Helena Souza',startDate:new Date(y,m-8,15).toISOString() },
    { id:'tr4',patientId:'p1',procedure:'Limpeza Semestral',status:'completed',totalSessions:1,completedSessions:1,value:250,paid:250,dentist:'Dra. Helena Souza',startDate:new Date(y,m-2,10).toISOString() },
  ];

  return { patients, appointments, transactions, inventory, clinicalRecords, treatments, photos: [], odontograms: {}, attendances: [], settings: { clinicName: 'HS Corp', dentists } };
}

export function exportData() {
  const d = getData();
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `hscorp_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
}

export function importData(jsonStr) {
  try { 
    const d = JSON.parse(jsonStr); 
    normalizeDentists(d);
    _data = d; 
    saveAll(d); 
    return true; 
  } catch { return false; }
}

export function resetStore() {
  const emptyData = {
    patients: [],
    appointments: [],
    transactions: [],
    inventory: [],
    clinicalRecords: [],
    treatments: [],
    photos: [],
    odontograms: {},
    attendances: [],
    settings: { clinicName: 'HS Corp', dentists: [] }
  };
  _data = emptyData;
  saveAll(emptyData);
}
