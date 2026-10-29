export function formatCurrency(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function formatDate(d){if(!d)return'';const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);const dt=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(d);return dt.toLocaleDateString('pt-BR')}
export function formatDateTime(d){if(!d)return'';const dt=new Date(d);return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
export function formatPhone(p){if(!p)return'';const n=p.replace(/\D/g,'');if(n.length===11)return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;if(n.length===10)return`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;return p}
export function formatCPF(c){if(!c)return'';const n=c.replace(/\D/g,'');if(n.length===11)return`${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;return c}
export function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
export function debounce(fn,ms=300){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
export function getInitials(name){if(!name)return'?';return name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()}
export function daysBetween(a,b){return Math.floor((new Date(b)-new Date(a))/(1e3*60*60*24))}
export function isToday(d){if(!d)return false;const t=new Date(),dt=parseLocalDate(d);return !!dt&&t.toDateString()===dt.toDateString()}

/**
 * Converte uma data em objeto Date LOCAL.
 * Strings "YYYY-MM-DD" são interpretadas no fuso local (new Date('2026-10-01')
 * interpreta como UTC e, no Brasil, vira 30/09 às 21h — causando erros de dia/mês).
 * @param {string|Date} d
 * @returns {Date|null}
 */
export function parseLocalDate(d){if(!d)return null;if(d instanceof Date)return d;const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);const dt=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(s);return isNaN(dt.getTime())?null:dt}

/**
 * Retorna "YYYY-MM-DDTHH:MM" no horário LOCAL (para inputs datetime-local).
 * toISOString().slice(0,16) retorna UTC (3h adiantado no Brasil).
 */
export function localDateTimeStr(date = new Date()){const p=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`}

/**
 * Converte um timestamp ISO (UTC) para a data local "YYYY-MM-DD".
 */
export function isoToLocalDateStr(iso){if(!iso)return '';const dt=new Date(iso);if(isNaN(dt.getTime()))return '';return localDateStr(dt)}

/**
 * Verifica senha aceitando tanto texto puro (legado) quanto hash SHA-256.
 */
export async function verifyPassword(stored, input){if(stored==null||input==null)return false;if(stored===input)return true;return stored===await hashPassword(input)}

/**
 * Lê um arquivo de imagem e devolve um dataURL JPEG redimensionado/comprimido.
 * Evita estourar o limite do localStorage (~5MB) com fotos de celular (3-8MB cada).
 */
export function compressImage(file, maxSize = 1600, quality = 0.8){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Lê um arquivo qualquer como dataURL. */
export function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=e=>resolve(e.target.result);r.onerror=reject;r.readAsDataURL(file)})}

/** Gera N cores distintas (para gráficos com quantidade variável de categorias). */
export function chartColors(n){const base=['#1E6FD9','#E74C3C','#F5A623','#9B59B6','#1ABC9C','#E91E63','#00C48C','#34495E','#FF7F50','#8E44AD'];return Array.from({length:n},(_,i)=>i<base.length?base[i]:`hsl(${(i*137.5)%360},60%,55%)`)}
export function getAge(birth){if(!birth)return'';const b=parseLocalDate(birth),t=new Date();if(!b)return'';let a=t.getFullYear()-b.getFullYear();if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;return a}

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
 * Retorna a data LOCAL no formato YYYY-MM-DD.
 * Diferente de toISOString().slice(0,10) que retorna UTC.
 * @param {Date} [date] - Data (padrão: agora)
 * @returns {string} Ex: "2026-07-01"
 */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const todayStr = localDateStr(now);
  // Future appointments can never be no-shows
  if (appt.date > todayStr) return false;

  // Build the scheduled datetime (local timezone)
  const [h, m] = (appt.time || '00:00').split(':').map(Number);
  const apptDate = new Date(appt.date + 'T00:00:00');
  apptDate.setHours(h, m, 0, 0);

  // Must have 5 hours elapsed since the scheduled time
  const fiveHoursMs = 5 * 60 * 60 * 1000;
  return (now.getTime() - apptDate.getTime()) >= fiveHoursMs;
}
