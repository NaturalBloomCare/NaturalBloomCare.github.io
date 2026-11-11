(function(){
  var cfg = window.BLOOM_CONFIG;
  var token = new URLSearchParams(location.search).get('t') || '';
  var msg = document.getElementById('msg');
  function say(t){ msg.textContent = t; }
  if(!token){ say('This link is missing its token.'); return; }
  function call(body){
    return fetch(cfg.url + '/functions/v1/open-secure-link', {
      method:'POST',
      headers:{ 'content-type':'application/json', apikey: cfg.publishableKey },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }
  document.getElementById('ask').addEventListener('click', function(){
    say('Sending a code…');
    call({ token: token, action: 'request-code' }).then(function(j){
      say(j.message || j.status || 'Done.');
    }).catch(function(){ say('The code could not be requested.'); });
  });
  document.getElementById('form').addEventListener('submit', function(e){
    e.preventDefault();
    say('Checking the code…');
    call({ token: token, action: 'confirm', code: document.getElementById('code').value }).then(function(j){
      if(j.url){ say('Opening the document. This link expires in about two minutes.'); location.href = j.url; }
      else say(j.message || 'The code was not accepted.');
    }).catch(function(){ say('The document could not be opened.'); });
  });
})();
