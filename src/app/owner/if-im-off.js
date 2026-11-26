/* ================= IF I'M OFF: a pack for whoever keeps the firm going if James is ill or away – who to ring, live jobs, accounts, keys, wages ================= */
import { phoneOf } from "../chat/calls.js";
import { $, esc, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { coData } from "./company-details.js";
import { nameOf, teamIds } from "./owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
export { OFF };
/* James (Nov 2026, "do them all" – idea 5): Setup › 🆘 If I'm off. James fills in who's in charge while he's off and
   their phone, who pays the wages and when, the people to ring (accountant, bank, insurer, solicitor…), where things
   are kept (keys, documents, the safe), where his passwords are kept (the place – never the passwords themselves:
   the page says so and there's no box for them), and anything else they should know. The app adds what it already
   knows: the live jobs (clients won or on site, with their address and phone), the team with their phones, the
   merchants with account numbers, and the insurance. 📄 Make the PDF to print and put in the office, or give to the
   person. It says when it was last checked; Today reminds James every 6 months to look it over. Owner-only:
   todos/offpack (kind "offpack": deputy, deputyPhone, wages, people [{ role, name, phone }], keys, docs, passwords,
   notes, checkedAt). */
const OFF = (() => {
  const rec = () => (S.offPacks && S.offPacks[0]) || null;
  const ROLES = [
    "Accountant",
    "Bank",
    "Insurance broker",
    "Solicitor",
    "Electrician",
    "Plumber",
    "Scaffolder",
    "Skip hire",
  ];
  const TXT = [
    [
      "wages",
      "💷 Wages – who pays them, when, and how",
      "e.g. Every Friday by bank transfer. Payroll is done by … The list of who's owed what is in the app: Pay.",
    ],
    [
      "keys",
      "🔑 Keys",
      "e.g. Spare van keys in the key safe in the office (code from Sarah). Client keys are logged in the app.",
    ],
    [
      "docs",
      "📁 Where things are kept",
      "e.g. Insurance and accounts in the grey filing cabinet. Contracts in the app under each client.",
    ],
    [
      "passwords",
      "🔐 Where passwords are kept – the place, never the passwords",
      "e.g. In my password manager – Sarah has the emergency access.",
    ],
    [
      "notes",
      "📝 Anything else they should know",
      "e.g. Ring the client on Rolle Road every Monday. Don't order from … without a PO.",
    ],
  ];
  const liveJobs = () =>
    (S.clients || [])
      .filter((c) => ["won", "onsite"].includes(c.stage))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const merchants = () =>
    (S.suppliers || []).filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name));
  const checkedTxt = (r) =>
    r && r.checkedAt
      ? "Last checked " +
        new Date(r.checkedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Not filled in yet";
  function open() {
    const r = rec() || {};
    const J = liveJobs(),
      M = merchants(),
      T = teamIds();
    const c = coData();
    openViewer(`<div class="off"><div class="vhead"><b>🆘 If I'm off</b></div>
      <div class="who">If you're ill or away, this is what someone needs to keep the firm going. Fill in your part; the app adds the jobs, team, merchants and insurance. ${esc(checkedTxt(rec()))}.</div>
      <div class="actions"><button type="button" class="btn primary" id="off-edit">✎ Fill in my part</button><button type="button" class="btn" id="off-pdf">📄 Make the PDF</button></div>
      <div class="flabel">👤 In charge while I'm off</div>
      <div class="who">${r.deputy ? `<b>${esc(r.deputy)}</b>${r.deputyPhone ? " · " + esc(r.deputyPhone) : ""}` : "Not set yet"}</div>
      ${(r.people || []).length ? `<div class="flabel">📞 People to ring</div>${r.people.map((p) => `<div class="off-row"><span class="who">${esc(p.role)}</span><span><b>${esc(p.name)}</b>${p.phone ? " · " + esc(p.phone) : ""}</span></div>`).join("")}` : ""}
      ${TXT.filter(([k]) => r[k])
        .map(
          ([k, l]) =>
            `<div class="flabel">${esc(l.split(" – ")[0])}</div><div class="off-txt">${esc(r[k])}</div>`,
        )
        .join("")}
      <div class="flabel">🏗 Live jobs (${J.length})</div>${J.map((x) => `<div class="off-row"><span><b>${esc(x.name || "")}</b></span><span class="who">${esc([x.address || x.site || "", x.phone || ""].filter(Boolean).join(" · "))}</span></div>`).join("") || '<div class="who">No jobs won or on site.</div>'}
      <div class="flabel">👷 The team (${T.length})</div>${T.map((id) => `<div class="off-row"><span><b>${esc(nameOf(id))}</b></span><span class="who">${esc(phoneOf(id) || "")}</span></div>`).join("")}
      <div class="flabel">🏪 Merchants (${M.length})</div>${M.map((s) => `<div class="off-row"><span><b>${esc(s.name)}</b>${s.loc ? " " + esc(s.loc) : ""}</span><span class="who">${esc([s.phone, s.accountNo ? "acc. " + s.accountNo : ""].filter(Boolean).join(" · "))}</span></div>`).join("") || '<div class="who">None yet.</div>'}
      <div class="flabel">🛡 Insurance</div><div class="who">${esc([c.plInsurer ? "Public liability: " + c.plInsurer + (c.plPolicy ? " " + c.plPolicy : "") : "", c.elInsurer ? "Employer's liability: " + c.elInsurer + (c.elPolicy ? " " + c.elPolicy : "") : ""].filter(Boolean).join(" · ") || "Add it in Company details.")}</div>
    </div>`);
    $("off-edit").onclick = edit;
    $("off-pdf").onclick = async () => {
      toast("Making the PDF…");
      try {
        const out = await pdf();
        await S.dl.save({ filename: out.fn, data: out.blob });
      } catch (e) {
        toast("Couldn't make the PDF");
      }
    };
  }
  function edit() {
    const r = rec() || {};
    let people = (r.people || []).map((p) => Object.assign({}, p));
    if (!people.length) people = ROLES.slice(0, 3).map((role) => ({ role, name: "", phone: "" }));
    const pHtml = () =>
      people
        .map(
          (p, i) =>
            `<div class="off-p"><input class="off-pr" data-i="${i}" list="off-roles" maxlength="40" value="${esc(p.role || "")}" placeholder="Who, e.g. Accountant" aria-label="Who ${i + 1}"><input class="off-pn" data-i="${i}" maxlength="80" value="${esc(p.name || "")}" placeholder="Name" aria-label="Name ${i + 1}"><input class="off-pp" data-i="${i}" type="tel" maxlength="40" value="${esc(p.phone || "")}" placeholder="Phone" aria-label="Phone ${i + 1}"><button type="button" class="linkdanger off-px" data-i="${i}" aria-label="Take out ${esc(p.role || "this one")}">✕</button></div>`,
        )
        .join("");
    openSheet(
      `<h3 id="sheettitle">🆘 If I'm off</h3>
      <div class="grid2"><label for="off-dep">Who's in charge while I'm off<input id="off-dep" maxlength="80" value="${esc(r.deputy || "")}" placeholder="e.g. Sarah Bray"></label><label for="off-depp">Their phone<input id="off-depp" type="tel" maxlength="40" value="${esc(r.deputyPhone || "")}"></label></div>
      <div class="flabel">📞 People to ring</div><div id="off-ps">${pHtml()}</div>
      <datalist id="off-roles">${ROLES.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
      <button type="button" class="btn" id="off-padd">＋ Another person</button>
      ${TXT.map(([k, l, ph]) => `<label for="off-${k}">${esc(l)}<textarea id="off-${k}" maxlength="2000" placeholder="${esc(ph)}">${esc(r[k] || "")}</textarea></label>`).join("")}
      <div class="notice" style="margin:0">Never put the passwords themselves here – just where they're kept and who can get to them.</div>
      ${formFoot(false, "Save – it's up to date")}`,
      async () => {
        readP();
        const data = {
          kind: "offpack",
          deputy: $("off-dep").value.trim(),
          deputyPhone: $("off-depp").value.trim(),
          people: people
            .filter((p) => p.name || p.phone)
            .map((p) => ({ role: p.role || "", name: p.name || "", phone: p.phone || "" })),
          checkedAt: Date.now(),
        };
        TXT.forEach(([k]) => (data[k] = $("off-" + k).value.trim()));
        try {
          await S.db.doc("todos/offpack").set(data);
          S.offPacks = [Object.assign({ id: "offpack" }, data)];
          closeForm();
          toast("Saved");
          open();
        } catch (e) {
          showErr("Couldn't save – check your connection");
        }
      },
      "off-dep",
    );
    function readP() {
      document
        .querySelectorAll(".off-pr")
        .forEach((el) => (people[+el.dataset.i].role = el.value.trim()));
      document
        .querySelectorAll(".off-pn")
        .forEach((el) => (people[+el.dataset.i].name = el.value.trim()));
      document
        .querySelectorAll(".off-pp")
        .forEach((el) => (people[+el.dataset.i].phone = el.value.trim()));
    }
    function wireP() {
      document.querySelectorAll(".off-px").forEach(
        (b) =>
          (b.onclick = () => {
            readP();
            people.splice(+b.dataset.i, 1);
            $("off-ps").innerHTML = pHtml();
            wireP();
          }),
      );
    }
    wireP();
    $("off-padd").onclick = () => {
      readP();
      people.push({ role: "", name: "", phone: "" });
      $("off-ps").innerHTML = pHtml();
      wireP();
    };
  }
  async function pdf() {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 16,
      CW = W - 2 * M;
    const RED = BRGB();
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[^\x20-\x7E£\n]/g, "")
        .trim();
    const top0 = LH.top || 22;
    const bot = LH.pics ? LH.bot : 282;
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    let y = LH.top || 34;
    const room = (h) => {
      if (y + h > bot) {
        doc.addPage();
        y = top0 + 4;
      }
    };
    const head = (t) => {
      room(14);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...RED);
      doc.text(clean(t), M, y);
      y += 6;
    };
    const para = (t) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 17, 17);
      doc.splitTextToSize(clean(t), CW).forEach((ln) => {
        room(5);
        doc.text(ln, M, y);
        y += 4.8;
      });
    };
    const row = (a, b) => {
      doc.setFontSize(10);
      const A = doc.splitTextToSize(clean(a), 70),
        B = doc.splitTextToSize(clean(b), CW - 74);
      room(Math.max(A.length, B.length) * 4.8 + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 17, 17);
      doc.text(A, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(B, M + 74, y);
      y += Math.max(A.length, B.length) * 4.8 + 1;
    };
    const r = rec() || {};
    const c = coData();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...RED);
    doc.text("If I'm off", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(clean([c.name, c.owner, checkedTxt(rec())].filter(Boolean).join(" - ")), M, y);
    y += 6;
    head("In charge while I'm off");
    para(r.deputy ? r.deputy + (r.deputyPhone ? " - " + r.deputyPhone : "") : "Not set");
    if ((r.people || []).length) {
      head("People to ring");
      r.people.forEach((p) => row(p.role || "", [p.name, p.phone].filter(Boolean).join(" - ")));
    }
    TXT.forEach(([k, l]) => {
      if (!r[k]) return;
      head(
        l
          .replace(/^\S+\s/, "")
          .split(" - ")[0]
          .split(" – ")[0],
      );
      para(r[k]);
    });
    head("Live jobs");
    const J = liveJobs();
    if (J.length)
      J.forEach((x) =>
        row(x.name || "", [x.address || x.site, x.phone].filter(Boolean).join(" - ")),
      );
    else para("No jobs won or on site.");
    head("The team");
    teamIds().forEach((id) => row(nameOf(id), phoneOf(id) || ""));
    const Mr = merchants();
    if (Mr.length) {
      head("Merchants");
      Mr.forEach((s) =>
        row(
          s.name + (s.loc ? " " + s.loc : ""),
          [s.phone, s.accountNo ? "Account " + s.accountNo : ""].filter(Boolean).join(" - "),
        ),
      );
    }
    head("Insurance");
    if (c.plInsurer) row("Public liability", [c.plInsurer, c.plPolicy].filter(Boolean).join(" "));
    if (c.elInsurer)
      row("Employer's liability", [c.elInsurer, c.elPolicy].filter(Boolean).join(" "));
    if (!c.plInsurer && !c.elInsurer) para("See Company details in the app.");
    lhFinish(doc, LH);
    return { blob: doc.output("blob"), fn: "If I'm off - " + iso(new Date()) + ".pdf" };
  }
  /* Today: fill it in once, then look it over every 6 months */
  function todayCard() {
    if (!S.owner) return "";
    const r = rec();
    if (r && r.checkedAt && Date.now() - r.checkedAt < 182 * 864e5) return "";
    if (!r && (S.clients || []).length < 3) return "";
    return `<div class="card off-today"><div class="cardbody"><button type="button" class="incrow off-go"><span><b>🆘 If I'm off</b><br><span class="who">${r ? "It's 6 months since you checked it – is it still right?" : "If you're ill or away, who keeps it going? Fill in your part – 5 minutes."}</span></span><span>›</span></button></div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".off-go").forEach((b) => (b.onclick = open));
  }
  return { open, pdf, todayCard, wireToday };
})();
