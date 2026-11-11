(function(){
  var cfg = window.BLOOM_CONFIG;
  var sb = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { detectSessionInUrl: true, persistSession: true } });
  var form = document.getElementById('form');
  var err = document.getElementById('err');
  function show(el){ el.hidden = false; }
  sb.auth.onAuthStateChange(function(event){
    if(event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') show(form);
  });
  sb.auth.getSession().then(function(r){ if(r.data.session) show(form); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    err.hidden = true;
    sb.auth.updateUser({ password: document.getElementById('pw').value }).then(function(r){
      if(r.error){ err.hidden = false; err.textContent = r.error.message; return; }
      form.hidden = true;
      document.getElementById('done').hidden = false;
      sb.auth.signOut();
    });
  });
})();
