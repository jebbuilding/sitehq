// 🎥 Video meeting with Teams (made-up link and people): James opens the whole-team chat › 📞 › 🎥 Video meeting; the first
// time it asks for his Teams meeting link (it must be a whole https link), then opens Teams and puts "🎥 Join the video
// call" in the chat. Sam (a trade) sees the Join button in the chat and has the 🎥 button too. A planner booking ticked
// "It's a Teams video call" carries the link: its page has Join, and the phone-calendar file has the link.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(DD,'function detailsDone(d){return true}').replace(HOOK,'window.render=render;window.__T=()=>({openPlanEditor,openPlanDetail});'+HOOK);
const LINK='https://teams.microsoft.com/l/meetup-join/test-meeting-123';
const extra='store["chats/team"]={kind:"team",name:"Whole team",members:"all",lastAt:1};';
function mk(owner,dump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(dump?'Object.assign(store,'+dump+');':''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);
 const opened=[];await ctx.route(/^https?:\/\//,r=>{opened.push(r.request().url());r.abort();});
 const open=async(owner,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(owner,dump)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');return p;};
 const toTeamChat=async p=>{await p.evaluate(()=>{const S=window.__S;S.otab='chat';S.tab='chat';window.render()});await p.waitForTimeout(400);await p.click('.chatrow:has-text("Whole team")');await p.waitForTimeout(500);};
 try{
 const p=await open(true);
 await toTeamChat(p);
 await p.click('#chat-call');await p.waitForTimeout(400);
 ok(await p.isVisible('#vm-go'),'📞 in a chat has 🎥 Video meeting (Teams)');
 await p.click('#vm-go');await p.waitForTimeout(400);
 ok(await p.isVisible('#vm-link')&&/Copy link/.test(await p.innerText('#form')),'the first time it asks for his Teams meeting link, with how to get it');
 await p.screenshot({path:'h654-setup.png'});
 await p.fill('#vm-link','teams meeting');await p.click('#f-save');await p.waitForTimeout(300);
 ok(/https/.test(await p.innerText('#f-err')),'it must be the whole https link');
 await p.fill('#vm-link',LINK);await p.click('#f-save');await p.waitForTimeout(1200);
 let st=await p.evaluate(()=>window.__st);
 ok(st['settings/app'].meetLink===LINK,'the link is kept');
 const msg=Object.entries(st).find(([k,v])=>/^msgs\/team\/m\//.test(k)&&v.meet);
 ok(msg&&msg[1].meet===LINK,'a "Join the video call" message is in the team chat');
 ok(opened.some(u=>u.startsWith(LINK)),'and Teams opens');
 ok(await p.locator('.vm-join[href="'+LINK+'"]').count()>=1,'the chat shows 🎥 Join the video call');
 await p.screenshot({path:'h654-chat.png'});
 /* Sam */
 const t=await open(false,JSON.stringify(st));
 await toTeamChat(t);
 ok(await t.locator('.vm-join[href="'+LINK+'"]').count()>=1,'Sam sees the Join button in the chat');
 await t.click('#chat-call');await t.waitForTimeout(400);
 ok(await t.isVisible('#vm-go')&&!(await t.isVisible('#vm-set')),'Sam can start one too (but not change the link)');
 /* planner */
 await p.click('#chat-back');await p.waitForTimeout(400);
 await p.evaluate(()=>{const S=window.__S;S.otab='today';window.render()});
 await p.evaluate(()=>window.__T().openPlanEditor(null,new Date().toISOString().slice(0,10)));await p.waitForTimeout(400);
 ok(await p.isVisible('#pe-meet'),'a planner booking can be ticked "It\'s a Teams video call"');
 await p.fill('#pe-title','Call with the architect');await p.fill('#pe-time','10:00');await p.check('#pe-meet');await p.uncheck('#pe-notify');
 await p.click('#f-save');await p.waitForTimeout(900);
 st=await p.evaluate(()=>window.__st);
 const pe=Object.entries(st).find(([k,v])=>/^plan/.test(k)&&v.title==='Call with the architect');
 ok(pe&&pe[1].meet===LINK,'the booking has the link');
 await p.evaluate(e=>window.__T().openPlanDetail(Object.assign({id:e[0].split('/')[1]},e[1])),pe);await p.waitForTimeout(400);
 ok(await p.locator('#viewer .vm-join').count()===1,'its page has 🎥 Join the video call');
 await p.click('#pd-ics');await p.waitForTimeout(500);
 const ics=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];return d?await d.data.text():''});
 ok(ics.includes('teams.microsoft.com/l/meetup-join/test-meeting-123'),'the phone-calendar file has the link');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h654: ${bad} failed`:'h654: all passed');await b.close();process.exit(bad?1:0);
})();
