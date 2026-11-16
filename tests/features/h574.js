// Windows & doors: tick openings in the schedule and delete them together (made-up survey). A new survey with four
// openings; ticking two shows "2 ticked" with Delete ticked; one tap asks again, the second deletes both and the
// other two stay; Tick all then Delete ticked won't leave a survey with none; Untick hides the bar.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(500);
 for(let k=0;k<3;k++){await p.click('#wsx-root [data-new=window]');await p.waitForTimeout(200);}
 const refs=async()=>p.evaluate(()=>[...document.querySelectorAll('#wsx-list .wsitem .r')].map(x=>x.textContent));
 let r0=await refs();
 ok(r0.length===4&&await p.locator('#wsx-list .ws-tick').count()===4,'each opening in the schedule has a tick box ('+r0.join(', ')+')');
 ok(await p.isHidden('#wsx-ticks'),'no bar until something is ticked');
 await p.check('#wsx-list .ws-tick[data-i="1"]');await p.check('#wsx-list .ws-tick[data-i="2"]');
 ok(await p.isVisible('#wsx-ticks')&&/2 ticked/.test(await p.innerText('#wsx-tickn')),'ticking two shows "2 ticked"');
 await p.click('#wsx-tickdel');
 ok(/Tap again to delete 2/.test(await p.innerText('#wsx-tickdel'))&&(await refs()).length===4,'the first tap asks again');
 await p.click('#wsx-tickdel');await p.waitForTimeout(300);
 let r1=await refs();
 ok(r1.length===2&&r1[0]===r0[0]&&r1[1]===r0[3],'the second tap deletes the two ticked, the others stay ('+r1.join(', ')+')');
 ok(await p.isHidden('#wsx-ticks'),'the bar goes once they are gone');
 await p.check('#wsx-list .ws-tick[data-i="0"]');await p.click('#wsx-tickall');
 ok(/2 ticked/.test(await p.innerText('#wsx-tickn')),'Tick all ticks them all');
 await p.click('#wsx-tickdel');await p.waitForTimeout(200);
 ok((await refs()).length===2,'a survey is never left with none');
 await p.click('#wsx-untick');
 ok(await p.isHidden('#wsx-ticks')&&!(await p.isChecked('#wsx-list .ws-tick[data-i="0"]')),'Untick clears them and hides the bar');
 await p.check('#wsx-list .ws-tick[data-i="1"]');
 await p.evaluate(()=>document.querySelector('#wsx-count').closest('section').scrollIntoView({block:'start'}));
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/ws-tick.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h574: ${bad} failed`:'h574: all passed');await b.close();process.exit(bad?1:0);
})();
