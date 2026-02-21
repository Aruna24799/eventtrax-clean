const SUPABASE_URL = 'https://pxtpsugbuunjzurdvzkc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dHBzdWdidXVuanp1cmR2emtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDY4OTIsImV4cCI6MjA4NjEyMjg5Mn0.VXRKe2AXSiv8vRxfoPDyBl9McRmkYDVUBcRN2Jy6q5g';

// Init Supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth Helpers ───────────────────────────────────────────

async function getSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    return session;
  } catch(e) {
    console.error('Session error:', e);
    return null;
  }
}

async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data } = await db.from('profiles').select('*').eq('id', session.user.id).single();
    return data;
  } catch(e) {
    console.error('Get user error:', e);
    return null;
  }
}

async function requireAuth(redirectTo = 'auth.html') {
  const session = await getSession();
  if (!session) { 
    window.location.href = redirectTo; 
    return null; 
  }
  return session;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') { 
    window.location.href = 'participant.html'; 
    return null; 
  }
  return user;
}

async function logout() {
  try {
    await db.auth.signOut();
    window.location.href = 'index.html';
  } catch(e) {
    console.error('Logout error:', e);
    toast('Error signing out', 'error');
  }
}

// ─── Toast Notifications ────────────────────────────────────

function toast(message, type = 'info') {
  const colors = { 
    success: '#00d4aa', 
    error: '#ef4444', 
    info: '#6366f1', 
    warning: '#f59e0b' 
  };
  const icons = { 
    success: '✓', 
    error: '✕', 
    info: 'ℹ', 
    warning: '⚠' 
  };
  
  const t = document.createElement('div');
  t.innerHTML = `<span class="toast-icon" style="background:${colors[type]}">${icons[type]}</span><span>${message}</span>`;
  t.className = 'toast-notification';
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    display:flex;align-items:center;gap:12px;
    background:rgba(20,20,30,0.95);border:1px solid rgba(255,255,255,0.1);
    backdrop-filter:blur(20px);border-radius:12px;padding:14px 20px;
    color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
    animation:slideInToast 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
    max-width:360px;
  `;
  
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideInToast { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes slideOutToast { from { transform:translateX(0); opacity:1; } to { transform:translateX(120%); opacity:0; } }
      .toast-icon { display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:12px;font-weight:700;flex-shrink:0; }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(t);
  
  setTimeout(() => {
    t.style.animation = 'slideOutToast 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ─── Format Helpers ─────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}

function getStatusColor(status) {
  const colors = {
    open: '#00d4aa',
    closed: '#ef4444',
    draft: '#6366f1',
    completed: '#f59e0b'
  };
  return colors[status] || '#888';
}

function getCategoryEmoji(cat) {
  const m = {
    Tech: '💻',
    Business: '💼',
    Design: '🎨',
    Marketing: '📈',
    Science: '🔬',
    Art: '🎭',
    Health: '🏥',
    Education: '📚',
    Sports: '⚽',
    Music: '🎵',
    General: '🎪'
  };
  return m[cat] || '🎪';
}

// ─── QR Code Generator ──────────────────────────────────────

function generateQR(container, text, size = 160) {
  try {
    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: text,
        width: size,
        height: size,
        colorDark: '#000',
        colorLight: '#fff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#888">QR library not loaded</div>';
    }
  } catch(e) {
    console.error('QR generation error:', e);
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444">QR generation failed</div>';
  }
}

// ─── Certificate Generator ──────────────────────────────────

function downloadCertificate(certData) {
  try {
    const { participantName, eventName, eventDate, certId, issuedBy } = certData;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 1200, 850);
    bg.addColorStop(0, '#0a0a14');
    bg.addColorStop(1, '#12121e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 850);

    // Gold border
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 1140, 790);
    ctx.strokeStyle = 'rgba(201,168,76,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, 1110, 760);

    // Corner ornaments
    const corners = [[60,60],[1140,60],[60,790],[1140,790]];
    corners.forEach(([x,y]) => {
      ctx.fillStyle = '#c9a84c';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI*2);
      ctx.fill();
    });

    // Header
    ctx.fillStyle = '#00d4aa';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⬡  EVENTTRAX  ⬡', 600, 110);

    ctx.fillStyle = '#c9a84c';
    ctx.font = 'bold 52px Georgia';
    ctx.fillText('Certificate of Participation', 600, 190);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '18px Arial';
    ctx.fillText('This is to certify that', 600, 260);

    // Participant name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Georgia';
    ctx.fillText(participantName, 600, 360);
    
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 380);
    ctx.lineTo(1000, 380);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '18px Arial';
    ctx.fillText('has successfully participated in', 600, 430);

    ctx.fillStyle = '#00d4aa';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(eventName, 600, 490);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px Arial';
    ctx.fillText(`Held on: ${eventDate}`, 600, 540);

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '14px Arial';
    ctx.fillText(`Certificate ID: ${certId}  •  Issued by ${issuedBy || 'EventTrax Platform'}`, 600, 720);

    // Signature lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, 680);
    ctx.lineTo(500, 680);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(700, 680);
    ctx.lineTo(1050, 680);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px Arial';
    ctx.fillText('Authorized Signature', 325, 700);
    ctx.fillText('Event Organizer', 875, 700);

    // Download
    const link = document.createElement('a');
    link.download = `EventTrax-Certificate-${certId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast('Certificate downloaded!', 'success');
  } catch(e) {
    console.error('Certificate generation error:', e);
    toast('Failed to generate certificate', 'error');
  }
}

// ─── Loading States ─────────────────────────────────────────

function showLoading(el, text = 'Loading...') {
  if (!el) return;
  el._originalHTML = el.innerHTML;
  el.disabled = true;
  el.innerHTML = `<span class="spinner"></span>${text}`;
}

function hideLoading(el) {
  if (!el) return;
  el.disabled = false;
  el.innerHTML = el._originalHTML || el.innerHTML;
}

// ─── Error Handler ──────────────────────────────────────────

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// ─── Check Supabase Connection ──────────────────────────────

async function checkSupabaseConnection() {
  if (SUPABASE_URL.includes('YOUR_PROJECT')) {
    console.warn('⚠️ Supabase not configured. Please update config.js with your credentials.');
    return false;
  }
  return true;
}


