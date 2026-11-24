// Job review (made-up client Sue Jones, her loft at 4 Rolle Road): the job is finished, so Today says 📝 Review finished
// jobs. The review shows the money from the job's costs (a made-up £10,000 variation as the price, and Sam's made-up
// timesheet hours), then what went well / badly / next time / pricing and 4 stars. Saved with the numbers; her page
// shows the stars; 📝 Job reviews lists it and finds it by searching a lesson. Writes h694*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].stage="done";store["todos/c1"].doneAt=Date.now()-5*86400000;store["todos/var-t1"]={kind:"variation",site:"4 Rolle Road, Exmouth",clientId:"c1",client:"Sue Jones",title:"Loft – agreed price",amt:10000,vc:"20",status:"signed",number:"V1"};');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({viewClient,JRV,closeViewer});function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('.jrv-today')&&/Sue Jones/.test(await p.innerText('.jrv-today')),'Today: 📝 Review finished jobs – Sue Jones');
 await p.click('.jrv-go');await p.waitForTimeout(500);
 const sheet=await p.innerText('#sheet');
 const n=await p.evaluate(()=>window.__T().JRV.nums(window.__S.clients.find(c=>c.id==='c1')));
 ok(n&&n.price>0&&/Profit/.test(sheet)&&/Price/.test(sheet),'the money from the job: price '+(n&&n.price)+', cost '+(n&&n.cost)+', profit '+(n&&n.profit)+' ('+(n&&n.pct)+'%)');
 await p.fill('#jrv-well','Client loved the dormer');await p.fill('#jrv-bad','Plasterer let us down twice');
 await p.fill('#jrv-next','Book the plasterer a month ahead');await p.fill('#jrv-price','Allow 2 more days for the stairs');
 await p.click('.jrv-stars [data-v="4"]');
 await p.screenshot({path:'h694-review.png'});
 await p.click('#f-save');await p.waitForTimeout(900);
 const r=await p.evaluate(()=>window.__st['todos/c1'].review);
 ok(r&&r.stars===4&&r.bad==='Plasterer let us down twice'&&r.nums&&r.nums.price===n.price,'saved with the stars, the words and the numbers at the time');
 ok(!(await p.isVisible('.jrv-today')),'gone from Today');
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(600);
 ok(/Job review · ★★★★☆/.test(await p.innerText('#cv-jrv')),'her page: 📝 Job review · ★★★★☆');
 await p.evaluate(()=>{window.__T().closeViewer();window.__T().JRV.list()});await p.waitForTimeout(400);
 await p.fill('#jrv-q','plasterer');await p.waitForTimeout(700);
 ok(/Sue Jones/.test(await p.innerText('.jrv-list'))&&/Book the plasterer a month ahead/.test(await p.innerText('.jrv-list')),'📝 Job reviews: searching "plasterer" finds it, with the lessons');
 await p.screenshot({path:'h694-list.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h694: ${bad} failed`:'h694: all passed');await b.close();process.exit(bad?1:0);
})();
