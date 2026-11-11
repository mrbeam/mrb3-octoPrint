const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');const {JSDOM}=require('jsdom');
(async()=>{
const logging=fs.existsSync('src/octoprint/plugins/logging');
const pkg=logging?'src/octoprint/plugins/logging':'octoprint_findmymrbeam',id=logging?'logging':'findmymrbeam';
const dom=new JSDOM('<div id="host"></div>',{url:'https://machine.test/#settings,'+id,runScripts:'outside-only'}),w=dom.window;
const $=require('jquery')(w);global.window=w;w.$=w.jQuery=$;w.eval(fs.readFileSync(require.resolve('knockout'),'utf8'));const ko=w.ko;
w._=require('lodash');w._.contains=w._.includes;w._.sprintf=(s,v)=>s.replace(/%\((\w+)\)[sd]/g,(_,k)=>v[k]);w.gettext=s=>s;w.mrbeam={viewModels:{}};w.OCTOPRINT_VIEWMODELS=[];w.BASEURL='/';
w.formatSize=String;w.formatDate=String;w.Modernizr={localstorage:true};
$.fn.tooltip=$.fn.popover= function(){return this;};
const requests=[];$.get=()=>{const d=$.Deferred();d.abort=()=>d.reject({status:0});requests.push(d);return d;};$.ajax=()=>$.Deferred().resolve({});
w.showConfirmationDialog=(_,fn)=>fn();
if(logging){
 w.eval(fs.readFileSync(path.join(process.env.OCTOPRINT_SOURCE,'src/octoprint/static/js/app/helpers.js'),'utf8'));
 w.formatSize=String;w.formatDate=String;
 w.OctoPrint={plugins:{logging:{bulkDownloadUrl:files=>'/downloads/logs?'+files.join(','),deleteLog:()=>$.Deferred().resolve({})}}};
}
w.eval(fs.readFileSync(pkg+'/static/js/'+(logging?'logging.js':'findmymrbeam_settings_viewmodel.js'),'utf8'));await new Promise(r=>$(r));
const {mount}=await import('data:text/javascript;base64,'+fs.readFileSync(pkg+'/static/settings/main.js').toString('base64'));
const html=execFileSync(process.env.SETTINGS_TEST_PYTHON||'python3',['tests/provider/render_template.py',pkg,id],{encoding:'utf8'});
let active=0,opts,cleanups=[],model,write,restore,dirty=false,saves=0,put,fail=false;
const settings={settings:{plugins:{findmymrbeam:{enabled:ko.observable(true),name:()=> 'Beam',uuid:()=> 'test',searchId:()=> 'id',registered:()=>true,ping:()=>false}}},saveData:()=>{saves++;return $.Deferred().resolve();}};
const snapshot=logging?{logs:{files:[{name:'test.log',size:10,date:1,refs:{download:'/download/test.log'}}],free:100,total:1000},setup:{loggers:['octoprint','tornado'],levels:{octoprint:'INFO'}},serial_log:{enabled:false},plugintimings_log:{enabled:false}}:{registered:true,ping:true,name:'Beam'};
const ctx={container:w.document.querySelector('#host'),signal:new AbortController().signal,ui:{$,ko,notify:e=>{throw e;}},cleanup:f=>cleanups.push(f),stylesheet:async()=>{},
legacy:{prepare:async()=>({html}),script:async()=>{},constructor:()=>function(...args){const C=w.OCTOPRINT_VIEWMODELS[0].construct||w.OCTOPRINT_VIEWMODELS[0][0];model=new C(...args);return model;},login:()=>({isAdmin:()=>true,isUser:()=>true,hasPermission:()=>true}),root:(c,id,d)=>{const n=w.document.createElement('div');n.id=id;n.innerHTML=d.html;c.append(n);return n;},clean:(n,m)=>{ko.cleanNode(n);Object.values(m).filter(ko.isComputed).forEach(v=>v.dispose());}},
settings:{load:async()=>settings,createAutosave:(fn,reset)=>{write=fn;restore=reset;return {schedule:async()=>{dirty=true;},dirty:()=>dirty};}},
request:async(url,options)=>{if(options?.method==='PUT'){if(fail)throw Error('rejected');put=JSON.parse(options.body);return {};}return {json:async()=>snapshot};},
events:{subscribe:(m,o)=>{opts=o;active++;let stopped=false;return ()=>{if(!stopped){stopped=true;active--;}};}}};
for(let n=0;n<3;n++){
 const view=await mount(ctx);view.setVisible(true);view.setVisible(true);
 if(logging){
  await model.requestData();assert.equal(model.configuredLoggers()[0].level(),'INFO');
  assert.equal(ctx.container.querySelector('tbody .settings_logs_name').textContent,'test.log');
  model.configuredLoggers()[0].level('DEBUG');assert.equal(dirty,true);
  await model.requestData();assert.equal(model.configuredLoggers()[0].level(),'DEBUG');
  fail=true;await assert.rejects(write(),/rejected/);assert.equal(model.configuredLoggers()[0].level(),'DEBUG');fail=false;
  await write();assert.equal(put.octoprint,'DEBUG');dirty=false;
  model.configuredLoggers()[0].level('ERROR');restore();assert.equal(model.configuredLoggers()[0].level(),'DEBUG');dirty=false;
  model.markedForDeletion(['test.log']);assert.match(model.bulkDownloadUrl(),/test.log/);
 }else{
  assert.equal(active,1);await opts.fallback();assert.equal(model.ping(),true);
  const before=saves;model.enabled(!model.enabled());assert.equal(saves,before+1);
  requests.at(-1).resolve({verified:true},'success',{status:200});assert.equal(model.verified(),true);
  model.verifyByFrontend();requests.at(-1).reject({status:0});assert.equal(model.verified(),false);
  model.verifyByFrontend();const pending=requests.at(-1);view.setVisible(false);assert.equal(pending.state(),'rejected');assert.equal(active,0);
 }
 view.setVisible(false);view.setVisible(true);view.dispose();view.dispose();cleanups.forEach(fn=>fn());cleanups=[];
 assert.equal(active,0);assert.equal(ctx.container.children.length,0);
 if(!logging)assert.equal(w.mrbeam.viewModels.findmymrbeamSettingsViewModel,undefined);
}
dom.window.close();console.log('PASS '+id+' real template bindings, actions, failure recovery and lifecycle');
})().catch(e=>{console.error(e);process.exit(1);});
