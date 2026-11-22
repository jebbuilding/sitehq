// Reviews and social posts (made-up client Sue Jones, 4 Rolle Road): ⭐ Reviews keeps the firm's Google and website review
// links; a review James adds from Sue's page is tied to her and her job (Loft conversion); ⭐ Ask for a review › 🏡 Ask in
// their portal puts "How did we do?" on her portal's front page with buttons to Google and the website; Sue taps 5 stars
// and writes a line; the overview shows both reviews (average 4.5). 📣 Make a post from her review: Claude writes the posts
// (first name only), and Share notes it as posted.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";';
const HOOK='function render() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(HOOK,'window.render=render;window.__T=()=>({REVIEWS,SOCIAL,viewClient});'+HOOK);
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
/* a pretend Claude: hands back posts for whatever places it's asked for, and keeps the prompts */
const FAKE_AI=()=>{window.__prompts=[];const u=window.claude.use;window.claude.use=async n=>n==='sample'?{json:async(q)=>{window.__prompts.push(q);const m=q.match(/Reply with JSON only: \{(.*)\}/);const keys=m?[...m[1].matchAll(/"(\w+)":"post text"/g)].map(x=>x[1]):[];return Object.fromEntries(keys.map(k=>[k,'Five stars from Sue for her loft conversion in Exmouth! ('+k+')']));}}:u(n);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const open=async(html)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+html+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');return p;};
 try{
 const p=await open(mk('owner'));
 /* the review links */
 await p.evaluate(()=>window.__T().REVIEWS.view());await p.waitForTimeout(400);
 ok(/No reviews yet/.test(await p.innerText('#viewer-body')),'⭐ Reviews starts empty');
 await p.click('#rv-links');await p.waitForTimeout(300);
 await p.fill('#rv-g','https://g.page/r/test/review');await p.fill('#rv-w','https://www.example.co.uk/reviews');await p.click('#f-save');await p.waitForTimeout(600);
 const co=await p.evaluate(()=>window.__st['settings/app'].company);
 ok(co.reviewUrl==='https://g.page/r/test/review'&&co.webReviewUrl==='https://www.example.co.uk/reviews','the Google and website review links are kept in Company details');
 /* a review added from Sue's page */
 await p.evaluate(()=>{const S=window.__S;window.__T().viewClient(S.clients.find(c=>c.id==='c1'))});await p.waitForTimeout(500);
 ok(await p.isVisible('.rv-add')&&await p.isVisible('.rv-ask'),'Sue\'s page has ⭐ Reviews with Ask for a review and Add a review');
 await p.click('.rv-add');await p.waitForTimeout(400);
 ok(await p.inputValue('#rv-job')==='Loft conversion','the review is tied to her job (Loft conversion)');
 await p.click('#rv-st button[data-v="4"]');await p.click('#rv-src button[data-v=google]');await p.fill('#rv-text','Tidy, on time, would use again.');
 await p.screenshot({path:'h650-add.png'});
 await p.click('#f-save');await p.waitForTimeout(700);
 let st=await p.evaluate(()=>window.__st);
 const rv=Object.entries(st).find(([k,v])=>v&&v.kind==='review');
 ok(rv&&rv[1].clientId==='c1'&&rv[1].stars===4&&rv[1].source==='google'&&rv[1].job==='Loft conversion'&&/on time/.test(rv[1].text),'saved: 4 stars, Google, on Sue and her job ('+(rv&&JSON.stringify(rv[1]).slice(0,120))+')');
 await p.evaluate(()=>{const S=window.__S;window.__T().viewClient(S.clients.find(c=>c.id==='c1'))});await p.waitForTimeout(500);
 ok(/Tidy, on time/.test(await p.innerText('#viewer-body')),'the review shows on Sue\'s page');
 /* ask in her portal */
 await p.click('.rv-ask');await p.waitForTimeout(400);
 ok(/example\.co\.uk\/reviews/.test(await p.inputValue('#rq-msg')),'the ready-written message has the website review link too');
 ok(await p.isVisible('.rq-acts button[data-v=portal]'),'🏡 Ask in their portal is offered (Sue has the portal)');
 await p.click('.rq-acts button[data-v=portal]');await p.waitForTimeout(600);
 st=await p.evaluate(()=>window.__st);
 ok(st['portal/u9'].reviewAsk&&st['portal/u9'].reviewAsk.google==='https://g.page/r/test/review'&&st['portal/u9'].reviewAsk.web==='https://www.example.co.uk/reviews','her portal record has the ask, with both links');
 /* Sue's portal */
 const q=await open(mk('client',JSON.stringify(st)));
 ok(await q.isVisible('.rv-pt'),'Sue\'s portal front page asks ⭐ How did we do?');
 ok(await q.locator('.rv-ptl a[href="https://g.page/r/test/review"]').count()===1&&await q.locator('.rv-ptl a[href="https://www.example.co.uk/reviews"]').count()===1,'with buttons to review on Google and on the website');
 await q.click('#rv-ptst button[data-v="5"]');await q.fill('#rv-pttx','Brilliant job, lovely team.');
 await q.screenshot({path:'h650-portal.png'});
 await q.click('#rv-ptgo');await q.waitForTimeout(700);
 const st2=await q.evaluate(()=>window.__st);
 ok(st2['portal/u9'].review&&st2['portal/u9'].review.stars===5&&/Brilliant/.test(st2['portal/u9'].review.text),'her review is saved on her portal record');
 ok(/Thank you for your review/.test(await q.innerText('#main')),'she sees a thank-you, with the Google and website buttons still there');
 /* the overview, with both */
 const r=await open(mk('owner',JSON.stringify(st2)));
 await r.evaluate(()=>window.__T().REVIEWS.view());await r.waitForTimeout(500);
 ok(await r.locator('.rv-page .rv-row').count()===2,'⭐ Reviews lists both (the one added and the one from the portal)');
 ok((await r.innerText('.rv-big')).trim()==='4.5','average 4.5 stars');
 ok(/Client portal \(1\)/.test(await r.innerText('.rv-f'))&&/Google \(1\)/.test(await r.innerText('.rv-f')),'counted by where they were left');
 await r.screenshot({path:'h650-overview.png',fullPage:true});
 /* a post from her portal review */
 await r.evaluate(FAKE_AI);
 await r.click('.rv-row:has-text("Brilliant") .rv-post');await r.waitForTimeout(500);
 ok(/5-star review from Sue/.test(await r.inputValue('#sp-detail'))&&!/Jones/.test(await r.inputValue('#sp-detail')),'📣 Make a post starts from her words, first name only');
 await r.click('#sp-ai');await r.waitForTimeout(800);
 ok(/Five stars from Sue/.test(await r.inputValue('#sp-t-facebook'))&&/instagram/.test(await r.inputValue('#sp-t-instagram')),'Claude writes a Facebook and an Instagram post');
 const pr=await r.evaluate(()=>window.__prompts[0]||'');
 ok(/Never use the client's surname or full address/.test(pr)&&!/Jones|Rolle/.test(pr),'Claude is told no surnames or addresses, and isn\'t given them');
 await r.setInputFiles('#sp-add','fixtures/test.jpg');await r.waitForTimeout(1500);
 ok(await r.locator('#sp-ths .sp-th img').count()===1,'a photo added from the iPad shows on the post');
 await r.screenshot({path:'h650-post.png'});
 await r.click('.sp-go[data-k=facebook]');await r.waitForTimeout(800);
 const sp=Object.values(await r.evaluate(()=>window.__st)).find(v=>v&&v.kind==='socialpost');
 ok(sp&&sp.status==='posted'&&(sp.postedTo||[]).includes('facebook')&&sp.reviewId==='pt-u9','Share notes it as posted to Facebook, linked to the review');
 await r.keyboard.press('Escape');await r.click('#f-cancel').catch(()=>{});
 await r.evaluate(()=>window.__T().SOCIAL.view());await r.waitForTimeout(400);
 ok(/Posted/.test(await r.innerText('#viewer-body'))&&/1 posted this month/.test(await r.innerText('#viewer-body')),'📣 Social media posts lists it: posted this month');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h650: ${bad} failed`:'h650: all passed');await b.close();process.exit(bad?1:0);
})();
