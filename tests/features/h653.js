// Social media accounts linked (made-up firm and pages): without the hosted site's linking (claude.ai), 🔗 Linked accounts says
// linking is done there and keeps the firm's page addresses; 📤 Share opens the firm's own Facebook page. With a pretend
// linking service (what Jasper builds on our server): Facebook shows "Linked as …", 🚀 Post to Facebook now sends the words
// and photos and notes it as posted with the post's id; 🕒 Schedule it sends a time and the post shows as scheduled; a
// failed post says why. The sign-ins never reach the database.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(HOOK,'window.render=render;window.__T=()=>({SOCIAL});'+HOOK);
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
/* a pretend linking service: Facebook linked, Instagram not; Instagram posts fail */
const FAKE_SOCIAL=()=>{window.__calls=[];const u=window.claude.use;window.claude.use=async n=>n==='social'?{
  status:async()=>({facebook:{linked:true,name:'Test Builders Ltd'},instagram:{linked:false}}),
  connect:async k=>{window.__calls.push(['connect',k]);return {}},disconnect:async k=>{window.__calls.push(['disconnect',k])},
  post:async r=>{window.__calls.push(['post',JSON.parse(JSON.stringify(r))]);return r.at?{scheduled:'job-9'}:{results:Object.fromEntries(r.platforms.map(k=>[k,k==='facebook'?{ok:true,id:'fb-123',url:'https://facebook.com/p/123'}:{ok:false,code:'denied',message:'Instagram said no'}]))}},
}:u(n);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);
 const opened=[];await ctx.route(/^https?:\/\//,r=>{opened.push(r.request().url());r.abort();});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* claude.ai: no linking */
 await p.evaluate(()=>window.__T().SOCIAL.view());await p.waitForTimeout(400);
 ok(await p.isVisible('#sp-links'),'📣 Social media posts has 🔗 Linked accounts');
 await p.click('#sp-links');await p.waitForTimeout(500);
 ok(/Linking works on the hosted site/.test(await p.innerText('#form'))&&await p.locator('.sp-lk').count()===0,'here it says linking is done on the hosted site (no Link buttons)');
 ok(await p.locator('.sp-link').count()===4,'Facebook, Instagram, LinkedIn and Google profile listed');
 await p.fill('#sp-pg-facebook','facebook.com/testbuilders');await p.click('#f-save');await p.waitForTimeout(300);
 ok(/should start with https/.test(await p.innerText('#f-err')),'a page address must start with https://');
 await p.fill('#sp-pg-facebook','https://www.facebook.com/testbuilders');await p.click('#f-save');await p.waitForTimeout(500);
 ok((await p.evaluate(()=>window.__st['settings/app'].socialPages||{})).facebook==='https://www.facebook.com/testbuilders','the firm\'s Facebook page address is kept');
 await p.evaluate(()=>window.__T().SOCIAL.compose({about:'job',detail:'Garden wall rebuilt',texts:{facebook:'New garden wall!',instagram:'Wall #brick'},places:['facebook','instagram']}));await p.waitForTimeout(600);
 ok(await p.locator('.sp-go').count()===2&&await p.locator('.sp-now').count()===0,'not linked: 📤 Share buttons, no Post now');
 await p.evaluate(()=>{try{delete navigator.share}catch(e){};Object.defineProperty(navigator,'share',{value:undefined,configurable:true})});
 await p.click('.sp-go[data-k=facebook]');await p.waitForTimeout(800);
 ok(opened.some(u=>u.startsWith('https://www.facebook.com/testbuilders')),'📤 Share opens the firm\'s own Facebook page');
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);
 /* the hosted site, with linking set up */
 await p.evaluate(FAKE_SOCIAL);
 await p.evaluate(()=>window.__T().SOCIAL.links());await p.waitForTimeout(500);
 const ltxt=await p.innerText('#form');
 ok(/Linked as Test Builders Ltd/.test(ltxt)&&await p.locator('.sp-lk[data-k=instagram]').innerText()==='Link'&&await p.locator('.sp-lk[data-k=facebook]').innerText()==='Unlink','Facebook shows Linked as Test Builders Ltd; Instagram has Link');
 await p.screenshot({path:'h653-links.png'});
 await p.click('.sp-lk[data-k=instagram]');await p.waitForTimeout(500);
 ok((await p.evaluate(()=>window.__calls)).some(c=>c[0]==='connect'&&c[1]==='instagram'),'Link asks the server to link Instagram');
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);
 await p.evaluate(()=>window.__T().SOCIAL.compose({id:'sp-t1',about:'job',detail:'Garden wall rebuilt',texts:{facebook:'New garden wall!',instagram:'Wall #brick'},places:['facebook','instagram'],photos:['ph1']}));await p.waitForTimeout(800);
 ok(await p.locator('.sp-now[data-k=facebook]').count()===1&&await p.locator('.sp-go[data-k=instagram]').count()===1,'linked: 🚀 Post to Facebook now; Instagram (not linked) still 📤 Share');
 ok(await p.isVisible('#sp-when')&&await p.isVisible('#sp-later'),'and 🕒 Or post later');
 await p.locator('#sp-share').scrollIntoViewIfNeeded();await p.screenshot({path:'h653-post.png'});
 await p.click('.sp-now[data-k=facebook]');await p.waitForTimeout(800);
 let calls=await p.evaluate(()=>window.__calls);
 const pc=calls.find(c=>c[0]==='post');
 ok(pc&&JSON.stringify(pc[1].platforms)==='["facebook"]'&&pc[1].texts.facebook==='New garden wall!'&&pc[1].photos[0]==='ph1'&&pc[1].at===0,'Post now sends the Facebook words and the photo');
 let rec=await p.evaluate(()=>window.__st['todos/sp-t1']);
 ok(rec&&rec.status==='posted'&&rec.postedTo.includes('facebook')&&rec.postIds.facebook.id==='fb-123','noted as posted, with the post\'s id');
 /* schedule */
 const when=await p.evaluate(()=>{const d=new Date(Date.now()+2*864e5);d.setHours(9,30,0,0);const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+'T09:30'});
 await p.fill('#sp-when',when);await p.click('#sp-later');await p.waitForTimeout(800);
 calls=await p.evaluate(()=>window.__calls);
 const sc=calls.filter(c=>c[0]==='post').pop();
 ok(sc&&sc[1].at>Date.now()&&JSON.stringify(sc[1].platforms)==='["facebook"]','Schedule sends the time');
 rec=await p.evaluate(()=>window.__st['todos/sp-t1']);
 ok(rec.scheduleId==='job-9'&&rec.scheduledAt===sc[1].at,'the post keeps the scheduled time');
 const st=JSON.stringify(await p.evaluate(()=>window.__st));
 ok(!/token|secret|password/i.test(st.replace(/"(pinHash|pin)[^,]*,/g,'')),'no sign-ins in the database');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h653: ${bad} failed`:'h653: all passed');await b.close();process.exit(bad?1:0);
})();
