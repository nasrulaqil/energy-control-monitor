firebase.auth().onAuthStateChanged(async user=>{
 if(!user){ window.location.href="../index.html"; return; }
 try {
   const r=await authFetch("/api/auth/profile"); const j=await r.json();
   if(j.status==="OK") {
     window.currentUserProfile=j.data;
     if(!j.data.device_id && !location.pathname.endsWith("setup-device.html")){ location.href="setup-device.html"; return; }
     if(j.data.device_id) localStorage.setItem("smartEnergyDeviceId",j.data.device_id);
     document.dispatchEvent(new CustomEvent("smartenergy:profile",{detail:j.data}));
   }
 } catch(e){ console.error("Profile load error",e); }
});
async function logoutUser(){ await firebase.auth().signOut(); localStorage.removeItem("smartEnergyDeviceId"); window.location.href="../index.html"; }
