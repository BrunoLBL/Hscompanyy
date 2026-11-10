import { generateId, localDateStr } from '../utils/helpers.js';
import { createClient } from '@supabase/supabase-js';

const STORE_KEY = 'hscorp_data';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Identificador único desta instância (aba do navegador) — para ignorar nossos próprios updates no Realtime
const _instanceId = generateId();
let _isSaving = false;
let _realtimeChannel = null;

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

// ─── Deep Merge Multi-Usuário ────────────────────────────
// Coleções que são arrays de objetos com campo 'id'
const COLLECTIONS = ['patients', 'appointments', 'transactions', 'inventory', 'attendances', 'cancelledAttendances', 'clinicalRecords', 'treatments', 'photos', 'documents', 'inventoryNotifications', 'systemLogs'];

function getRecordTimestamp(item) {
  const ts = item.updatedAt || item.createdAt || item.date || item.startDate;
  return ts ? new Date(ts).getTime() : 0;
}

function mergeCollections(localArr, remoteArr, deletedIds) {
  const map = new Map();

  // Adiciona itens remotos primeiro
  for (const item of remoteArr) {
    if (!deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }

  // Sobrepõe com itens locais (mais recente vence)
  for (const item of localArr) {
    if (deletedIds.has(item.id)) continue;

    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      // Compara timestamps — mantém o mais recente
      const localTime = getRecordTimestamp(item);
      const remoteTime = getRecordTimestamp(existing);
      if (localTime >= remoteTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

function deepMergeData(local, remote) {
  if (!local) return remote;
  if (!remote) return local;

  const merged = { ...local };

  // Combina tombstones de deleções de ambos os lados
  const localDeletions = local._deletions || [];
  const remoteDeletions = remote._deletions || [];
  const deletionMap = new Map();
  for (const d of remoteDeletions) deletionMap.set(d.id, d);
  for (const d of localDeletions) deletionMap.set(d.id, d);

  // Limpa tombstones com mais de 7 dias
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  merged._deletions = Array.from(deletionMap.values()).filter(d => new Date(d.deletedAt).getTime() > cutoff);

  const deletedIds = new Set(merged._deletions.map(d => d.id));

  // Merge cada coleção de registros por ID
  for (const col of COLLECTIONS) {
    const localArr = local[col] || [];
    const remoteArr = remote[col] || [];
    merged[col] = mergeCollections(localArr, remoteArr, deletedIds);
  }

  // Merge settings (local tem prioridade, exceto dentists que tem id)
  merged.settings = { ...(remote.settings || {}), ...(local.settings || {}) };
  if (local.settings?.dentists || remote.settings?.dentists) {
    merged.settings.dentists = mergeCollections(
      local.settings?.dentists || [],
      remote.settings?.dentists || [],
      deletedIds
    );
  }

  // Merge odontograms (objeto por patientId — local tem prioridade)
  merged.odontograms = { ...(remote.odontograms || {}), ...(local.odontograms || {}) };

  merged._lastModified = new Date().toISOString();

  return merged;
}

// ─── Sincronização com Merge ─────────────────────────────
function syncToServer(data) {
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(async () => {
    if (!supabase) { syncStatus = 'success'; return; }

    syncStatus = 'syncing';
    _isSaving = true;

    try {
      // 1. Busca dados mais recentes do Supabase
      const remoteData = await loadFromSupabase();

      // 2. Merge local com remoto
      const localData = getAll();
      const merged = remoteData ? deepMergeData(localData, remoteData) : localData;
      merged._instanceId = _instanceId;
      merged._lastModified = new Date().toISOString();

      // 3. Salva resultado do merge no Supabase
      const ok = await syncToSupabase(merged);
      if (ok) {
        _data = merged;
        localStorage.setItem(STORE_KEY, JSON.stringify(merged));
        lastSyncTime = new Date().toISOString();
        syncStatus = 'success';
        console.log('💾 Dados sincronizados com merge');
      } else {
        syncStatus = 'error';
      }
    } catch (err) {
      console.error('Erro na sync com merge:', err);
      syncStatus = 'error';
    } finally {
      _isSaving = false;
    }
  }, 1500);
}

// Sync imediata com merge — para usar antes de reload (troca de perfil)
export async function flushSync() {
  if (_syncTimeout) { clearTimeout(_syncTimeout); _syncTimeout = null; }
  const localData = getAll();
  if (!localData) return false;

  if (supabase) {
    syncStatus = 'syncing';
    _isSaving = true;
    try {
      const remoteData = await loadFromSupabase();
      const merged = remoteData ? deepMergeData(localData, remoteData) : localData;
      merged._instanceId = _instanceId;
      merged._lastModified = new Date().toISOString();

      const ok = await syncToSupabase(merged);
      if (ok) {
        _data = merged;
        localStorage.setItem(STORE_KEY, JSON.stringify(merged));
        lastSyncTime = new Date().toISOString();
        syncStatus = 'success';
        sessionStorage.setItem('hscorp_just_synced', '1');
        console.log('💾 flushSync com merge completo');
        return true;
      }
      syncStatus = 'error';
      return false;
    } finally {
      _isSaving = false;
    }
  }

  sessionStorage.setItem('hscorp_just_synced', '1');
  return true;
}

export async function forceSync() {
  const localData = getAll();
  if (!localData) return { success: false, error: 'Sem dados para sincronizar' };

  syncStatus = 'syncing';
  if (supabase) {
    _isSaving = true;
    try {
      const remoteData = await loadFromSupabase();
      const merged = remoteData ? deepMergeData(localData, remoteData) : localData;
      merged._instanceId = _instanceId;
      merged._lastModified = new Date().toISOString();

      const ok = await syncToSupabase(merged);
      if (ok) {
        _data = merged;
        localStorage.setItem(STORE_KEY, JSON.stringify(merged));
        lastSyncTime = new Date().toISOString();
        syncStatus = 'success';
        return { success: true, timestamp: lastSyncTime };
      }
      syncStatus = 'error';
      return { success: false, error: 'Falha no Supabase' };
    } finally {
      _isSaving = false;
    }
  } else {
    syncStatus = 'success';
    return { success: true };
  }
}

export function saveAll(data) {
  data._lastModified = new Date().toISOString();
  data._instanceId = _instanceId;
  _data = data;
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  syncToServer(data); // Sincroniza com merge em background
}

let _data = null;

// ─── Supabase Realtime ───────────────────────────────────
function subscribeRealtime() {
  if (!supabase || _realtimeChannel) return;

  _realtimeChannel = supabase
    .channel('hscorp-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'app_state',
      filter: 'id=eq.1'
    }, async () => {
      // Ignora se estamos salvando (é nosso próprio update)
      if (_isSaving) return;

      // Busca dados atualizados do Supabase
      const remoteData = await loadFromSupabase();
      if (!remoteData) return;

      // Ignora se veio da nossa própria instância
      if (remoteData._instanceId === _instanceId) return;

      console.log('📡 Dados atualizados por outro usuário — fazendo merge');

      // Merge remoto com local
      const localData = getAll();
      const merged = deepMergeData(localData, remoteData);
      _data = merged;
      localStorage.setItem(STORE_KEY, JSON.stringify(merged));

      // Notifica a UI para re-renderizar a página atual
      window.dispatchEvent(new CustomEvent('hscorp:data-updated'));
    })
    .subscribe((status) => {
      console.log('📡 Realtime:', status);
    });
}

// ─── Inicialização ───────────────────────────────────────
export async function initStore() {
  const localData = getAll();

  // 1. OFFLINE-FIRST: Se já temos dados no localStorage, usamos eles imediatamente
  // Isso elimina a espera de 8-10 segundos na tela branca.
  if (localData) {
    _data = localData;
    normalizeDentists(_data);
    migrateUsers(_data);
    console.log('⚡ initStore ultra-rápido: renderizando UI imediatamente com dados locais');

    // Se houver Supabase, busca atualizações em background sem bloquear a UI
    if (supabase) {
      setTimeout(async () => {
        try {
          // Só baixa do Supabase se não acabou de sincronizar na troca de perfil
          const justSynced = sessionStorage.getItem('hscorp_just_synced');
          if (justSynced) {
            sessionStorage.removeItem('hscorp_just_synced');
            subscribeRealtime();
            return;
          }

          console.log('🔄 Buscando atualizações do Supabase em background...');
          const remoteData = await loadFromSupabase();
          
          if (remoteData) {
            // Ignora se vieram da nossa própria instância
            if (remoteData._instanceId === _instanceId) {
               subscribeRealtime();
               return; 
            }
            
            const merged = deepMergeData(localData, remoteData);
            _data = merged;
            localStorage.setItem(STORE_KEY, JSON.stringify(merged));
            console.log('✅ Merge em background concluído (local + Supabase)');
            
            // Dispara evento para a UI se atualizar (usando o mesmo listener do Realtime)
            window.dispatchEvent(new CustomEvent('hscorp:data-updated'));
          } else {
             // Se local tem dados mas remoto está vazio (primeiro acesso ou base limpa)
             syncToServer(_data);
          }
          subscribeRealtime();
        } catch (err) {
          console.error('Erro no fetch em background:', err);
          subscribeRealtime();
        }
      }, 0);
    }
    
    return _data;
  }

  // 2. FALLBACK: Se NÃO HÁ dados locais (primeiro acesso em um PC novo), temos que esperar a rede
  console.log('⏳ Nenhum dado local encontrado. Aguardando download do Supabase...');
  if (supabase) {
    const remoteData = await loadFromSupabase();
    if (remoteData) {
      _data = remoteData;
      normalizeDentists(_data);
      migrateUsers(_data);
      localStorage.setItem(STORE_KEY, JSON.stringify(_data));
      console.log('✅ Dados iniciais carregados do Supabase');
      subscribeRealtime();
      return _data;
    }
  }

  // 3. FALLBACK FINAL: Estrutura inicial limpa (sem dados fictícios e sem auto-sync perigoso)
  console.log('⚠️ Nenhum dado encontrado. Inicializando estrutura segura...');
  _data = getEmptyInitialData();
  migrateUsers(_data);
  localStorage.setItem(STORE_KEY, JSON.stringify(_data));
  // ATENÇÃO: NÃO chamamos saveAll(_data) nem syncToServer() aqui
  // para NUNCA sincronizar dados vazios ou de teste para o Supabase em caso de instabilidade de rede.
  subscribeRealtime();
  
  return _data;
}

// Garante que o array de dentistas esteja no novo formato de objeto {id, name, photo, type}
function normalizeDentists(data) {
  if (data && data.settings && Array.isArray(data.settings.dentists)) {
    data.settings.dentists = data.settings.dentists.map(d => {
      if (typeof d === 'string') {
        return { id: generateId(), name: d, photo: null, type: 'fixo' };
      }
      if (!d.type) d.type = 'fixo'; // Fallback para dentistas antigos
      return d;
    });
  }
}

// ─── Migração de Usuários ────────────────────────────────
function migrateUsers(data) {
  if (!data) return;
  if (!data.settings) data.settings = {};
  if (!data.settings.users || data.settings.users.length === 0) {
    const allPerms = ['dashboard','atendimentos','pacientes','agenda','financeiro','estoque','relatorios','configuracoes','whatsapp','dentistas'];
    const recepPerms = ['dashboard','atendimentos','pacientes','agenda','estoque','configuracoes','whatsapp','dentistas'];
    data.settings.users = [
      { id: generateId(), name: 'Administrador', role: 'admin', password: '123', permissions: allPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: generateId(), name: 'Recepção', role: 'recepcao', password: '123', permissions: recepPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
  }
  // Cria um usuário para cada dentista cadastrado (caso ainda não exista)
  const dentists = data.settings.dentists || [];
  dentists.forEach(d => {
    const exists = data.settings.users.find(u => u.dentistId === d.id || u.name === d.name);
    if (!exists) {
      data.settings.users.push({
        id: generateId(), name: d.name, role: 'dentista', password: '123',
        permissions: ['portal'], dentistId: d.id,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    }
  });
  // Garante novas coleções
  if (!data.documents) data.documents = [];
  if (!data.inventoryNotifications) data.inventoryNotifications = [];
  if (!data.systemLogs) data.systemLogs = [];
}

// ─── Sessão de Login ─────────────────────────────────────
export function getLoggedUser() {
  try {
    const raw = sessionStorage.getItem('hscorp_logged_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setLoggedUser(user) {
  sessionStorage.setItem('hscorp_logged_user', JSON.stringify(user));
}

export function logoutUser() {
  sessionStorage.removeItem('hscorp_logged_user');
  sessionStorage.removeItem('dentist_portal_user');
}

export function getUsers() {
  return getData().settings?.users || [];
}

export function saveUser(user) {
  const d = getData();
  if (!d.settings.users) d.settings.users = [];
  user.updatedAt = new Date().toISOString();
  const idx = d.settings.users.findIndex(u => u.id === user.id);
  if (idx >= 0) d.settings.users[idx] = { ...d.settings.users[idx], ...user };
  else { user.id = user.id || generateId(); user.createdAt = user.updatedAt; d.settings.users.push(user); }
  saveAll(d);
  return user;
}

export function deleteUser(id) {
  const d = getData();
  d.settings.users = (d.settings.users || []).filter(u => u.id !== id);
  saveAll(d);
}

export function getCurrentUser() {
  const logged = getLoggedUser();
  return logged ? logged.name : 'Administrador';
}
export function setCurrentUser(role) {
  localStorage.setItem('hscorp_user', role);
}

export function getData() { if (!_data) initStore(); return _data; }

// ─── Rastreamento de Deleções (Tombstones) ───────────────
export function trackDeletion(data, id) {
  if (!data._deletions) data._deletions = [];
  data._deletions.push({ id, deletedAt: new Date().toISOString() });
}

// ─── Log do Sistema ──────────────────────────────────────
export function addLog(action, entity, entityId, description) {
  const d = getData();
  if (!d.systemLogs) d.systemLogs = [];
  const logged = getLoggedUser();
  d.systemLogs.push({
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: logged?.id || 'system',
    userName: logged?.name || 'Sistema',
    action,   // 'create' | 'update' | 'delete' | 'login' | 'logout' | 'complete'
    entity,   // 'patient' | 'appointment' | 'transaction' | 'attendance' | 'inventory' | 'user' | ...
    entityId: entityId || null,
    description
  });
  // Limita a 1000 logs mais recentes para não estourar localStorage
  if (d.systemLogs.length > 1000) {
    d.systemLogs = d.systemLogs.slice(-1000);
  }
  saveAll(d);
}

export function getSystemLogs() {
  return getData().systemLogs || [];
}

// ─── Documentos do Paciente ──────────────────────────────
export function getDocuments(patientId) {
  return (getData().documents || []).filter(doc => doc.patientId === patientId);
}

export function saveDocument(doc) {
  const d = getData();
  if (!d.documents) d.documents = [];
  doc.updatedAt = new Date().toISOString();
  const idx = d.documents.findIndex(x => x.id === doc.id);
  if (idx >= 0) d.documents[idx] = { ...d.documents[idx], ...doc };
  else { doc.id = doc.id || generateId(); doc.createdAt = doc.updatedAt; d.documents.push(doc); }
  saveAll(d);
  return doc;
}

export function deleteDocument(id) {
  const d = getData();
  trackDeletion(d, id);
  d.documents = (d.documents || []).filter(doc => doc.id !== id);
  saveAll(d);
}

// ─── Notificações de Estoque (Dentista → Recepção) ───────
export function getInventoryNotifications() {
  return getData().inventoryNotifications || [];
}

export function saveInventoryNotification(notif) {
  const d = getData();
  if (!d.inventoryNotifications) d.inventoryNotifications = [];
  notif.id = notif.id || generateId();
  notif.createdAt = new Date().toISOString();
  notif.status = notif.status || 'pending';
  d.inventoryNotifications.push(notif);
  saveAll(d);
  return notif;
}

export function dismissInventoryNotification(id) {
  const d = getData();
  const idx = (d.inventoryNotifications || []).findIndex(n => n.id === id);
  if (idx >= 0) {
    d.inventoryNotifications[idx].status = 'dismissed';
    d.inventoryNotifications[idx].updatedAt = new Date().toISOString();
    saveAll(d);
  }
}

// ─── Pacientes ───────────────────────────────────────────
export function getPatients() { return getData().patients || []; }
export function getPatient(id) { return getPatients().find(p => p.id === id); }
export function savePatient(p) {
  const d = getData();
  const idx = d.patients.findIndex(x => x.id === p.id);
  if (idx >= 0) d.patients[idx] = { ...d.patients[idx], ...p, updatedAt: new Date().toISOString() };
  else { p.id = p.id || generateId(); p.createdAt = new Date().toISOString(); p.updatedAt = p.createdAt; d.patients.push(p); }
  saveAll(d); return p;
}
export function deletePatient(id) {
  const d = getData();
  trackDeletion(d, id);
  d.patients = d.patients.filter(p => p.id !== id);
  saveAll(d);
}

// ─── Agendamentos ────────────────────────────────────────
export function getAppointments() { return getData().appointments || []; }
export function getAppointment(id) { return getAppointments().find(a => a.id === id); }
export function saveAppointment(a) {
  const d = getData();
  a.updatedAt = new Date().toISOString();
  const idx = d.appointments.findIndex(x => x.id === a.id);
  if (idx >= 0) d.appointments[idx] = { ...d.appointments[idx], ...a };
  else { a.id = a.id || generateId(); a.createdAt = a.updatedAt; d.appointments.push(a); }
  saveAll(d); return a;
}
export function deleteAppointment(id) {
  const d = getData();
  trackDeletion(d, id);
  d.appointments = d.appointments.filter(a => a.id !== id);
  saveAll(d);
}

export function completeAppointmentProcess(id) {
  const appt = getAppointment(id);
  if (!appt) return false;

  appt.status = 'completed';
  saveAppointment(appt);

  const value = Number(appt.value) || 0;
  
  if (value > 0) {
    saveTransaction({
      type: 'income', date: localDateStr(),
      amount: value, description: appt.procedure,
      category: 'Procedimento', patientId: appt.patientId,
      patientName: appt.patientName, method: 'PIX', status: 'paid'
    });
  }

  saveClinicalRecord({
    patientId: appt.patientId, date: new Date().toISOString(),
    procedure: appt.procedure, dentist: appt.dentist || 'Recepção',
    notes: 'Realizado e concluído pela agenda.', tooth: null
  });

  saveTreatment({
    patientId: appt.patientId, procedure: appt.procedure,
    totalSessions: 1, completedSessions: 1, value: value, paid: value,
    dentist: appt.dentist || 'Recepção', status: 'completed',
    startDate: new Date().toISOString(),
    durationSeconds: (appt.duration || 0) * 60
  });

  return true;
}


// ─── Transações Financeiras ──────────────────────────────
export function getTransactions() { return getData().transactions || []; }
export function saveTransaction(t) {
  const d = getData();
  t.updatedAt = new Date().toISOString();
  const idx = d.transactions.findIndex(x => x.id === t.id);
  if (idx >= 0) d.transactions[idx] = { ...d.transactions[idx], ...t };
  else { t.id = t.id || generateId(); t.createdAt = t.updatedAt; d.transactions.push(t); }
  saveAll(d); return t;
}
export function deleteTransaction(id) {
  const d = getData();
  trackDeletion(d, id);
  d.transactions = d.transactions.filter(t => t.id !== id);
  saveAll(d);
}

// ─── Estoque ─────────────────────────────────────────────
export function getInventory() { return getData().inventory || []; }
export function saveInventoryItem(item) {
  const d = getData();
  item.updatedAt = new Date().toISOString();
  const idx = d.inventory.findIndex(x => x.id === item.id);
  if (idx >= 0) d.inventory[idx] = { ...d.inventory[idx], ...item };
  else { item.id = item.id || generateId(); item.createdAt = item.updatedAt; d.inventory.push(item); }
  saveAll(d); return item;
}
export function deleteInventoryItem(id) {
  const d = getData();
  trackDeletion(d, id);
  d.inventory = d.inventory.filter(i => i.id !== id);
  saveAll(d);
}

// ─── Atendimentos ────────────────────────────────────────
export function getAttendances() { return getData().attendances || []; }
export function saveAttendance(a) {
  const d = getData();
  if (!d.attendances) d.attendances = [];
  a.updatedAt = new Date().toISOString();
  const idx = d.attendances.findIndex(x => x.id === a.id);
  if (idx >= 0) d.attendances[idx] = { ...d.attendances[idx], ...a };
  else { a.id = a.id || generateId(); a.createdAt = a.updatedAt; d.attendances.push(a); }
  saveAll(d); return a;
}
export function deleteAttendance(id) {
  const d = getData();
  trackDeletion(d, id);
  d.attendances = (d.attendances || []).filter(a => a.id !== id);
  saveAll(d);
}

export function completeAttendanceProcess(id, durationSeconds = 0) {
  const attendance = getAttendances().find(a => a.id === id);
  if (!attendance) return false;

  saveTransaction({
    type: 'income', date: localDateStr(),
    amount: attendance.value, description: attendance.procedure,
    category: 'Procedimento', patientId: attendance.patientId,
    patientName: attendance.patientName, method: 'PIX', status: 'paid'
  });

  saveClinicalRecord({
    patientId: attendance.patientId, date: new Date().toISOString(),
    procedure: attendance.procedure, dentist: attendance.dentist || 'Recepção',
    notes: 'Realizado e concluído no atendimento.', tooth: null
  });

  saveTreatment({
    patientId: attendance.patientId, procedure: attendance.procedure,
    totalSessions: 1, completedSessions: 1, value: attendance.value, paid: attendance.value,
    dentist: attendance.dentist || 'Recepção', status: 'completed',
    startDate: new Date().toISOString(),
    durationSeconds: durationSeconds // Novo campo para média de tempo
  });

  deleteAttendance(id);
  return true;
}

// ─── Atendimentos Cancelados ─────────────────────────────
export function getCancelledAttendances() { return getData().cancelledAttendances || []; }
export function saveCancelledAttendance(ca) {
  const d = getData();
  if (!d.cancelledAttendances) d.cancelledAttendances = [];
  ca.id = ca.id || generateId();
  ca.cancelledAt = ca.cancelledAt || new Date().toISOString();
  ca.updatedAt = new Date().toISOString();
  ca.createdAt = ca.updatedAt;
  d.cancelledAttendances.push(ca);
  saveAll(d);
  return ca;
}

// ─── Prontuário Clínico ──────────────────────────────────
export function getClinicalRecords(patientId) { return (getData().clinicalRecords || []).filter(r => r.patientId === patientId); }
export function saveClinicalRecord(r) {
  const d = getData();
  if (!d.clinicalRecords) d.clinicalRecords = [];
  r.updatedAt = new Date().toISOString();
  const idx = d.clinicalRecords.findIndex(x => x.id === r.id);
  if (idx >= 0) d.clinicalRecords[idx] = { ...d.clinicalRecords[idx], ...r };
  else { r.id = r.id || generateId(); r.createdAt = r.updatedAt; d.clinicalRecords.push(r); }
  saveAll(d); return r;
}

// ─── Fotos ───────────────────────────────────────────────
export function getPhotos(patientId) { return (getData().photos || []).filter(p => p.patientId === patientId); }
export function savePhoto(p) {
  const d = getData();
  if (!d.photos) d.photos = [];
  p.id = p.id || generateId();
  p.createdAt = new Date().toISOString();
  p.updatedAt = p.createdAt;
  d.photos.push(p); saveAll(d); return p;
}
export function deletePhoto(id) {
  const d = getData();
  trackDeletion(d, id);
  d.photos = (d.photos || []).filter(p => p.id !== id);
  saveAll(d);
}

// ─── Odontograma ─────────────────────────────────────────
export function getOdontogram(patientId) { return (getData().odontograms || {})[patientId] || {}; }
export function saveOdontogram(patientId, data) {
  const d = getData();
  if (!d.odontograms) d.odontograms = {};
  d.odontograms[patientId] = data; saveAll(d);
}

// ─── Tratamentos ─────────────────────────────────────────
export function getTreatments(patientId) { return (getData().treatments || []).filter(t => t.patientId === patientId); }
export function saveTreatment(t) {
  const d = getData();
  if (!d.treatments) d.treatments = [];
  t.updatedAt = new Date().toISOString();
  const idx = d.treatments.findIndex(x => x.id === t.id);
  if (idx >= 0) d.treatments[idx] = { ...d.treatments[idx], ...t };
  else { t.id = t.id || generateId(); t.createdAt = t.updatedAt; d.treatments.push(t); }
  saveAll(d); return t;
}

// ─── Dados Iniciais Seguros (Sem mock para evitar contaminação) ──
function getEmptyInitialData() {
  const allPerms = ['dashboard','atendimentos','pacientes','agenda','financeiro','estoque','relatorios','configuracoes','whatsapp','dentistas'];
  const recepPerms = ['dashboard','atendimentos','pacientes','agenda','estoque','configuracoes','whatsapp','dentistas'];
  const defaultUsers = [
    { id: generateId(), name: 'Administrador', role: 'admin', password: '123', permissions: allPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Recepção', role: 'recepcao', password: '123', permissions: recepPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];

  return {
    patients: [],
    appointments: [],
    transactions: [],
    inventory: [],
    clinicalRecords: [],
    treatments: [],
    photos: [],
    documents: [],
    odontograms: {},
    attendances: [],
    cancelledAttendances: [],
    inventoryNotifications: [],
    systemLogs: [],
    _deletions: [],
    settings: {
      clinicName: 'HS Corp',
      dentists: [],
      users: defaultUsers
    }
  };
}

function seedDemoData() {
  return getEmptyInitialData();
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
  const allPerms = ['dashboard','atendimentos','pacientes','agenda','financeiro','estoque','relatorios','configuracoes','whatsapp','dentistas'];
  const recepPerms = ['dashboard','atendimentos','pacientes','agenda','estoque','configuracoes','whatsapp','dentistas'];
  const emptyData = {
    patients: [],
    appointments: [],
    transactions: [],
    inventory: [],
    clinicalRecords: [],
    treatments: [],
    photos: [],
    documents: [],
    odontograms: {},
    attendances: [],
    inventoryNotifications: [],
    systemLogs: [],
    _deletions: [],
    settings: {
      clinicName: 'HS Corp',
      dentists: [],
      users: [
        { id: generateId(), name: 'Administrador', role: 'admin', password: '123', permissions: allPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: generateId(), name: 'Recepção', role: 'recepcao', password: '123', permissions: recepPerms, dentistId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
    }
  };
  _data = emptyData;
  saveAll(emptyData);
}
