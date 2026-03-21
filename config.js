// ── Singleton Supabase client ─────────────────────────────────
const SUPABASE_URL      = 'https://pxtpsugbuunjzurdvzkc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dHBzdWdidXVuanp1cmR2emtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDY4OTIsImV4cCI6MjA4NjEyMjg5Mn0.VXRKe2AXSiv8vRxfoPDyBl9McRmkYDVUBcRN2Jy6q5g';

if (!window._db) {
  window._db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });
}
const db = window._db;

// ── Reliable session resolver — fires after URL tokens are parsed ──
function waitForSession() {
  return new Promise((resolve) => {
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      subscription.unsubscribe();
      resolve(session);
    });
  });
}

async function getSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    return session;
  } catch { return null; }
}

// ── Get profile, auto-create if missing ──────────────────────
async function getCurrentUser() {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await db
      .from('profiles').select('*').eq('id', user.id).single();

    if (!error && profile) return profile;

    // Auto-create missing profile
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const role = user.user_metadata?.role || 'participant';
    const { data: created } = await db.from('profiles').upsert({
      id: user.id, full_name: name, role,
      organization: user.user_metadata?.organization || '', bio: ''
    }, { onConflict: 'id' }).select().single();
    return created || null;
  } catch (e) { console.error('getCurrentUser:', e); return null; }
}

async function logout() {
  await db.auth.signOut();
  window.location.href = 'auth.html';
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  document.querySelectorAll('.et-toast').forEach(t => t.remove());
  const colors = { success:'#00d4aa', error:'#ef4444', warning:'#f59e0b', info:'#6366f1' };
  const icons  = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  if (!document.getElementById('et-anim')) {
    const s = document.createElement('style'); s.id = 'et-anim';
    s.textContent = `
      @keyframes etIn  {from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes etOut {from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}
      @keyframes etSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(s);
  }
  const el = document.createElement('div');
  el.className = 'et-toast';
  el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;
    align-items:center;gap:12px;background:rgba(14,14,26,.97);border:1px solid rgba(255,255,255,.1);
    backdrop-filter:blur(20px);border-radius:12px;padding:14px 20px;color:#f1f1f5;
    font-family:'DM Sans',sans-serif;font-size:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
    max-width:360px;animation:etIn .35s cubic-bezier(.175,.885,.32,1.275);`;
  el.innerHTML = `<span style="background:${colors[type]};color:#000;width:22px;height:22px;
    border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:800;flex-shrink:0">${icons[type]}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.animation='etOut .3s ease forwards'; setTimeout(()=>el.remove(),300); }, 3500);
}

// ── Button loading ────────────────────────────────────────────
function showLoading(el, text = 'Loading...') {
  if (!el) return; el._orig = el.innerHTML; el.disabled = true;
  el.innerHTML = `<span style="width:14px;height:14px;border:2px solid rgba(0,0,0,.25);
    border-top-color:#000;border-radius:50%;animation:etSpin .7s linear infinite;
    display:inline-block;vertical-align:middle;margin-right:6px"></span>${text}`;
}
function hideLoading(el) {
  if (!el) return; el.disabled = false;
  if (el._orig != null) el.innerHTML = el._orig;
}

// ── Formatters ────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}); }
  catch { return d; }
}
function formatTime(t) {
  if (!t) return '';
  const [h,m] = t.split(':'); const hr = parseInt(h,10);
  return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}`;
}
function timeAgo(ds) {
  if (!ds) return '';
  const mins = Math.floor((Date.now()-new Date(ds))/60000);
  if (mins<1) return 'just now'; if (mins<60) return `${mins}m ago`;
  if (mins<1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}
function getCategoryEmoji(cat) {
  return {Tech:'💻',Business:'💼',Design:'🎨',Marketing:'📈',Science:'🔬',
    Art:'🎭',Health:'🏥',Education:'📚',Sports:'⚽',Music:'🎵',General:'🎪'}[cat]||'🎪';
}

// ── Certificate generator ─────────────────────────────────────
function downloadCertificate({ participantName, eventName, eventDate, certId, issuedBy }) {
  try {
    const W=1200,H=850; const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    const c=cv.getContext('2d');
    const bg=c.createLinearGradient(0,0,W,H); bg.addColorStop(0,'#0a0a14'); bg.addColorStop(1,'#12121e');
    c.fillStyle=bg; c.fillRect(0,0,W,H);
    c.strokeStyle='#c9a84c'; c.lineWidth=3; c.strokeRect(30,30,W-60,H-60);
    c.strokeStyle='rgba(201,168,76,.3)'; c.lineWidth=1; c.strokeRect(45,45,W-90,H-90);
    [[60,60],[W-60,60],[60,H-60],[W-60,H-60]].forEach(([x,y])=>{
      c.fillStyle='#c9a84c'; c.beginPath(); c.arc(x,y,7,0,Math.PI*2); c.fill();
    });
    c.textAlign='center';
    c.fillStyle='#00d4aa'; c.font='bold 17px Arial'; c.fillText('⬡  EVENTTRAX  ⬡',W/2,108);
    c.fillStyle='#c9a84c'; c.font='bold 50px Georgia'; c.fillText('Certificate of Participation',W/2,188);
    c.fillStyle='rgba(255,255,255,.45)'; c.font='18px Arial'; c.fillText('This is to certify that',W/2,258);
    c.fillStyle='#ffffff'; c.font='bold 60px Georgia'; c.fillText(participantName,W/2,355);
    c.strokeStyle='#c9a84c'; c.lineWidth=1;
    c.beginPath(); c.moveTo(180,375); c.lineTo(W-180,375); c.stroke();
    c.fillStyle='rgba(255,255,255,.5)'; c.font='18px Arial'; c.fillText('has successfully participated in',W/2,425);
    c.fillStyle='#00d4aa'; c.font='bold 34px Arial'; c.fillText(eventName,W/2,485);
    c.fillStyle='rgba(255,255,255,.4)'; c.font='16px Arial'; c.fillText('Held on: '+eventDate,W/2,535);
    c.fillStyle='rgba(255,255,255,.2)'; c.font='13px Arial';
    c.fillText(`Certificate ID: ${certId}  •  Issued by ${issuedBy||'EventTrax'}`,W/2,715);
    c.strokeStyle='rgba(255,255,255,.15)'; c.lineWidth=1;
    c.beginPath(); c.moveTo(150,675); c.lineTo(480,675); c.stroke();
    c.beginPath(); c.moveTo(W-480,675); c.lineTo(W-150,675); c.stroke();
    c.fillStyle='rgba(255,255,255,.3)'; c.font='12px Arial';
    c.fillText('Authorized Signature',315,695); c.fillText('Event Organizer',W-315,695);
    const a=document.createElement('a'); a.download=`EventTrax-${certId}.png`;
    a.href=cv.toDataURL('image/png'); a.click();
    toast('Certificate downloaded!','success');
  } catch(e) { console.error(e); toast('Failed to generate certificate','error'); }
}
