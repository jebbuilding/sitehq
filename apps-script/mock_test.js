const fs=require('fs');const vm=require('vm');
const sheets={};function mkSheet(n){const s={rows:[],appendRow(r){this.rows.push(r.slice())},getDataRange(){const self=this;return{getValues(){return self.rows.map(r=>r.slice())}}},getRange(row,c,nr,nc){const self=this;return{setValues(v){self.rows[row-1]=v[0].slice()},setFontWeight(){}}},setFrozenRows(){}};return s}
const ctx={SpreadsheetApp:{getActive:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=mkSheet(n))}),getUi:()=>({alert(){},createMenu(){return{addItem(){return this},addToUi(){}}}})},
 PropertiesService:{getScriptProperties:()=>({p:ctx.__p||(ctx.__p={}),getProperty(k){return this.p[k]||null},setProperty(k,v){this.p[k]=v}})},
 ScriptApp:{getProjectTriggers:()=>[],deleteTrigger(){},newTrigger:()=>({timeBased(){return this},everyHours(){return this},create(){}})},
 Utilities:{getUuid:()=>require('crypto').randomUUID(),formatDate:(d)=>d.toISOString().slice(11,16),base64DecodeWebSafe:s=>Buffer.from(s,'base64url'),newBlob:b=>({getDataAsString:()=>Buffer.from(b).toString('utf8')})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Logger:{log(){}},
 HtmlService:{createHtmlOutput:h=>({h,setTitle(){return this}}),createTemplateFromFile:()=>({evaluate(){return{setTitle(){return this},addMetaTag(){return this},setXFrameOptionsMode(){return this}}}}),XFrameOptionsMode:{ALLOWALL:1}},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('Code.gs','utf8')+';this.__f={setup,doGet,getSite,checkPerson,signIn,signOut,autoSignOut,props};',ctx);const F=ctx.__f;
F.setup();const key=ctx.__p.ADMIN_KEY;
const site={id:"s1",name:"4 Rolle Road",address:"Exmouth",version:1,details:[["Site manager","James 07917"]],items:["I know the rules"],phone:"07917 646970"};
const b64=Buffer.from(JSON.stringify(site)).toString('base64url');
console.log('bad key',F.doGet({parameter:{setup:b64,key:'x'}}).h.includes("isn't right"));
console.log('setup',F.doGet({parameter:{setup:b64,key}}).h.includes('set up for QR'));
let s=F.getSite("s1");console.log('site',s.name,s.items.length,s.onSite.length);
let c=F.checkPerson("s1","07700 900123");console.log('new person',JSON.stringify(c));
try{F.signIn({siteId:"s1",name:"Tom",company:"ABC",mobile:"07700900123",inducted:false})}catch(e){console.log('blocked without induction:',e.message)}
let r=F.signIn({siteId:"s1",name:"Tom Baker",company:"ABC",mobile:"07700 900123",inducted:true});console.log('signed in',r.ok,!!r.id);
console.log('on site',F.getSite("s1").onSite.map(x=>x.name));
c=F.checkPerson("s1","+447700900123");console.log('returning',JSON.stringify(c));
console.log('again',JSON.stringify(F.signIn({siteId:"s1",name:"Tom Baker",company:"ABC",mobile:"07700900123",inducted:false})));
console.log('out',JSON.stringify(F.signOut(r.id)));
c=F.checkPerson("s1","07700900123");console.log('after out',c.needInduction,c.openId);
let r2=F.signIn({siteId:"s1",name:"Tom Baker",company:"ABC",mobile:"07700900123",inducted:false});console.log('2nd visit no induction',r2.ok);
site.version=2;F.doGet({parameter:{setup:Buffer.from(JSON.stringify(site)).toString('base64url'),key}});F.signOut(r2.id);
c=F.checkPerson("s1","07700900123");console.log('after change',c.needInduction,c.changed);
const ex=F.doGet({parameter:{export:1,key,since:0}}).h;console.log('export rows',(ex.match(/qr-/g)||[]).length);
console.log(JSON.stringify(sheets.Register.rows.slice(0,3)));
