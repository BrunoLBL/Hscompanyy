export function formatCurrency(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function formatDate(d){if(!d)return'';const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);const dt=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(d);return dt.toLocaleDateString('pt-BR')}
export function formatDateTime(d){if(!d)return'';const dt=new Date(d);return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
export function formatPhone(p){if(!p)return'';const n=p.replace(/\D/g,'');if(n.length===11)return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;if(n.length===10)return`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;return p}
export function formatCPF(c){if(!c)return'';const n=c.replace(/\D/g,'');if(n.length===11)return`${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;return c}
export function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
export function debounce(fn,ms=300){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
export function getInitials(name){if(!name)return'?';return name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()}
export function daysBetween(a,b){return Math.floor((new Date(b)-new Date(a))/(1e3*60*60*24))}
export function isToday(d){const t=new Date(),dt=new Date(d);return t.toDateString()===dt.toDateString()}
export function getAge(birth){if(!birth)return'';const b=new Date(birth),t=new Date();let a=t.getFullYear()-b.getFullYear();if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;return a}

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Determina se um agendamento é uma "falta" (no-show).
 * Regra: 5 horas devem ter se passado desde o horário agendado,
 * e o status NÃO pode ser 'completed' nem 'cancelled'.
 * @param {Object} appt - Objeto do agendamento com date, time, duration, status
 * @param {Date} [now] - Data/hora atual (opcional, para testes)
 * @returns {boolean}
 */
export function isNoShow(appt, now = new Date()) {
  if (!appt || !appt.date) return false;
  if (appt.status === 'completed' || appt.status === 'cancelled') return false;

  const todayStr = now.toISOString().slice(0, 10);
  // Future appointments can never be no-shows
  if (appt.date > todayStr) return false;

  // Build the scheduled datetime
  const [h, m] = (appt.time || '00:00').split(':').map(Number);
  const apptDate = new Date(appt.date + 'T00:00:00');
  apptDate.setHours(h, m, 0, 0);

  // Must have 5 hours elapsed since the scheduled time
  const fiveHoursMs = 5 * 60 * 60 * 1000;
  return (now.getTime() - apptDate.getTime()) >= fiveHoursMs;
}

