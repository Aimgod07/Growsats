const fs = require('node:fs');
function edit(path,before,after){const source=fs.readFileSync(path,'utf8');if(!source.includes(before))throw new Error('Missing source: '+before);fs.writeFileSync(path,source.replace(before,after));}
const backend='C:/Users/choud/Desktop/playloot-backend/src/routes/pms.js';
edit(backend,'  return readPublishedConfig(env);',`  const published = await readPublishedConfig(env);
  const providers = await env.DB.prepare('SELECT id,enabled,updated_at,endpoint,data_path FROM game_providers ORDER BY id').all();
  return {...published,catalogRevision:await sha256(JSON.stringify(providers.results))};`);
edit(backend,'    const headers = { accept: "application/json" };\n    if (provider.api_key_encrypted)', '    try {\n    const headers = { accept: "application/json" };\n    if (provider.api_key_encrypted)');
edit(backend,"    try {\n    if(!safeProviderUrl", "    if(!safeProviderUrl");
edit(backend,'atPath(data, provider.data_path) || data?.data || data?.games || data', 'atPath(data, provider.data_path) || data?.data?.games || data?.games || data?.data || data');
const pms='C:/Users/choud/Desktop/playloot-pms/src/App.jsx';
edit(pms,'function Toggle({checked,onChange,label})', 'function Toggle({checked,onChange,label,disabled=false})');
edit(pms,"className={'toggle '+(checked?'on':'')} onClick", "disabled={disabled} className={'toggle '+(checked?'on':'')} onClick");
edit(pms,'<Toggle label="Fetch games" checked={p.enabled} onChange={v=>setP({...p,enabled:v})}/>', '<Toggle label="Fetch games" disabled={busy} checked={p.enabled} onChange={v=>{if(p.id)onSave({...provider,enabled:v});else setP({...p,enabled:v})}}/>');
edit(pms,'Players receive the configuration the next time the app opens.', 'Players receive published changes within 30 seconds while the app is active. Provider switches save immediately.');
edit(pms,'Published. The app will use these changes on its next load.', 'Published. Active apps receive changes within 30 seconds.');
