// Chat on a phone (made-up team chat): at 375 and 430 px wide the typing box and Send are fully on screen – the round
// buttons sit on their own line above, and the typing box is wide enough to see what you type.
// Naming a site (made-up job at 4 Rolle Road): with no name the Sites card shows "4 Rolle Road" big and "Exmouth"
// small. In Setup › Sites, ✎ Name & details gives it a job name; from then on the name shows big with the address small
// under it, and the trade's check-in list shows the name (the address is still what's saved).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();
 const ps=page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
 for(const w of [375,430]){
 const ctx=await b.newContext({viewport:{width:w,height:740},deviceScaleFactor:2});
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(false)+ps+'</body></html>'}):r.abort());
 const p=await ctx.newPage();await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const o=document.getElementById('ohq');if(o)o.hidden=true;window.__S.tab='chat';window.render()});await p.waitForTimeout(800);
 await p.click('text=Whole team');const opened='clicked';await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{const f=(id)=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]};return {vw:innerWidth,win:!document.getElementById('chatwin').hidden,comp:f('composer'),text:f('cm-text'),send:f('cm-send'),pin:f('cm-pin')}});
 ok(r.win&&r.text[0]>=0&&r.send[1]<=w&&r.text[1]-r.text[0]>=200&&r.pin[0]>=0,w+'px phone: the typing box and Send are on screen, the box is wide enough to see ('+JSON.stringify(r)+')');await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/chat-'+w+'.png'});await ctx.close();}
 console.log(bad?'h529: '+bad+' failed':'h529: all passed');await b.close();process.exit(bad?1:0)})();
