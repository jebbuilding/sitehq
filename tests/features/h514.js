// A deleted site goes from everywhere (made-up site 4 Rolle Road, client Sue Jones): it has a programme, a site diary
// note and a building control report, and Sue's other job points at it too. James deletes the site (with his PIN):
// the site, its programme, diary and building control notes go; Sue keeps her record but no longer points at the site
// (no "Open the site", not in her sites, her other job has no site) and her notes say it was deleted.
const fs=require('fs');const crypto=require('crypto');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/prg-t"]={kind:"programme",site:"'+SITE+'",stages:[]};store["todos/sdi-t"]={kind:"sitediary",site:"'+SITE+'",date:"2026-11-10",note:"Test"};store["todos/bcr-t"]={kind:"bcreport",site:"'+SITE+'",stage:"Drainage",date:"2026-11-10"};'+
 'store["todos/c1"].site="'+SITE+'";store["todos/c1"].sites=["'+SITE+'"];store["todos/c1"].moreJobs=[{id:"mj-1",work:"Garden wall",stage:"quote",site:"'+SITE+'"}];';
let src2=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src2.slice(src2.indexOf('const fake='),src2.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const hash=crypto.createHash('sha256').update('sitehq-pin:t:2468').digest('hex');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(h=>{window.__S.pinRec={salt:'t',hash:h}},hash);
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);
 await p.click('#site-del');await p.waitForTimeout(300);await p.click('#f-save');await p.waitForTimeout(300);
 await p.fill('.pinin','2468');await p.click('.dimbox button[type=submit]');await p.waitForTimeout(2500);
 const st=await p.evaluate(()=>window.__st);
 ok(!st['sites/s2'],'the site is deleted');
 ok(!st['todos/prg-t']&&!st['todos/sdi-t']&&!st['todos/bcr-t'],'its programme, site diary and building control notes go too');
 const c1=st['todos/c1'];
 ok(c1&&!c1.site&&!(c1.sites||[]).length,'Sue no longer points at the site');
 ok((c1.moreJobs||[])[0]&&!c1.moreJobs[0].site&&c1.moreJobs[0].work==='Garden wall','her other job is kept, without the site');
 ok((c1.notes||[]).some(n=>/Site deleted: 4 Rolle Road/.test(n.text)),'her notes say the site was deleted');
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);
 ok(await p.locator('#cv-gosite').count()===0&&await p.locator('#cv-site').count()===1&&!/4 Rolle Road, Exmouth: job details/.test(await p.innerText('#viewer')),'her page offers Make it a site again, and no longer lists the deleted site');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h514: ${bad} failed`:'h514: all passed');await b.close();process.exit(bad?1:0);
})();
