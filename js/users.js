const addUserForm=document.getElementById("addUserForm"), userList=document.getElementById("userList"), userMessage=document.getElementById("userMessage");
async function loadUsers(){
 try{const r=await authFetch("/api/users");const j=await r.json();if(r.status===403){document.getElementById("userManagementCard")?.remove();return;}if(j.status!=="OK")throw new Error(j.message);
 userList.innerHTML=j.data.length?j.data.map(u=>`<div class="d-flex justify-content-between border-bottom py-2"><span><strong>${esc(u.name||"User")}</strong><br>${esc(u.email||"")}</span><span class="badge bg-primary align-self-center">${esc(u.role||"user")}</span></div>`).join(""):"No users.";}catch(e){userList.textContent=e.message;}
}
addUserForm?.addEventListener("submit",async e=>{e.preventDefault();userMessage.textContent="Adding...";try{const r=await authFetch("/api/users",{method:"POST",body:JSON.stringify({name:newUserName.value,email:newUserEmail.value,password:newUserPassword.value})});const j=await r.json();if(!r.ok)throw new Error(j.message);userMessage.textContent="User added. Notification created.";addUserForm.reset();loadUsers();}catch(err){userMessage.textContent=err.message;}});
function esc(v){const d=document.createElement("div");d.textContent=String(v);return d.innerHTML;}
firebase.auth().onAuthStateChanged(u=>{if(u)loadUsers();});
