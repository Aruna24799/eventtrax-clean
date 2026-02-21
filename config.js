const SUPABASE_URL = "https://pxtpsugbuunjzurdvzkc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dHBzdWdidXVuanp1cmR2emtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDY4OTIsImV4cCI6MjA4NjEyMjg5Mn0.VXRKe2AXSiv8vRxfoPDyBl9McRmkYDVUBcRN2Jy6q5g";

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
async function requireAuth() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    window.location.href = "auth.html";
    return null;
  }
  return data.session;
}

async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  return profile;
}

// UI helpers
function toast(msg) {
  alert(msg);
}

function showLoading(btn, txt) {
  btn.disabled = true;
  btn.innerHTML = txt;
}

function hideLoading(btn) {
  btn.disabled = false;
}
