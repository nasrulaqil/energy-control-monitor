async function loadNotifications(){
 const list=document.getElementById("activityList"); if(!list) return;
 try { const r=await authFetch("/api/notifications"); const j=await r.json(); if(j.status!=="OK") return;
  if(!j.data.length){list.innerHTML='<div class="text-muted py-3">No notifications yet.</div>';return;}
  list.innerHTML=j.data.map(n=>`<div class="activity-item"><div class="activity-icon bg-primary"><i class="bi bi-person-plus-fill"></i></div><div class="activity-content"><strong>${escapeHtml(n.title||"Notification")}</strong><small>${escapeHtml(n.message||"")}</small></div><span class="activity-time">${new Date(n.created_at).toLocaleString()}</span></div>`).join("");
 } catch(e){console.error("Notification load error",e);}
}
function escapeHtml(v){const d=document.createElement("div");d.textContent=String(v);return d.innerHTML;}
firebase.auth().onAuthStateChanged(u=>{if(u){loadNotifications();setInterval(loadNotifications,15000);}});
document.getElementById("clearActivity")?.remove();
