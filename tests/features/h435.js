// Website enquiries (all made-up): an enquiry sent from the website's contact form arrives while the app is open and
// pops up; ⚡ Make a quick enquiry fills the quick enquiry in from it (source Website), and saving it books the visit,
// files a copy of what they sent in the new client's job file and puts the website enquiry away. The 🌐 Website page
// on Clients shows the enquiries and how the website is doing (visits, enquiries, where from, pages).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
const extra=`store["webenq/w0"]={name:"Old Test",email:"old@example.com",type:"Small works",message:"Earlier one",at:${Date.now()-864e5*3},status:"done"};
store["webstats/${isoD(D(1))}"]={views:30,visits:12,enquiries:1,pages:{"/":12,"/contact.html":8,"/house-extensions.html":10},refs:{"google.com":7,"direct":4,"facebook.com":1},dev:{phone:20,computer:10},secs:{"/house-extensions.html":900,"/contact.html":240},secsN:{"/house-extensions.html":10,"/contact.html":8},visitSecs:1140,entry:{"/":8,"/house-extensions.html":4},places:{"Exmouth":7,"Exeter":5}};
store["webstats/${isoD(D(0))}"]={views:10,visits:4,pages:{"/":4,"/contact.html":6},refs:{"google.com":3,"direct":1},dev:{phone:6,computer:4}};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(!(await p.isVisible('.we-pop')),'the enquiry already dealt with does not pop up');
 /* a new one arrives from the website (what the server writes) */
 await p.evaluate(async()=>{const db=await window.claude.use('db');await db.doc('webenq/w1').set({name:'Jo Test',email:'jo@example.com',phone:'07000 000001',location:'5 Test Road, Exmouth EX8 1AA',type:'House extension',message:'Single-storey rear extension, about 4m by 5m.',page:'/contact.html',at:Date.now(),status:'new'});});
 await p.waitForTimeout(600);
 ok(await p.isVisible('.we-pop')&&/Jo Test/.test(await p.innerText('.we-pop'))&&/House extension/.test(await p.innerText('.we-pop')),'🌐 it pops up: Jo Test, House extension');
 await p.click('#we-make');await p.waitForTimeout(300);
 ok(await p.inputValue('#qe-name')==='Jo Test'&&await p.inputValue('#qe-phone')==='07000 000001'&&await p.inputValue('#qe-email')==='jo@example.com'&&await p.inputValue('#qe-pc')==='EX8 1AA'&&/House extension\nSingle-storey/.test(await p.inputValue('#qe-what')),'the quick enquiry is filled in from it (name, phone, email, postcode, what)');
 await p.uncheck('#qe-ics');
 await p.click('#f-save');await p.waitForTimeout(2500);
 const all=Object.values(await st());
 const cl=all.find(v=>v&&v.kind==='client'&&v.name==='Jo Test');
 ok(cl&&cl.source==='Website'&&cl.email==='jo@example.com'&&cl.stage==='enquiry'&&/Enquiry from the website/.test(cl.notes[0].text),'client saved as an enquiry from the Website');
 const we=(await st())['webenq/w1'];
 ok(we.status==='done'&&we.clientId,'the website enquiry is put away, linked to the client');
 const jf=all.find(v=>v&&v.kind==='jobfile'&&v.items&&v.items.some(i=>/^Website enquiry Jo Test\.pdf$/.test(i.name)&&i.folder==='mail'));
 ok(!!jf,'a copy of what they sent is in the client\'s job file (Letters & emails)');
 /* the Website page */
 await p.click('#viewer-close').catch(()=>{});await p.waitForTimeout(200);
 await p.click('#tabs .tab[data-t=clients]');await p.waitForTimeout(400);
 ok(/🌐 Website/.test(await p.innerText('#cl-web')),'Clients has 🌐 Website');
 await p.click('#cl-web');await p.waitForTimeout(400);
 const w=await p.innerText('#viewer-body');
 ok(/Jo Test/.test(w)&&/Enquiry made/.test(w)&&/Old Test/.test(w),'the enquiries are listed');
 ok(/Visits\s+16/.test(w)&&/Pages looked at\s+40/.test(w)&&/Enquiries\s+1/.test(w)&&/On a phone\s+65%/.test(w),'last 30 days: 16 visits, 40 pages, 1 enquiry, 65% on a phone');
 ok(/Google[\s\S]*10/.test(w)&&/Typed in/.test(w)&&/Home page/.test(w)&&/Contact/.test(w),'where they came from (Google 10) and the pages looked at most');
 ok(/Average visit\s+1 min 11 s/.test(w)&&/How long people stay on each page[\s\S]*House extensions[\s\S]*1 min 30 s[\s\S]*Contact[\s\S]*30 s/.test(w),'time on each page (house extensions 1 min 30, contact 30 s) and the average visit (1 min 11)');
 ok(/The first page people land on[\s\S]*Home page/.test(w)&&/Where they are[\s\S]*Exmouth[\s\S]*Exeter/.test(w),'landing pages and where they are (Exmouth, Exeter)');
 await p.screenshot({path:'h435-website.png',fullPage:true});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h435: '+bad+' FAILED':'h435: all passed');
 await b.close()})();
