// HKS Law OS app.js v12 - EMAIL-HEADERS-FIXED

// ════════════════════════════════════════════════════════════
//  STORE
// ════════════════════════════════════════════════════════════
const S = {
  tasks:[],staff:[],partners:[],kpis:[],drafts:[],activity:[],
  pipeline:[],gmailConn:false,fbReady:false,gsReady:false,
  syncLog:[],firmScore:{overall:0,sales:0,ops:0,delegation:0,marketing:0}
};

// ════════════════════════════════════════════════════════════
//  FIREBASE
// ════════════════════════════════════════════════════════════
let db = null, fbAuth = null;

function initFirebase(){
  const pid = document.getElementById('fb-project-id').value.trim();
  const key = document.getElementById('fb-api-key').value.trim();
  const domain = document.getElementById('fb-auth-domain').value.trim();
  if(!pid||!key) {toast('Enter Firebase Project ID and API Key first');return;}
  try{
    const cfg={apiKey:key,authDomain:domain||pid+'.firebaseapp.com',projectId:pid};
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    db = firebase.firestore();
    fbAuth = firebase.auth();
    S.fbReady=true;
    setFbStatus(true);
    logSync('Firebase connected: '+pid);
    loadFromFirebase();
    toast('🔥 Firebase connected! Data syncing…');
  }catch(e){
    document.getElementById('fb-status').textContent='Error: '+e.message;
    toast('Firebase error: '+e.message);
  }
}

function setFbStatus(ok){
  const dot=document.getElementById('fb-dot');
  const txt=document.getElementById('sync-text');
  const pill=document.getElementById('sync-pill');
  if(ok){dot.classList.remove('offline');txt.textContent='Firebase: Live';pill.className='sync-status sync-ok';}
  else{dot.classList.add('offline');txt.textContent='Firebase: Offline';pill.className='sync-status sync-warn';}
  document.getElementById('fb-status').textContent=ok?'✅ Connected and syncing':'❌ Not connected';
}

async function syncToFirebase(){
  if(!db) return;
  try{
    const data={tasks:S.tasks,staff:S.staff,partners:S.partners,kpis:S.kpis,
      drafts:S.drafts,activity:S.activity.slice(0,30),updated:new Date().toISOString()};
    await db.collection('hkslaw').doc('main').set(data);
    logSync('Firebase sync: '+new Date().toLocaleTimeString());
  }catch(e){console.warn('FB sync:',e);}
}

async function loadFromFirebase(){
  if(!db) return;
  try{
    const doc = await db.collection('hkslaw').doc('main').get();
    if(doc.exists){
      const d=doc.data();
      if(d.tasks) S.tasks=d.tasks;
      if(d.staff) S.staff=d.staff;
      if(d.partners) S.partners=d.partners;
      if(d.kpis) S.kpis=d.kpis;
      if(d.activity) S.activity=d.activity;
      mergeTaskDone();
      toast('✅ Data loaded from Firebase');
      renderDash();
    }
  }catch(e){console.warn('FB load:',e);}
}

// ════════════════════════════════════════════════════════════
//  GOOGLE SHEETS
// ════════════════════════════════════════════════════════════
let gsConfig={sheetId:'',apiKey:''};

function initSheets(){
  gsConfig.sheetId=document.getElementById('gs-sheet-id').value.trim();
  gsConfig.apiKey=document.getElementById('gs-api-key').value.trim();
  if(!gsConfig.sheetId||!gsConfig.apiKey){toast('Enter Sheet ID and API Key');return;}
  S.gsReady=true;
  document.getElementById('gs-status').textContent='✅ Google Sheets configured';
  logSync('Google Sheets configured');
  toast('📊 Google Sheets ready — click Export to sync data');
}

async function exportToSheets(){
  if(!S.gsReady){toast('Configure Google Sheets first in Backup & Sync');nav('backup');return;}
  const rows=[['Week','Leads','Consultations','Retained','Revenue','RE Files','Immigration']];
  S.kpis.forEach(k=>rows.push([k.week||'',k.leads||0,k.consults||0,k.retained||0,k.revenue||0,k.re||0,k.imm||0]));
  const csvBody=rows.map(r=>r.join('\t')).join('\n');
  try{
    const sheetUrl='https://sheets.googleapis.com/v4/spreadsheets/'+gsConfig.sheetId+'/values/KPIs!A1:G'+rows.length+'?valueInputOption=RAW&key='+gsConfig.apiKey;
    const resp=await fetch(sheetUrl,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({range:'KPIs!A1',majorDimension:'ROWS',values:rows})});
    if(resp.ok){logSync('Google Sheets export: KPI data');toast('KPI data exported to Google Sheets!');}
    else{toast('Sheets export error: '+resp.status);}
  }catch(e){
    alert('Could not connect to Google Sheets. Your KPI data:\n\n'+csvBody);
  }
}

function syncAll(){
  syncToFirebase();
  saveLocal();
  logSync('Full sync: '+new Date().toLocaleTimeString());
  toast('☁️ Syncing to Firebase + local storage…');
  setFbStatus(S.fbReady);
}

function logSync(msg){
  S.syncLog.unshift({msg,time:new Date().toLocaleTimeString()});
  if(S.syncLog.length>20) S.syncLog.pop();
  const el=document.getElementById('sync-log');
  if(el) el.innerHTML=S.syncLog.map(l=>`<div style="padding:4px 0;border-bottom:1px solid var(--border);">${l.time} — ${l.msg}</div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  DATA
// ════════════════════════════════════════════════════════════
function gd(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}
function du(s){return Math.round((new Date(s)-new Date())/86400000);}
function fd(s){if(!s)return'';const d=new Date(s);return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});}

const PHASES=[
  {id:1,label:'Phase 1',title:'Stop the Bleeding — Start the Machine',badge:'This Week',badgeClass:'tag-overdue',deadline:gd(7),tasks:[
    {id:'t1',text:'Call 10 realtors in KW — fast closings offer',owner:'lawyer',due:gd(3),phase:1,done:false},
    {id:'t2',text:'Text/email 5 mortgage brokers',owner:'lawyer',due:gd(3),phase:1,done:false},
    {id:'t3',text:'Email past 2-year clients — referral ask',owner:'lawyer',due:gd(5),phase:1,done:false},
    {id:'t4',text:'Write phone intake script for staff',owner:'lawyer',due:gd(2),phase:1,done:false},
    {id:'t5',text:'Set 24-hour response rule in writing',owner:'lawyer',due:gd(2),phase:1,done:false},
    {id:'t6',text:'Build lead tracking sheet / activate Clio Grow',owner:'staff',due:gd(3),phase:1,done:false},
    {id:'t7',text:'Identify top 3 daily tasks staff can own',owner:'lawyer',due:gd(2),phase:1,done:false},
    {id:'t8',text:'Write Real Estate closing SOP',owner:'auto',due:gd(5),phase:1,done:false},
    {id:'t9',text:'Set up shared folder structure for client files',owner:'staff',due:gd(4),phase:1,done:false},
    {id:'t10',text:'Create/claim Google Business Profile',owner:'auto',due:gd(7),phase:1,done:false},
    {id:'t11',text:'Update engagement letter to LSO 2026 requirements',owner:'lawyer',due:gd(5),phase:1,done:false},
    {id:'t12',text:'Confirm LAWPRO insurance current + FINTRAC compliance',owner:'lawyer',due:gd(2),phase:1,done:false},
    {id:'t13',text:'Request first 5 Google reviews from happy past clients',owner:'auto',due:gd(7),phase:1,done:false},
  ]},
  {id:2,label:'Phase 2',title:'Build the Referral Engine',badge:'Days 7–30',badgeClass:'tag-due',deadline:gd(30),tasks:[
    {id:'t14',text:'Create one-page firm overview PDF for referral partners',owner:'auto',due:gd(14),phase:2,done:false},
    {id:'t15',text:'Formalize referral arrangement with 3 realtors',owner:'lawyer',due:gd(21),phase:2,done:false},
    {id:'t16',text:'Formalize referral arrangement with 2 mortgage brokers',owner:'lawyer',due:gd(21),phase:2,done:false},
    {id:'t17',text:'Reach out to 3 immigration consultants',owner:'lawyer',due:gd(18),phase:2,done:false},
    {id:'t18',text:'Build 7-day lead follow-up sequence (Day 1, 3, 7)',owner:'auto',due:gd(14),phase:2,done:false},
    {id:'t19',text:'Create practice-area intake forms (RE, Immigration, L&T, Insurance)',owner:'staff',due:gd(18),phase:2,done:false},
    {id:'t20',text:'Train staff to handle 80% of intake without lawyer',owner:'lawyer',due:gd(25),phase:2,done:false},
    {id:'t21',text:'SOPs for RE, Immigration, L&T intake',owner:'auto',due:gd(20),phase:2,done:false},
    {id:'t22',text:'Set weekly lawyer review calendar blocks (max 3 hrs/day)',owner:'lawyer',due:gd(14),phase:2,done:false},
    {id:'t23',text:'Draft LSO-compliant referral partner agreement template',owner:'lawyer',due:gd(21),phase:2,done:false},
    {id:'t24',text:'Set up 10-post Google Business / social media content calendar',owner:'auto',due:gd(25),phase:2,done:false},
    {id:'t25',text:'Implement Calendly or booking link on website',owner:'auto',due:gd(18),phase:2,done:false},
  ]},
  {id:3,label:'Phase 3',title:'Systemize and Delegate',badge:'Days 30–90',badgeClass:'tag-staff',deadline:gd(90),tasks:[
    {id:'t26',text:'Staff handles all follow-up and intake — lawyer not involved',owner:'staff',due:gd(45),phase:3,done:false},
    {id:'t27',text:'Referral partner reporting — track who sends what monthly',owner:'staff',due:gd(40),phase:3,done:false},
    {id:'t28',text:'Implement CRM pipeline — Clio Grow or equivalent',owner:'auto',due:gd(45),phase:3,done:false},
    {id:'t29',text:'Full SOP library complete — all 4 practice areas',owner:'auto',due:gd(60),phase:3,done:false},
    {id:'t30',text:'Google review automated request after every file close',owner:'auto',due:gd(50),phase:3,done:false},
    {id:'t31',text:'Monthly KPI dashboard review habit (30 min weekly)',owner:'lawyer',due:gd(35),phase:3,done:false},
    {id:'t32',text:'Trust account reconciliation SOP (By-Law 9)',owner:'lawyer',due:gd(45),phase:3,done:false},
    {id:'t33',text:'File retention and destruction policy documented',owner:'lawyer',due:gd(50),phase:3,done:false},
    {id:'t34',text:'Launch targeted Google Ads for real estate + immigration',owner:'auto',due:gd(60),phase:3,done:false},
  ]},
  {id:4,label:'Phase 4',title:'Passive Management',badge:'90+ Days',badgeClass:'tag-auto',deadline:gd(180),tasks:[
    {id:'t35',text:'Referral engine autonomous — staff maintains all relationships',owner:'staff',due:gd(120),phase:4,done:false},
    {id:'t36',text:'Lawyer time: max 15 hrs/week on billable review',owner:'lawyer',due:gd(100),phase:4,done:false},
    {id:'t37',text:'CRM 30-min weekly review replaces daily firefighting',owner:'lawyer',due:gd(100),phase:4,done:false},
    {id:'t38',text:'Hire/contract second staff — absorb growth volume',owner:'lawyer',due:gd(120),phase:4,done:false},
    {id:'t39',text:'Annual compliance audit — LSO By-Law 8, file retention',owner:'lawyer',due:gd(365),phase:4,done:false},
    {id:'t40',text:'Annual review and renewal of all referral arrangements',owner:'lawyer',due:gd(365),phase:4,done:false},
  ]}
];

const STAFF_CAN=[
  'Phone intake — qualify, book, log leads','Document collection from clients',
  'File opening administration','Client update emails (using approved templates)',
  'Calendar management and scheduling','Follow-up calls (Day 1, 3, 7 sequence)',
  'Document request follow-up','Referral partner check-in calls',
  'Google review request emails after file close','CRM data entry and pipeline updates',
  'Scan and upload client documents','Closing day coordination (RE — under supervision)',
  'Booking confirmations and reminders','Social media post scheduling',
  'Basic admin research (address lookups, phone numbers)','Invoice preparation (lawyer reviews)',
];
const LAWYER_ONLY=[
  'Legal advice of any kind (LSO Rule 3.2-1A)','Signing engagement letters / retainer agreements',
  'Trust account deposits, disbursements, reconciliation (By-Law 9)','All court / tribunal / LTB appearances',
  'Reviewing and signing legal documents','Conflict of interest checks (LSO Rule 3.4)',
  'Immigration application review and certification','Real estate undertakings and title opinions',
  'Closing funds authorization and release','Professional undertakings to other counsel',
  'Supervision and instruction of all staff (Rule 5.1)','Client ID verification (By-Law 7.1 — FINTRAC)',
  'Any advice on rights, obligations, or legal strategy','Notarial certificates (if notary public)',
];

const PLAYBOOK_DATA = {
  intake:[
    {q:"How much does a real estate lawyer cost?",a:"Our fees depend on the type and complexity of the transaction. We offer clear, upfront fixed fees for most real estate matters — no surprises. If you would like a quote, I can take down a few details and have [LAWYER] get back to you with an exact number, usually within the hour. Would that work?"},
    {q:"Can I speak to the lawyer right now?",a:"[LAWYER] is currently in a meeting / with a client / reviewing files. I can take all your information right now, and [LAWYER] will personally follow up with you by [TIME]. Alternatively, if you would like to book a consultation directly, I can get you on the calendar for [DATE OPTIONS]. What works best for you?"},
    {q:"How long will my matter take?",a:"That really depends on the specifics, which [LAWYER] would be best to answer for your situation. What I can tell you is that we aim to be responsive and proactive — we do not let files sit. Can I get your details so [LAWYER] can give you a real timeline?"},
    {q:"Do you do free consultations?",a:"[LAWYER] does offer a brief initial consultation to understand your situation. Let me check availability — can you come in or are you looking to speak by phone/video?"},
    {q:"I got a better quote from another lawyer",a:"I understand — it is smart to compare. I would encourage you to think not just about the number, but about communication speed and reliability, especially for something like a real estate closing. Can I take your details and ask [LAWYER] to personally call you back? [LAWYER] may be able to speak to the value we bring."},
    {q:"I need this done today / urgently",a:"I understand this is time-sensitive. Let me flag this as URGENT for [LAWYER] right now. Can I get your name, contact number, and a brief description of what you need? [LAWYER] will respond within the hour."},
    {q:"Is [LAWYER] licensed?",a:"Absolutely. [LAWYER] is a licensed Ontario lawyer in good standing with the Law Society of Ontario. You can verify the licence at lso.ca. Is there anything specific about the firm background I can share?"},
    {q:"What areas do you practice in?",a:"HKS Law practices in real estate, immigration, landlord and tenant matters, and insurance claims — all in Ontario. Is there a specific area you need help with today?"},
  ],
  re:[
    {q:"What is the closing date? Is it confirmed?",a:"The closing date that [LAWYER] is working toward is [DATE], as per the agreement. If anything changes with the date, the lawyer and your real estate agent will confirm. Is there a specific concern about the timeline?"},
    {q:"When do I get the keys?",a:"The keys are typically released after the transaction closes and funds are confirmed — usually by [TIME] on closing day. [LAWYER] will update you the morning of closing with timing. I will make a note for [LAWYER] to confirm this with you."},
    {q:"Why do I need title insurance?",a:"Title insurance protects you against issues that might not show up in a title search — things like survey errors, unknown liens, or fraud. [LAWYER] recommends it on all residential purchases. I will make a note that you would like [LAWYER] to explain this in more detail — they can walk you through it at signing."},
    {q:"What documents do I need to bring?",a:"I will send you the full list right now by email. Generally you will need two pieces of ID and your mortgage instructions if applicable. I will send the complete checklist to [EMAIL] — does that work?"},
    {q:"Can we move the closing date?",a:"Any changes to the closing date need to go through your real estate agent and the other party lawyer — [LAWYER] can advise on whether that is feasible once I flag this. Can I ask what is coming up that might require a change? I will escalate to [LAWYER] right away."},
  ],
  immigration:[
    {q:"How long will my application take?",a:"Processing times vary and change frequently with IRCC. [LAWYER] will give you the most current estimate based on your specific application type and circumstances. I will note that you would like an updated timeline — [LAWYER] will address this."},
    {q:"Is my application guaranteed to be approved?",a:"I cannot speak to the outcome — that is something [LAWYER] will be careful not to promise either, because every application depends on IRCC assessment. What I can say is that [LAWYER] ensures every application is as strong as possible before it is submitted."},
    {q:"I got a letter from IRCC — what does it mean?",a:"Please send a photo or scan of that letter to [EMAIL] right away — I will flag it as URGENT for [LAWYER] to review. Do not take any action until you hear back."},
    {q:"Can I work while my application is in progress?",a:"That depends on your specific situation and permit type — this is a legal question that [LAWYER] needs to answer. I will flag this for [LAWYER] to call you back today. Please do not make any assumptions about your work authorization until you hear from [LAWYER]."},
  ],
  lt:[
    {q:"What happens at the LTB hearing?",a:"[LAWYER] will walk you through exactly what to expect before your hearing date. Generally both sides present their position and evidence to the adjudicator. I will make a note for [LAWYER] to schedule a hearing prep call with you — we recommend doing this at least a week before."},
    {q:"Can I evict my tenant faster?",a:"The timeline depends on the application type and LTB scheduling — [LAWYER] will explain your realistic options. What I can tell you is that [LAWYER] knows the LTB process well and will make sure every notice and filing is done correctly to avoid delays."},
    {q:"My tenant has not paid rent — what do I do?",a:"You may need to serve an N4 Notice to End Tenancy for Non-Payment of Rent — but the exact form and timing matters. Let me take your details and flag this for [LAWYER] to call you back today with the next steps."},
  ],
  insurance:[
    {q:"The insurance company denied my claim — can you help?",a:"Absolutely — that is a core part of what [LAWYER] does. Denial does not mean it is over. Can I get your policy number, insurer name, and the date of the denial? [LAWYER] will review and advise on whether you have grounds to challenge."},
    {q:"How long do I have to dispute?",a:"There are limitation deadlines that can be as short as one year from the date of loss under some Ontario policies — this is urgent. I am flagging this as URGENT for [LAWYER] to call you back today. Do not wait."},
    {q:"How much will this cost me?",a:"[LAWYER] will go over fee structures — including whether a contingency arrangement makes sense for your case. That conversation needs to happen directly with [LAWYER]. I will book you in right away."},
  ],
  objections:[
    {q:"I will think about it",a:"Absolutely — this is an important decision. Can I ask, is there a specific concern I can help address? Or is there any information about how we work that would help you decide? I can also have [LAWYER] give you a quick call — no obligation, just a conversation."},
    {q:"You are more expensive than another firm",a:"I understand. Price matters. What I would encourage you to think about is what a delayed closing or a missed immigration deadline costs — and whether the firm you are comparing us to has the same responsiveness and communication standards. Can I have [LAWYER] call you to talk through what is included in our fee?"},
    {q:"I already have a lawyer",a:"Of course — that is great. If anything changes, or if you ever need a second opinion or have a matter outside your current lawyer focus area, please do not hesitate to reach out. Can I take your contact info in case we can help in the future?"},
    {q:"I do not need a lawyer for this",a:"That is absolutely your right, and I will not push. What I can tell you is that [LAWYER] often sees clients later in a matter who wish they had gotten advice earlier — especially in real estate, immigration, and insurance. The call is free. Want me to book you for 15 minutes with [LAWYER], no charge?"},
    {q:"How do I know you are trustworthy?",a:"Fair question. [LAWYER] is licensed by the Law Society of Ontario — you can verify at lso.ca right now. We also have [X] Google reviews at [LINK]. And every client engagement starts with a written retainer agreement, so everything is on paper before any work begins."},
  ],
  difficult:[
    {q:"Client is very angry or threatening",a:"ESCALATE IMMEDIATELY to [LAWYER]. Say: 'I understand you are very frustrated and I want to make sure [LAWYER] addresses this personally. I am going to get [LAWYER] on the line right now / have [LAWYER] call you back within 15 minutes.' Do NOT engage with the substance of the complaint."},
    {q:"Someone claims malpractice or negligence",a:"STOP the conversation immediately. Say: 'I understand your concern. I need to flag this directly for [LAWYER] — please hold / let me have [LAWYER] call you back within the hour.' LOG the time, the name, and the concern immediately. Do NOT admit anything or apologize in a way that admits fault."},
    {q:"Client asks for legal advice directly from staff",a:"'I want to make sure you get the right answer — that is something [LAWYER] needs to address directly. I am going to send [LAWYER] a message right now. [LAWYER] will follow up with you by [TIME] today.' Never guess, never try to answer, never say what you think the law is."},
    {q:"Someone requests confidential file information",a:"'I am not able to share file information without direction from [LAWYER]. Can I have [LAWYER] call you back? I will flag this as urgent.' Verify identity before confirming any file details even to clients — impersonation is a LAWPRO risk."},
  ]
};

const COMPLIANCE_DATA={
  lso:[
    {s:'ok',t:'Engagement letter for every new client (Rule 3.2-1A)',b:'Written retainer required before services begin. Include scope, fees, billing, file closure. Must be signed.'},
    {s:'ok',t:'Client ID & verification — By-Law 7.1 (FINTRAC)',b:'Verify in person or dual-process for all RE/immigration clients. Record on Form 7.1. Retain 7 years.'},
    {s:'ok',t:'Conflict of interest check before every file (Rule 3.4)',b:'Search your conflicts system. Document the check. Written informed consent if proceeding despite potential conflict.'},
    {s:'warn',t:'No fee splitting with non-lawyers (Rule 3.6)',b:'Referral arrangements with realtors/brokers cannot involve payment. Must be disclosed to clients in writing.'},
    {s:'ok',t:'Trust accounting — By-Law 9',b:'Monthly 3-way reconciliation: bank statement + trust listing + client ledgers. Annual LSO filing. No mixing of funds.'},
    {s:'ok',t:'Staff supervision — Rule 5.1',b:'Lawyer fully responsible for all staff conduct. Staff must not give legal advice. Written supervision policy recommended.'},
    {s:'warn',t:'Competence in all practice areas (Rule 3.1)',b:'Only accept matters within competence. Associate or refer for unfamiliar matters. Document continuing education.'},
    {s:'ok',t:'File retention minimums — By-Law 8',b:'General: 10 years. Real estate: 15 years (LAWPRO recommends). Wills/POAs: permanent. Trust records: 10 years.'},
    {s:'ok',t:'CPD requirements — 12 hrs/year (LSO 2026)',b:'Minimum 12 CPD hours annually including 3 hours professionalism. Log on LSO Portal. Deadline December 31.'},
  ],
  lawpro:[
    {s:'ok',t:'Annual LAWPRO premium — paid and current',b:'2026 premium varies by years of call and transaction volume. Confirm primary + excess coverage for RE volume.'},
    {s:'warn',t:'Title insurance — recommend on every residential purchase',b:'Failure to recommend may constitute negligence. Use FCT, Stewart Title, or Chicago Title. Document if client declines.'},
    {s:'ok',t:'Wire transfer fraud protocol — LAWPRO 2024-2026 alert',b:'Always call client on KNOWN number before releasing or receiving large wire transfers. Do NOT rely on email instructions alone.'},
    {s:'ok',t:'Undertakings — only give what you can personally fulfill',b:'Never accept a matter where your undertaking depends entirely on a third party over whom you have no control.'},
    {s:'warn',t:'Reporting letters — deliver within 30 days of closing',b:'Real estate: 30 days post-close. Immigration: within 14 days of decision. Delays are a top LAWPRO claim trigger.'},
    {s:'ok',t:'Cyber liability — LAWPRO endorsement active',b:'Fraud from email spoofing covered. Train staff: verify all wire instructions by phone. Never act on email-only wire changes.'},
  ]
};

const SOPS_DATA=[
  {title:'Real Estate Closing',icon:'🏠',color:'#C9A84C',steps:[
    '[STAFF] File opened — conflict check run by lawyer',
    '[STAFF] Engagement letter sent and signed',
    '[STAFF] Client ID verified (By-Law 7.1)',
    '[STAFF] Document request email sent',
    '[LAWYER] Title search ordered and reviewed',
    '[STAFF] Title insurance application submitted',
    '[STAFF] Statement of adjustments drafted (lawyer reviews)',
    '[LAWYER] Review and approve statement of adjustments',
    '[STAFF] Signing appointment booked',
    '[LAWYER] Signing appointment — all docs reviewed with client',
    '[LAWYER] Closing funds received — trust account deposit',
    '[LAWYER] Closing day authorization — funds released',
    '[STAFF] Reporting letter drafted',
    '[LAWYER] Review and send reporting letter within 30 days',
    '[STAFF] File closed — retention system updated',
    '[STAFF] Google review request sent to client'
  ]},
  {title:'Immigration File',icon:'✈️',color:'#5B9BD5',steps:[
    '[STAFF] Intake — name, nationality, status, application type',
    '[STAFF] Document checklist emailed to client',
    '[LAWYER] Legal assessment — eligibility confirmed',
    '[STAFF] Retainer signed and fee collected',
    '[STAFF] Follow up for outstanding documents weekly',
    '[LAWYER] Review all documents for completeness',
    '[LAWYER] Prepare and review full application package',
    '[STAFF] Application submitted via IRCC Portal',
    '[STAFF] Confirmation of receipt filed',
    '[STAFF] Client update email: submitted + timeline',
    '[STAFF] Monitor IRCC status monthly',
    '[LAWYER] Respond to any IRCC requests',
    '[STAFF] Outcome communicated to client',
    '[LAWYER] Reporting letter within 14 days of decision'
  ]},
  {title:'L&T Board — Landlord Application',icon:'🏢',color:'#4CAF7D',steps:[
    '[STAFF] Intake — application type, property, tenant, amounts',
    '[LAWYER] Confirm viability and application type',
    '[STAFF] Retainer signed and fee collected',
    '[STAFF] Gather: lease, rent receipts, N-notices, correspondence',
    '[LAWYER] Review documents — confirm notices valid and properly served',
    '[STAFF] Draft application for lawyer review',
    '[LAWYER] Review and authorize filing',
    '[STAFF] File via Tribunals Ontario Portal',
    '[STAFF] Calendar hearing date — remind 2 weeks before',
    '[STAFF] Prepare hearing bundle (evidence, notices, timeline)',
    '[LAWYER] Attend and conduct hearing',
    '[STAFF] Send hearing outcome to client within 24 hrs'
  ]},
  {title:'Insurance Claim File',icon:'🛡️',color:'#E8A84C',steps:[
    '[STAFF] Intake — insurer, policy number, date of loss, denial letter',
    '[LAWYER] Assess viability: coverage, quantum, or limitation issue',
    '[STAFF] Retainer signed — confirm fee structure',
    '[STAFF] Request full claims file from insurer',
    '[STAFF] Gather: correspondence, adjuster reports, photos, estimates',
    '[LAWYER] Review denial — identify legal grounds',
    '[LAWYER] Draft demand letter to insurer',
    '[STAFF] Calendar limitation date — 1 year from loss (most ON policies)',
    '[LAWYER] File statement of claim if no response in 30 days'
  ]}
];

// ════════════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════════════
function toast(msg,dur=3200){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',dur);}
function log(msg,icon='✓'){S.activity.unshift({msg,icon,time:new Date().toLocaleTimeString()});if(S.activity.length>60)S.activity.pop();renderFeed();}
function saveLocal(){try{localStorage.setItem('hkslaw_v2',JSON.stringify({tasks:S.tasks,staff:S.staff,partners:S.partners,kpis:S.kpis,drafts:S.drafts,activity:S.activity.slice(0,30),gsConfig}));}catch(e){}}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem('hkslaw_v2')||'{}');if(d.tasks)S.tasks=d.tasks;if(d.staff)S.staff=d.staff;if(d.partners)S.partners=d.partners;if(d.kpis)S.kpis=d.kpis;if(d.activity)S.activity=d.activity;if(d.gsConfig&&d.gsConfig.sheetId){gsConfig=d.gsConfig;document.getElementById('gs-sheet-id').value=gsConfig.sheetId||'';document.getElementById('gs-api-key').value=gsConfig.apiKey||'';}}catch(e){}}
function mergeTaskDone(){PHASES.forEach(p=>p.tasks.forEach(t=>{const f=S.tasks.find(x=>x.id===t.id);if(f)t.done=f.done;}));}
function openModal(title,body,footer='<button class="btn btn-ghost" onclick="closeModal()">Close</button>'){document.getElementById('modal-title').textContent=title;document.getElementById('modal-body').innerHTML=body;document.getElementById('modal-footer').innerHTML=footer;document.getElementById('modal').classList.add('open');}
function closeModal(){document.getElementById('modal').classList.remove('open');}

// ════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════
const TITLES={dashboard:'Dashboard',phases:'Growth Phases','ai-analysis':'AI Analysis',growth:'Growth Hub',marketing:'Marketing Engine',referral:'Referral Engine',kpis:'KPI Tracker',gmail:'Gmail Integration',compose:'AI Email Composer',staff:'Staff Hub',playbook:'Staff Playbook',compliance:'LAWPRO / LSO Compliance',sops:'SOPs & Checklists',aiops:'AI Operating Partner',backup:'Backup & Sync'};
function nav(page){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const sec=document.getElementById('section-'+page);
  if(sec) sec.classList.add('active');
  // Find active nav item by data attribute instead of onclick selector
  document.querySelectorAll('.nav-item').forEach(n=>{
    if(n.getAttribute('data-page')===page) n.classList.add('active');
  });
  const titleEl=document.getElementById('page-title');
  if(titleEl) titleEl.textContent=TITLES[page]||page;
  if(page==='dashboard') renderDash();
  if(page==='phases') renderPhases();
  if(page==='compliance') renderCompliance();
  if(page==='sops') renderSOPs();
  if(page==='referral') renderReferral();
  if(page==='staff') renderStaff();
  if(page==='kpis') renderKPIs();
  if(page==='growth') renderGrowth();
  if(page==='marketing') renderMarketing();
  if(page==='playbook') renderPlaybook('intake');
  if(page==='ai-analysis') renderAnalysisPage();
  if(page==='backup') renderBackup();
  if(page==='aiops') renderAIPrompts();
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
function renderDash(){
  const allT=PHASES.flatMap(p=>p.tasks);
  const done=allT.filter(t=>t.done).length;
  const total=allT.length;
  const today=new Date().toISOString().split('T')[0];
  const overdue=allT.filter(t=>!t.done&&t.due<today).length;
  const p1=PHASES[0].tasks;const p1done=p1.filter(t=>t.done).length;
  const pct=Math.round((p1done/p1.length)*100);
  document.getElementById('dash-summary').innerHTML=`<span class="amber">⚠ ${overdue} overdue</span> · <span class="green">✓ ${done}/${total} tasks complete</span> · Phase 1: ${pct}% done · ${fd(PHASES[0].deadline)} deadline`;
  document.getElementById('b-phases').textContent=overdue;

  // Metrics
  document.getElementById('dash-metrics').innerHTML=[
    {l:'Phase 1',v:pct+'%',s:'of tasks done',c:'var(--gold)'},
    {l:'Tasks Done',v:done,s:'of '+total+' total',c:'var(--green)'},
    {l:'Overdue',v:overdue,s:'need attention',c:overdue>0?'var(--red)':'var(--green)'},
    {l:'Staff Count',v:S.staff.length,s:'team members',c:'var(--blue)'},
    {l:'Referral Partners',v:S.partners.length,s:'active',c:'var(--amber)'},
  ].map(m=>`<div class="metric-card"><div class="metric-label">${m.l}</div><div class="metric-value" style="color:${m.c}">${m.v}</div><div class="metric-sub">${m.s}</div></div>`).join('');

  // Priority tasks
  const urgent=allT.filter(t=>!t.done&&t.due<=gd(2)).slice(0,5);
  document.getElementById('dash-tasks').innerHTML=urgent.length?urgent.map(t=>taskHTML(t,true)).join(''):'<div class="muted" style="padding:12px 0;">No urgent tasks — you are on track! 🎉</div>';

  // Firm Score
  const score=calcFirmScore();
  document.getElementById('firm-score-panel').innerHTML=renderScorePanel(score);

  // Phase bars
  document.getElementById('dash-phases').innerHTML=PHASES.map(p=>{
    const d=p.tasks.filter(t=>t.done).length,tot=p.tasks.length,pct=Math.round((d/tot)*100);
    return`<div class="mb12"><div class="flex fb fc mb8"><span style="font-size:12px;color:var(--text)">${p.label}</span><span style="font-size:11px;color:${pct>=80?'var(--green)':pct>30?'var(--amber)':'var(--text3)'};">${d}/${tot}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>=80?'var(--green)':pct>30?'var(--amber)':'var(--gold)'};"></div></div></div>`;
  }).join('');

  // Pipeline
  const rev=S.kpis.reduce((a,k)=>a+(parseInt(k.revenue)||0),0);
  const leads=S.kpis.reduce((a,k)=>a+(parseInt(k.leads)||0),0);
  document.getElementById('dash-pipeline').innerHTML=`
    <div class="metric-card mb8"><div class="metric-label">Total Revenue Logged</div><div class="metric-value green">$${rev.toLocaleString()}</div></div>
    <div class="metric-card mb8"><div class="metric-label">Total Leads Tracked</div><div class="metric-value">${leads}</div></div>
    <div class="metric-card"><div class="metric-label">Referral Partners</div><div class="metric-value gold">${S.partners.length}</div></div>
    <button class="btn btn-ghost btn-sm mt8" onclick="nav('kpis')">Log this week →</button>`;

  renderFeed();
  calcFirmScore();
}

function calcFirmScore(){
  const allT=PHASES.flatMap(p=>p.tasks);
  const done=allT.filter(t=>t.done).length;
  const prog=Math.min(100,Math.round((done/allT.length)*100));
  const has_staff=S.staff.length>0?20:0;
  const has_partners=Math.min(20,S.partners.length*5);
  const has_kpis=S.kpis.length>0?20:0;
  const has_drafts=S.drafts.length>0?10:0;
  const overall=Math.min(100,Math.round(prog*0.4+has_staff+has_partners+has_kpis+has_drafts));
  S.firmScore={overall,tasks:prog,staff:has_staff,partners:has_partners,kpis:has_kpis};
  return S.firmScore;
}

function renderScorePanel(s){
  const pct=s.overall||0;
  const color=pct>=70?'var(--green)':pct>=40?'var(--amber)':'var(--red)';
  return`<div class="flex fc g16 mb12">
    <div style="text-align:center;padding:16px;">
      <div style="font-family:'Playfair Display',serif;font-size:48px;font-weight:700;color:${color};line-height:1;">${pct}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">/ 100 Firm Score</div>
    </div>
    <div style="flex:1;">
      ${[['Task Completion',s.tasks||0],[' Staff Setup',Math.min(100,((S.staff.length||0)/1)*100)],['Referral Engine',Math.min(100,(S.partners.length||0)*20)],['KPI Tracking',S.kpis.length>0?100:0]].map(([l,v])=>`
      <div class="mb8"><div class="flex fb fc mb4" style="font-size:11px;"><span class="muted">${l}</span><span style="color:${v>=70?'var(--green)':v>30?'var(--amber)':'var(--red)'};">${Math.round(v)}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(v)}%;background:${v>=70?'var(--green)':v>30?'var(--amber)':'var(--gold)'};"></div></div></div>`).join('')}
    </div>
  </div>
  <div style="font-size:11.5px;color:var(--text3);padding:8px;background:var(--surface3);border-radius:var(--radius);">${pct<40?'🔴 Urgent: Start Phase 1 tasks now — your firm needs systems immediately.':pct<70?'🟡 Progress: Good start — keep completing tasks and adding partners to build momentum.':'🟢 Strong: Your firm is systematized. Focus on delegation and passive income now.'}</div>`;
}

function renderFeed(){
  const el=document.getElementById('dash-activity');
  if(!el) return;
  if(!S.activity.length){el.innerHTML='<div class="muted">No activity yet.</div>';return;}
  el.innerHTML=S.activity.slice(0,20).map(a=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">
    <span style="font-size:13px;flex-shrink:0;">${a.icon}</span>
    <div><div style="font-size:11.5px;color:var(--text2);">${a.msg}</div><div class="muted">${a.time}</div></div>
  </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  PHASES
// ════════════════════════════════════════════════════════════
function taskHTML(t,compact=false){
  const today=new Date().toISOString().split('T')[0];
  const ov=!t.done&&t.due<today;
  const td=!t.done&&t.due===today;
  const oc=t.owner==='lawyer'?'tag-lawyer':t.owner==='staff'?'tag-staff':'tag-auto';
  const ol=t.owner==='lawyer'?'LAWYER ONLY':t.owner==='staff'?'STAFF':'AUTOMATABLE';
  return`<div class="task-item ${t.done?'done':''}" id="ti-${t.id}">
    <div class="task-check ${t.done?'checked':''}" onclick="toggleTask('${t.id}')">${t.done?'✓':''}</div>
    <div style="flex:1">
      <div style="font-size:12.5px;color:var(--text);${t.done?'text-decoration:line-through;opacity:.6;':''}">${t.text}</div>
      <div class="flex g8 mt8 fw">
        <span class="tag ${oc}">${ol}</span>
        ${ov?`<span class="tag tag-overdue">⚠ Overdue ${fd(t.due)}</span>`:''}
        ${td?`<span class="tag" style="background:var(--amber-bg);color:var(--amber);">Due Today</span>`:''}
        ${!ov&&!td&&t.due?`<span class="tag" style="background:transparent;border:1px solid var(--border);color:var(--text3);">${fd(t.due)}</span>`:''}
      </div>
    </div>
    ${compact?'':`<div class="flex g8" style="flex-shrink:0">
      ${t.owner==='staff'?`<button class="btn btn-green btn-sm" onclick="quickDel('${t.id}')">Delegate</button>`:''}
      ${t.owner==='lawyer'?`<button class="btn btn-ghost btn-sm" onclick="openCompose()">Email</button>`:''}
    </div>`}
  </div>`;
}

function toggleTask(id){
  let found;
  PHASES.forEach(p=>p.tasks.forEach(t=>{if(t.id===id){t.done=!t.done;found=t;}}));
  if(found){
    S.tasks=S.tasks.filter(x=>x.id!==id);S.tasks.push({id,done:found.done});
    saveLocal();syncToFirebase();
    log(`${found.done?'✅ Completed':'↩ Reopened'}: ${found.text.substring(0,55)}...`,found.done?'✅':'↩');
    renderDash();renderPhases();
    toast(found.done?'Task completed! Syncing…':'Task reopened');
  }
}

function renderPhases(filter='all'){
  const el=document.getElementById('phases-content');
  el.innerHTML=PHASES.map(p=>{
    const tasks=filter==='all'?p.tasks:p.tasks.filter(t=>t.owner===filter||(filter==='auto'&&t.owner==='auto'));
    const d=p.tasks.filter(t=>t.done).length,tot=p.tasks.length;
    const pct=Math.round((d/tot)*100);
    const dl=du(p.deadline);
    return`<div class="card mb14">
      <div class="flex fc fb mb12">
        <div>
          <div class="flex fc g8 mb8"><span class="tag ${p.badgeClass}">${p.badge}</span><span class="muted">Deadline: ${fd(p.deadline)} · ${dl>0?dl+' days away':dl===0?'Today':'Overdue'}</span></div>
          <div style="font-size:16px;font-weight:600;font-family:'Playfair Display',serif;">${p.label} — ${p.title}</div>
        </div>
        <div style="text-align:right"><div style="font-size:22px;font-family:'Playfair Display',serif;color:${pct>=80?'var(--green)':pct>40?'var(--amber)':'var(--text)'};">${pct}%</div><div class="muted">${d}/${tot}</div></div>
      </div>
      <div class="progress-bar mb14"><div class="progress-fill" style="width:${pct}%;background:${pct>=80?'var(--green)':pct>40?'var(--amber)':'var(--gold)'};"></div></div>
      ${tasks.map(t=>taskHTML(t)).join('')}
    </div>`;
  }).join('');
}
function filterP(f){document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));event.target.classList.add('active');renderPhases(f);}

// ════════════════════════════════════════════════════════════
//  GROWTH HUB
// ════════════════════════════════════════════════════════════
const GROWTH_CONTENT={
  revenue:`<div class="grid-2 mb14">
    <div class="card card-gold">
      <div class="card-title">💰 The 5 Revenue Levers</div>
      ${[
        ['More leads','Outbound (calls, emails) + Inbound (Google, reviews, referrals)'],
        ['Higher conversion','Better intake script, faster response, follow-up sequence'],
        ['Higher average file value','Bundle services, premium positioning, fee review'],
        ['More files per client','RE buyer → seller → wills → insurance claim'],
        ['Faster file velocity','SOPs, delegation, reduce bottlenecks at lawyer level']
      ].map(([t,b])=>`<div class="compliance-item warn mb8"><div style="font-size:12.5px;font-weight:600;color:var(--text);">📌 ${t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${b}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">🎯 Priority Revenue Actions This Month</div>
      ${[
        'Call 2 realtors per week — build relationship, not sales pitch',
        'Set up booking link (Calendly) — remove friction from consult booking',
        'Ask every closed client for a Google review within 48 hrs',
        'Send a reactivation email to all past clients (last 3 years)',
        'Create a "referral offer" for mortgage brokers — fast service SLA',
        'Post 1 educational Google/social post per week (RE, immigration tip)',
        'Log every lead — you cannot improve what you cannot see',
        'Review your fee schedule — are you underpricing RE closings?',
      ].map((a,i)=>`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2);"><span class="gold bold">${i+1}</span>${a}</div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">📊 Revenue Model — What HKS Law Should Target</div>
    <div class="grid-4">
      ${[
        {area:'Real Estate',target:'8 files/month',rev:'$800–1,200/file',total:'~$8,000–10,000/mo'},
        {area:'Immigration',target:'4 files/month',rev:'$2,000–4,000/file',total:'~$8,000–16,000/mo'},
        {area:'L&T Board',target:'6 files/month',rev:'$800–1,500/file',total:'~$5,000–9,000/mo'},
        {area:'Insurance Claims',target:'2 files/month',rev:'Contingency 20–30%',total:'Variable'},
      ].map(r=>`<div class="metric-card"><div class="metric-label">${r.area}</div><div style="font-size:14px;font-weight:600;color:var(--text);margin:6px 0;">${r.target}</div><div style="font-size:11px;color:var(--text3);">${r.rev}</div><div style="font-size:11px;color:var(--green);margin-top:4px;">${r.total}</div></div>`).join('')}
    </div>
  </div>`,

  conversion:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">📞 Conversion Funnel</div>
      ${[['Lead contacts firm','100%',''],['Lead logs in CRM','Target: 100%','Staff'],['Consultation booked','Target: 60%','Staff script'],['Consultation attended','Target: 80%','Reminder system'],['Retainer signed','Target: 70%','Lawyer close'],['File opened','100%','']].map(([s,p,r])=>`<div class="flex fc fb" style="padding:9px 0;border-bottom:1px solid var(--border);"><div style="font-size:12px;color:var(--text)">${s}</div><div class="flex g8"><span style="font-size:11px;color:var(--gold);">${p}</span>${r?`<span class="tag tag-staff">${r}</span>`:''}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">⚡ Conversion Killers to Fix Right Now</div>
      ${[
        ['Slow response (>4 hrs)','Client goes to next lawyer — set 2-hr response SLA'],
        ['No follow-up system','80% of leads need 2+ touches — implement Day 1/3/7'],
        ['Lawyer answers intake','Bottleneck — staff handles intake, lawyer closes retainer'],
        ['No booking link','Friction kills conversions — add Calendly today'],
        ['Unclear pricing','Say "fixed fee" not "it depends" — add transparency'],
        ['No social proof','Ask every happy client for a Google review immediately'],
      ].map(([k,f])=>`<div class="compliance-item alert mb8"><div style="font-size:12px;font-weight:600;color:var(--red);">✕ ${k}</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;">Fix: ${f}</div></div>`).join('')}
    </div>
  </div>`,

  pricing:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">💎 Ontario 2026 Market Pricing — KW Area</div>
      <table class="table">
        <thead><tr><th>Service</th><th>Market Rate</th><th>Recommended</th></tr></thead>
        <tbody>
          ${[
            ['RE Purchase (standard)','$950–1,400','$1,100–1,300'],
            ['RE Sale (standard)','$700–1,100','$850–1,000'],
            ['RE Refinance','$500–750','$650–750'],
            ['Immigration — Work Permit','$1,500–3,000','$1,800–2,500'],
            ['Immigration — PR Application','$3,000–5,000','$3,500–4,500'],
            ['LTB — L1 Application','$800–1,500','$1,000–1,200'],
            ['Separation Agreement','$1,500–3,500','$2,000–3,000'],
            ['Insurance Denial Claim','Contingency 25–33%','25–30%'],
          ].map(([s,m,r])=>`<tr><td>${s}</td><td style="color:var(--text3);">${m}</td><td style="color:var(--gold);">${r}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-title">📈 Pricing Strategy for Growth</div>
      ${[
        ['Position on speed, not price','KW realtors pay more for reliable, fast closings than the cheapest option'],
        ['Bundle RE purchase + title insurance','Present as one package — less price comparison'],
        ['Flat fee transparency','List fees clearly on website — it converts better than "contact for quote"'],
        ['Premium for rush matters','Charge 20–30% more for sub-10-day closings — they value reliability'],
        ['Disbursement clearly separated','Client sees your fee vs. disbursements separately — makes value clearer'],
        ['Annual review of fee schedule','Review every January — adjust for CPI, market rates, complexity'],
      ].map(([t,b])=>`<div class="compliance-item ok mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">✓ ${t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;">${b}</div></div>`).join('')}
    </div>
  </div>`,

  pipeline:`<div class="card mb14">
    <div class="card-title">🔄 Build Your CRM Sales Pipeline</div>
    <div class="grid-4">
      ${[['New Lead','Came in via referral, Google, direct','Tag: source, date, matter type'],
        ['Consultation Booked','Call or meeting scheduled','Staff confirms by email + reminder'],
        ['Retainer Signed','Engaged — file opened','Engagement letter out within 24 hrs'],
        ['File Active','Working on matter','Milestone updates to client every 7 days']
      ].map(([t,d,a])=>`<div class="metric-card" style="text-align:center;padding:16px 10px;"><div style="font-size:20px;margin-bottom:8px;">📋</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;">${t}</div><div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${d}</div><div style="font-size:10.5px;color:var(--amber);">${a}</div></div>`).join('')}
    </div>
    <div class="divider"></div>
    <div style="font-size:12px;color:var(--text2);">Recommended tool: <strong style="color:var(--gold);">Clio Grow</strong> — integrates with Clio Manage (which you may already use). Free 7-day trial. Set up pipeline stages above and have staff update daily.</div>
  </div>`,

  networking:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">🌐 Networking Strategy — KW Region</div>
      ${[
        {org:'KW Chamber of Commerce',action:'Attend monthly events — meet realtors and business owners',freq:'Monthly'},
        {org:'RE/MAX, Royal LePage, Century 21 KW',action:'Visit top 3 offices — ask for 10 min with branch manager',freq:'One-time'},
        {org:'Greater KW Association of Realtors (GKWAR)',action:'Join as affiliate member — sponsor 1 event per year',freq:'Annual'},
        {org:'Immigration Consultants of Canada (ICCRC)',action:'Connect with 5 local RCIC consultants for referral pipeline',freq:'Quarterly'},
        {org:'BNI Waterloo',action:'Consider joining a chapter — structured weekly referrals',freq:'Weekly'},
        {org:'LinkedIn KW Professionals',action:'Post 1 legal tip per week — tag KW, Waterloo, real estate',freq:'Weekly'},
      ].map(r=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div style="font-size:12.5px;font-weight:500;color:var(--text);">${r.org}</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;">${r.action}</div><span class="tag tag-auto" style="margin-top:5px;">${r.freq}</span></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">💬 30-Second Elevator Pitch (Practice This)</div>
      <div class="ai-response">"I am [LAWYER] — I run HKS Law in Kitchener. We focus on real estate, immigration, and landlord-tenant matters. What makes us different is we answer within 4 hours and we are known for never surprising clients with delays on closing day. If you ever have a client who needs a lawyer they can actually reach — that is us."</div>
      <div class="card-title mt12">📌 What Realtors Actually Care About</div>
      ${['Speed — they need to know you will not blow a closing date','Communication — they hate chasing lawyers for updates','Flexibility — digital signing, evening availability for clients','Reliability — same result every time, no drama'].map(t=>`<div style="font-size:12px;color:var(--text2);padding:7px 0;border-bottom:1px solid var(--border);">✓ ${t}</div>`).join('')}
    </div>
  </div>`,

  retention:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">💛 Client Retention System</div>
      ${[
        ['Day of file close','Send reporting letter + Google review request + thank you email'],
        ['30 days post-close','Check-in call from staff — "How did everything go?"'],
        ['6 months post-close','RE clients: market update email — refi opportunity, selling?'],
        ['12 months post-close','Holiday or anniversary email — personal touch'],
        ['Annual (all clients)','Update email — any changes to family/property situation? New needs?'],
        ['Referral moment','When client refers someone: thank-you card + follow-up email'],
      ].map(([t,a])=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div style="font-size:12px;font-weight:600;color:var(--gold);">${t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${a}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">📊 Client Lifetime Value Calculator</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.8;">
        A real estate client who buys once, sells 7 years later, refers 2 people, and returns for a will:<br/><br/>
        <div class="metric-card mb8"><div class="metric-label">Direct files</div><div class="metric-value gold">$2,800</div><div class="metric-sub">Purchase + Sale + Wills</div></div>
        <div class="metric-card mb8"><div class="metric-label">Referrals (2 × $1,400)</div><div class="metric-value gold">$2,800</div></div>
        <div class="metric-card"><div class="metric-label">Client Lifetime Value</div><div class="metric-value green">$5,600+</div></div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;">This is why reviews, retention emails, and follow-ups are not optional — one happy client compounds.</div>
      </div>
    </div>
  </div>`,

  expansion:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">📈 Service Expansion Roadmap</div>
      ${[
        {phase:'Now',service:'Real Estate + Immigration + L&T + Insurance',note:'Core 4 — build volume and delegation'},
        {phase:'Phase 3',service:'Add: Wills & Powers of Attorney',note:'Natural RE add-on — same client, easy sell'},
        {phase:'Phase 4',service:'Add: Corporate / Business Law basics',note:'SMB clients from networking — contracts, incorporation'},
        {phase:'Year 2',service:'Add: Second lawyer or articling student',note:'Volume exceeds 1 lawyer capacity — time to grow the team'},
        {phase:'Year 2',service:'Virtual assistant for admin',note:'Remove non-legal admin completely from staff'},
      ].map(r=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div class="flex fc g8 mb4"><span class="tag tag-auto">${r.phase}</span><span style="font-size:12.5px;font-weight:500;color:var(--text);">${r.service}</span></div><div style="font-size:11.5px;color:var(--text2);">${r.note}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">🔑 Wills & Estate Add-On (Quick Win)</div>
      <div class="compliance-item ok mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">Why it works for HKS Law</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">Every RE purchase client is a warm lead for wills/POA. During closing: "Many clients update their wills when they buy a property — would you like [LAWYER] to follow up?" — staff-driven, low effort, $500–1,000 per file.</div></div>
      <div class="compliance-item ok mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">Revenue potential</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">5 RE closings/month × 30% conversion to wills × $700 avg = <strong style="color:var(--gold);">$1,050/month incremental with zero new marketing.</strong></div></div>
    </div>
  </div>`
};

function renderGrowth(){
  document.querySelectorAll('#section-growth .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('#section-growth .tab-btn').classList.add('active');
  document.getElementById('growth-content').innerHTML=GROWTH_CONTENT.revenue;
}
function growthtab(k){
  document.querySelectorAll('#section-growth .tab-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('growth-content').innerHTML=GROWTH_CONTENT[k]||'<div class="muted">Coming soon.</div>';
}

// ════════════════════════════════════════════════════════════
//  MARKETING ENGINE
// ════════════════════════════════════════════════════════════
const MK={
  campaigns:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">📬 Active Campaign Calendar</div>
      ${[
        {name:'Realtor Outreach Blitz',status:'▶ Active',target:'10 realtors/week',channel:'Phone + Email',due:'Week 1'},
        {name:'Past Client Reactivation',status:'▶ Active',target:'All clients 2023–2025',channel:'Email',due:'Week 1'},
        {name:'Google Review Campaign',status:'⏸ Pending',target:'All closed 2025 files',channel:'Email + Text',due:'Week 2'},
        {name:'Mortgage Broker Partnership',status:'⏸ Pending',target:'5 brokers KW',channel:'Email + Visit',due:'Week 2'},
        {name:'Immigration Referral Outreach',status:'⏸ Pending',target:'RCIC consultants',channel:'Email',due:'Week 3'},
      ].map(c=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div class="flex fc fb"><div style="font-size:12.5px;font-weight:500;color:var(--text);">${c.name}</div><span class="tag ${c.status.includes('Active')?'tag-ok':'tag-ai'}">${c.status}</span></div><div class="flex g8 mt8"><span class="muted">${c.channel}</span><span class="muted">·</span><span class="muted">${c.target}</span><span class="muted">·</span><span style="font-size:11px;color:var(--gold);">${c.due}</span></div></div>`).join('')}
      <button class="btn btn-gold btn-sm mt12" onclick="nav('compose')">+ Create Campaign Email</button>
    </div>
    <div class="card">
      <div class="card-title">📊 Campaign Performance Tracking</div>
      <div class="compliance-item warn" style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:var(--text);">Log your outreach results weekly</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">Every call, email, and meeting should be logged in the referral tracker. You cannot optimize what you do not measure.</div></div>
      ${['Calls made this week: ___','Emails sent: ___','Responses received: ___','Consultations booked from outreach: ___','Referrals received: ___'].map(f=>`<div style="font-size:12px;color:var(--text2);padding:6px 0;border-bottom:1px solid var(--border);">${f}</div>`).join('')}
      <button class="btn btn-ghost btn-sm mt12" onclick="nav('kpis')">Log to KPI Tracker →</button>
    </div>
  </div>`,
  content:`<div class="card mb14">
    <div class="card-title">📅 Monthly Content Calendar — HKS Law</div>
    <div class="grid-3">
      ${[
        {week:'Week 1',type:'Education',topic:'5 things to check before closing on a house in Ontario',channel:'Google Business + LinkedIn'},
        {week:'Week 1',type:'Referral',topic:'Email to 10 realtors — partnership intro',channel:'Email'},
        {week:'Week 2',type:'Education',topic:'Your work permit is expiring — here is what to do',channel:'Google Business + LinkedIn'},
        {week:'Week 2',type:'Social Proof',topic:'Share a (de-identified) success story from a recent file',channel:'LinkedIn + Google'},
        {week:'Week 3',type:'Education',topic:'What an N4 notice means and what tenants can do',channel:'Google Business'},
        {week:'Week 3',type:'Community',topic:'Tag KW Chamber event / local business news',channel:'LinkedIn'},
        {week:'Week 4',type:'Education',topic:'Why your insurance company denied your claim (and what to do)',channel:'Google Business + LinkedIn'},
        {week:'Week 4',type:'Personal',topic:'Behind the scenes at HKS Law — what we are working on',channel:'LinkedIn'},
      ].map(c=>`<div class="card" style="background:var(--surface3);padding:12px;"><div class="flex fc g8 mb8"><span class="tag tag-ai">${c.week}</span><span class="tag tag-staff">${c.type}</span></div><div style="font-size:12px;font-weight:500;color:var(--text);">${c.topic}</div><div class="muted mt8">${c.channel}</div><button class="btn btn-ghost btn-sm mt8" onclick="aiDraftContent('${c.topic}')">🤖 Draft with AI</button></div>`).join('')}
    </div>
  </div>`,
  google:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">🔍 Google Business Profile Checklist</div>
      ${[
        {s:'warn',t:'Claim and verify your listing',b:'Go to business.google.com — search "HKS Law Kitchener" and claim your listing.'},
        {s:'warn',t:'Complete 100% of profile fields',b:'Business hours, description, website, phone, service areas (all of KW + Cambridge).'},
        {s:'warn',t:'Add services — all 4 practice areas',b:'Real Estate Law, Immigration Law, Landlord and Tenant, Insurance Claims.'},
        {s:'warn',t:'Upload 5+ photos',b:'Office exterior, interior, headshot of lawyer — not stock photos.'},
        {s:'ok',t:'Post weekly (Google Posts)',b:'Use the content calendar above. Posts show up in search results.'},
        {s:'warn',t:'Target: 25+ reviews',b:'Google shows star rating when you have 25+ reviews. Priority action.'},
      ].map(i=>`<div class="compliance-item ${i.s} mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">${i.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;">${i.b}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">🎯 Local SEO Keywords for HKS Law</div>
      ${['real estate lawyer kitchener','real estate lawyer waterloo','immigration lawyer kitchener-waterloo','landlord tenant lawyer ontario','LTB lawyer kitchener','insurance claim lawyer ontario','property lawyer waterloo region','work permit lawyer KW'].map(k=>`<div style="font-size:12px;color:var(--text2);padding:7px 0;border-bottom:1px solid var(--border);">🔍 ${k}</div>`).join('')}
      <div style="font-size:11.5px;color:var(--text3);margin-top:10px;">Add these to: website meta tags, Google Business description, blog posts, and social media content.</div>
    </div>
  </div>`,
  reviews:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">⭐ Review Generation System</div>
      ${[
        {t:'Step 1: Ask at the right moment',b:'Within 48 hours of a positive outcome — RE closing, immigration approval, LTB win. Strike while the client is happiest.'},
        {t:'Step 2: Staff sends the request',b:'Template email: "It was a pleasure working with you — if you have 2 minutes, a Google review would mean a lot to our small firm. [LINK]"'},
        {t:'Step 3: Follow up once',b:'If no review in 5 days, one text reminder. Never more than twice.'},
        {t:'Step 4: Respond to every review',b:'Thank positive reviewers personally. For negative: professional response, never defensive, address offline.'},
      ].map(s=>`<div class="compliance-item ok mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">${s.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${s.b}</div></div>`).join('')}
      <button class="btn btn-gold btn-sm mt12" onclick="setComposeTemplate('review-request')">Draft Review Request Email →</button>
    </div>
    <div class="card">
      <div class="card-title">📈 Review Goals</div>
      <div class="metric-card mb8"><div class="metric-label">Current Google Rating</div><div class="metric-value gold">Enter yours →</div></div>
      <div class="metric-card mb8"><div class="metric-label">Reviews needed for prominence</div><div class="metric-value">25+</div><div class="metric-sub">Google shows stars at 25+ reviews in local search</div></div>
      <div class="metric-card mb8"><div class="metric-label">Target by Phase 2 end</div><div class="metric-value green">15 reviews</div></div>
      <div class="divider"></div>
      <div style="font-size:11.5px;color:var(--text2);">LSO note: You may ask clients for reviews, but cannot offer incentives. Do not post fake reviews or ask staff to post reviews. — Rules of Professional Conduct.</div>
    </div>
  </div>`,
  social:`<div class="card mb14">
    <div class="card-title">📱 Social Media Strategy for HKS Law</div>
    <div class="grid-2">
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:10px;">LinkedIn (Primary Channel)</div>
        ${['Post 1x/week — educational content, local insights','Connect with: realtors, mortgage brokers, HR managers (immigration), property managers','Engage with KW business community posts','Share wins (with permission and de-identification)','Profile: complete, lawyer bio, all practice areas listed'].map(t=>`<div style="font-size:12px;color:var(--text2);padding:6px 0;border-bottom:1px solid var(--border);">✓ ${t}</div>`).join('')}
      </div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--blue);margin-bottom:10px;">Google Business Posts (Secondary)</div>
        ${['Post 1x/week — same content repurposed from LinkedIn','Use local keywords naturally in every post','Photos of real office, not stock images','Announce any office updates, holiday hours','Link every post to a relevant page on hkslaw.ca'].map(t=>`<div style="font-size:12px;color:var(--text2);padding:6px 0;border-bottom:1px solid var(--border);">✓ ${t}</div>`).join('')}
        <div style="font-size:11.5px;color:var(--text3);margin-top:10px;">Instagram / Facebook: Optional. Only if you have capacity. LinkedIn is the higher-ROI channel for professional services.</div>
      </div>
    </div>
  </div>`,
  ads:`<div class="grid-2 mb14">
    <div class="card">
      <div class="card-title">📢 Google Ads Strategy (Phase 3)</div>
      ${[
        {t:'When to start',b:'After you have a Google Business profile, 15+ reviews, and a clear intake process. Starting ads before fixing conversion = burning money.'},
        {t:'Budget to start',b:'$500-800/month for KW market. Real estate lawyer CPCs are $15-40. Target 20-30 clicks/month at start.'},
        {t:'Top keywords to bid on',b:'real estate lawyer kitchener, immigration lawyer waterloo, LTB lawyer ontario, landlord tenant lawyer KW'},
        {t:'Landing page requirement',b:'Ads must go to a specific page - not homepage. One service, one CTA, clear price or get a free quote.'},
        {t:'LSO advertising rules',b:'Must include Licensed by the Law Society of Ontario - cannot use superlatives like best or top without substantiation.'},
      ].map(i=>`<div class="compliance-item warn mb8"><div style="font-size:12px;font-weight:600;color:var(--text);">${i.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;">${i.b||''}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">🎯 Ad Copy Framework</div>
      <div class="ai-response">Headline 1: Real Estate Lawyer Kitchener
Headline 2: Fast Closings · Clear Fees
Headline 3: HKS Law — Licensed in Ontario

Description: Helping Kitchener-Waterloo families buy, sell & close with confidence. Fixed fees, digital signing, 4-hr response guarantee. Book your consultation today.

CTA: Book a Free Consultation</div>
      <button class="btn btn-purple btn-sm mt12" style="width:100%" onclick="aiPromptCustom('Write 3 Google Ad variations for HKS Law real estate closings in Kitchener-Waterloo — LSO compliant, no superlatives')">🤖 Generate Ad Variations with AI</button>
    </div>
  </div>`
};

function renderMarketing(){
  document.querySelectorAll('#section-marketing .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('#section-marketing .tab-btn').classList.add('active');
  document.getElementById('marketing-content').innerHTML=MK.campaigns;
}
function mktab(k){
  document.querySelectorAll('#section-marketing .tab-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('marketing-content').innerHTML=MK[k]||'';
}

// ════════════════════════════════════════════════════════════
//  AI ANALYSIS
// ════════════════════════════════════════════════════════════
function renderAnalysisPage(){
  const score=calcFirmScore();
  document.getElementById('health-score-card').innerHTML=renderScorePanel(score);
  document.getElementById('practice-performance').innerHTML=[
    {a:'Real Estate',files:S.kpis.reduce((s,k)=>s+(parseInt(k.re)||0),0),target:8,color:'var(--gold)'},
    {a:'Immigration',files:S.kpis.reduce((s,k)=>s+(parseInt(k.imm)||0),0),target:4,color:'var(--blue)'},
    {a:'L&T',files:0,target:6,color:'var(--green)'},
    {a:'Insurance',files:0,target:2,color:'var(--amber)'},
  ].map(p=>{
    const pct=Math.min(100,Math.round((p.files/p.target)*100));
    return`<div class="mb12"><div class="flex fb fc mb4"><span style="font-size:12px;color:var(--text);">${p.a}</span><span style="font-size:11px;color:${p.color};">${p.files}/${p.target}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${p.color};"></div></div></div>`;
  }).join('');
  getRecommendations();
}

async function getRecommendations(){
  const el=document.getElementById('ai-recommendations');
  if(!el) return;
  el.innerHTML=`<div style="padding:12px;color:var(--text3);font-size:12px;"><div class="dots"><span></span><span></span><span></span></div> Analyzing your firm…</div>`;
  const score=calcFirmScore();
  const prompt=`You are an AI law firm growth advisor for HKS Law, a small Ontario firm in Kitchener-Waterloo (Real Estate, Immigration, L&T, Insurance). Based on this data:
- Firm score: ${score.overall}/100
- Tasks completed: ${PHASES.flatMap(p=>p.tasks).filter(t=>t.done).length}/${PHASES.flatMap(p=>p.tasks).length}
- Staff members: ${S.staff.length}
- Referral partners: ${S.partners.length}
- KPI weeks logged: ${S.kpis.length}

Give 4 specific, actionable recommendations in this format:
1. [PRIORITY LEVEL: HIGH/MED] Short title — One paragraph of specific action. Include who does it (lawyer/staff), what exactly to do, and expected revenue/growth impact.

Keep each recommendation under 60 words. Be direct, commercial, and specific to a small Ontario law firm. No fluff.`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const txt=d.content?.find(b=>b.type==='text')?.text||'';
    el.innerHTML=`<div style="font-size:12px;color:var(--text2);line-height:1.7;white-space:pre-wrap;">${txt}</div>`;
  }catch(e){
    el.innerHTML=`<div style="font-size:12px;color:var(--text3);">${[
      '🔴 HIGH: Add 1 staff member immediately — every intake call handled by lawyer costs $200+ in billable time.',
      '🟡 MED: Call 3 realtors this week — one partnership can add 4 files/month.',
      '🟡 MED: Implement Day 1/3/7 follow-up — 70% of leads need 2+ touches to convert.',
      '🟢 LOW: Set up Google Business profile — free, and drives inbound leads within 30 days.',
    ].join('\n\n')}</div>`;
  }
}

async function runHealthAnalysis(){
  const el=document.getElementById('health-score-card');
  const prev=el.innerHTML;
  el.innerHTML=`<div class="dots" style="padding:20px;"><span></span><span></span><span></span></div>`;
  await runAIAnalysis('Give a complete firm health analysis for HKS Law Kitchener-Waterloo Ontario. Cover: revenue model, delegation gaps, referral pipeline, compliance risks, and top 3 immediate actions. Be specific and commercial.');
  el.innerHTML=prev;
}

async function analyze(topic){
  document.getElementById('analysis-input').value=`Analyze ${topic} for HKS Law, a small Ontario law firm in Kitchener-Waterloo practicing Real Estate, Immigration, L&T, and Insurance Claims in 2026.`;
  await runAnalysis();
}

async function runAnalysis(){
  const input=document.getElementById('analysis-input').value.trim();
  if(!input){toast('Enter an analysis request');return;}
  const el=document.getElementById('analysis-output');
  el.innerHTML=`<div style="padding:16px;color:var(--text3);"><div class="dots"><span></span><span></span><span></span></div> Analyzing…</div>`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:`You are an expert law firm growth consultant and Ontario legal market analyst. HKS Law context: small firm, Kitchener-Waterloo, practices Real Estate, Immigration, Landlord & Tenant, Insurance Claims. Ontario 2026 compliance applies. KW is a growing tech/university market with high RE transaction volume and immigration demand.\n\nAnalysis request: ${input}\n\nProvide detailed, specific, commercially actionable analysis. Include data, numbers, comparisons where relevant. Structure your response clearly with sections. Be direct.`}]})});
    const d=await r.json();
    el.innerHTML=`<div class="ai-response">${d.content?.find(b=>b.type==='text')?.text||'No response'}</div>`;
    log('AI analysis run: '+input.substring(0,50),'🧠');
  }catch(e){el.innerHTML=`<div style="padding:20px;text-align:center;color:var(--text3);">Connect to internet to use AI Analysis</div>`;}
}

// ════════════════════════════════════════════════════════════
//  COMPLIANCE
// ════════════════════════════════════════════════════════════
function renderCompliance(){
  document.getElementById('lso-list').innerHTML=COMPLIANCE_DATA.lso.map(i=>`<div class="compliance-item ${i.s}"><div style="font-size:12.5px;font-weight:500;">${i.s==='ok'?'✓':i.s==='warn'?'⚠':'✕'} ${i.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${i.b}</div></div>`).join('');
  document.getElementById('lawpro-list').innerHTML=COMPLIANCE_DATA.lawpro.map(i=>`<div class="compliance-item ${i.s}"><div style="font-size:12.5px;font-weight:500;">${i.s==='ok'?'✓':'⚠'} ${i.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${i.b}</div></div>`).join('');
  document.getElementById('practice-compliance').innerHTML=`
    <div><div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:8px;">🏠 REAL ESTATE</div>
    ${['Title insurance — recommend and document on every purchase','FINTRAC verification for all parties including beneficial owners','Wire transfer verification call — always phone, never email only','Reporting letter within 30 days — LAWPRO claim trigger if missed'].map(t=>`<div class="compliance-item ok mb8"><div style="font-size:11.5px;">${t}</div></div>`).join('')}</div>
    <div><div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:8px;">✈️ IMMIGRATION</div>
    ${['Never guarantee outcomes — document all advice in writing','IRCC digital filing only — in-person filing phased out KW 2025','Enhanced beneficial ownership docs for corporate immigration 2026','Procedural fairness letters — respond within deadline, no extensions'].map(t=>`<div class="compliance-item ok mb8"><div style="font-size:11.5px;">${t}</div></div>`).join('')}</div>`;
  document.getElementById('on-updates').innerHTML=[
    {t:'LTB — Full digital filing (2025)',b:'All L/T applications via Tribunals Ontario Portal. In-person filing eliminated KW region. Staff must be trained on Portal.'},
    {t:'LSO CPD — 12 hrs/year (2026)',b:'Log by Dec 31. 3 hours must be professionalism. Online options available at lsontario.ca.'},
    {t:'FINTRAC — Beneficial ownership (2024+)',b:'Enhanced disclosure for RE transactions involving corporations or trusts. Document all beneficial owners over 25%.'},
    {t:'IRCC processing — AI-assisted (2025+)',b:'AI-screened applications face higher documentation standards. Completeness is critical — incomplete applications now rejected faster.'},
  ].map(u=>`<div class="compliance-item warn mb8"><div style="font-size:12.5px;font-weight:600;">📋 ${u.t}</div><div style="font-size:11.5px;color:var(--text2);margin-top:4px;">${u.b}</div></div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  SOPs
// ════════════════════════════════════════════════════════════
function renderSOPs(){
  document.getElementById('sops-grid').innerHTML=SOPS_DATA.map(sop=>`
    <div class="card">
      <div class="flex fc g8 mb12"><span style="font-size:22px;">${sop.icon}</span><span style="font-size:15px;font-weight:600;font-family:'Playfair Display',serif;">${sop.title}</span></div>
      ${sop.steps.map((s,i)=>{const l=s.startsWith('[LAWYER]');return`<div style="display:flex;gap:7px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">
        <span style="font-size:10.5px;color:var(--text3);min-width:16px;">${i+1}</span>
        <span class="tag ${l?'tag-lawyer':'tag-staff'}" style="flex-shrink:0;margin-top:1px;">${l?'⚖':'👥'}</span>
        <span style="font-size:11.5px;color:var(--text2);">${s.replace(/\[(LAWYER|STAFF)\]\s*/,'')}</span>
      </div>`;}).join('')}
      <button class="btn btn-ghost btn-sm mt12" onclick="emailSOP('${sop.title}')">📧 Email to Staff</button>
    </div>`).join('');
}
function emailSOP(t){document.getElementById('email-template').value='staff-sop';document.getElementById('c-context').value='SOP to delegate: '+t;nav('compose');loadTemplate();toast('SOP ready to email to staff →');}

// ════════════════════════════════════════════════════════════
//  REFERRAL
// ════════════════════════════════════════════════════════════
function renderReferral(){
  document.getElementById('ref-count').textContent=S.partners.length;
  document.getElementById('ref-due').textContent=S.partners.filter(p=>du(p.nextContact)<=3).length;
  document.getElementById('ref-in').textContent=S.partners.reduce((a,p)=>a+(parseInt(p.referrals)||0),0);
  document.getElementById('ref-rev').textContent='$'+S.partners.reduce((a,p)=>a+(parseInt(p.referrals)||0)*1200,0).toLocaleString();
  const pt=document.getElementById('partner-table');
  if(!S.partners.length){pt.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text3);"><div style="font-size:28px;margin-bottom:10px;">🤝</div><div style="font-size:13px;margin-bottom:12px;">No partners yet — add your first referral partner</div><button class="btn btn-gold" onclick="addPartner()">+ Add Partner</button></div>`;
  }else{pt.innerHTML=`<table class="table"><thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Referrals</th><th>Next Contact</th><th>Actions</th></tr></thead><tbody>${S.partners.map(p=>`<tr><td style="color:var(--text);">${p.name}</td><td><span class="tag tag-auto">${p.type}</span></td><td>${p.email||'—'}</td><td style="color:var(--gold);font-weight:600;">${p.referrals||0}</td><td style="color:${du(p.nextContact)<=0?'var(--red)':'var(--text2)'};">${fd(p.nextContact)}</td><td><button class="btn btn-ghost btn-sm" onclick="emailPartner('${p.name}','${p.type}')">Email</button></td></tr>`).join('')}</tbody></table>`;}
  document.getElementById('outreach-scripts').innerHTML=[
    {t:'Realtor Cold Call',type:'📞',s:`"Hi [NAME], this is [LAWYER] from HKS Law in Kitchener. I specialize in real estate closings and I am calling a handful of top agents in the area. I know a solid closing lawyer makes your life easier — do you have 2 minutes to hear what I offer my realtor partners?"`},
    {t:'Mortgage Broker Text',type:'💬',s:`"Hi [NAME], [LAWYER] here from HKS Law — RE closings in KW. I work with a small group of brokers where I guarantee 4-hour response and clear client communication. Would you be open to a quick coffee this week?"`},
    {t:'Immigration Consultant Email',type:'📧',s:`Hi [NAME], I am [LAWYER] at HKS Law. I handle immigration legal matters — refusals, inadmissibility, complex sponsorship. I know consultants sometimes need a lawyer for cases outside their scope. Happy to be that resource for you. Can we connect for 15 minutes?`},
    {t:'Contractor / Restoration',type:'📧',s:`Hi [NAME], I help Ontario homeowners whose insurance claims are denied. If your clients are having trouble getting paid after you complete restoration work, I can help them fight back — which often helps you get paid too. Can I explain how?`},
  ].map(s=>`<div class="card" style="background:var(--surface3);"><div class="flex fc g8 mb8"><span>${s.type}</span><span style="font-size:13px;font-weight:500;color:var(--text);">${s.t}</span></div><div style="font-size:12px;color:var(--text2);line-height:1.6;white-space:pre-wrap;">${s.s}</div><button class="btn btn-ghost btn-sm mt8" onclick="aiPromptCustom('Personalize this outreach script for HKS Law: ${s.s.substring(0,100)}...')">🤖 Personalize with AI</button></div>`).join('');
}

function addPartner(){
  openModal('Add Referral Partner',`<div class="form-group"><label class="form-label">Full Name</label><input type="text" id="p-name" placeholder="Sarah Chen"/></div><div class="form-group"><label class="form-label">Type</label><select id="p-type"><option>Realtor</option><option>Mortgage Broker</option><option>Immigration Consultant</option><option>Contractor / Restoration</option><option>Financial Planner</option><option>Family Mediator</option><option>Other</option></select></div><div class="form-group"><label class="form-label">Email</label><input type="email" id="p-email"/></div><div class="form-group"><label class="form-label">Company</label><input type="text" id="p-company"/></div>`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-gold" onclick="savePartner()">Add Partner</button>`);
}
function savePartner(){
  const name=document.getElementById('p-name').value;
  if(!name){toast('Enter a name');return;}
  S.partners.push({name,type:document.getElementById('p-type').value,email:document.getElementById('p-email').value,company:document.getElementById('p-company').value,referrals:0,nextContact:gd(14),added:new Date().toISOString().split('T')[0]});
  saveLocal();syncToFirebase();log('Added partner: '+name,'🤝');closeModal();renderReferral();toast('Partner added + synced!');
}
function emailPartner(name,type){
  document.getElementById('c-name').value=name;
  document.getElementById('email-template').value=type==='Realtor'?'realtor-intro':type==='Mortgage Broker'?'mortgage-intro':'immigration-agent';
  loadTemplate();nav('compose');
}

// ════════════════════════════════════════════════════════════
//  KPIs
// ════════════════════════════════════════════════════════════
function renderKPIs(){
  const rev=S.kpis.reduce((a,k)=>a+(parseInt(k.revenue)||0),0);
  const leads=S.kpis.reduce((a,k)=>a+(parseInt(k.leads)||0),0);
  const cons=S.kpis.reduce((a,k)=>a+(parseInt(k.consults)||0),0);
  const ret=S.kpis.reduce((a,k)=>a+(parseInt(k.retained)||0),0);
  document.getElementById('kpi-metrics').innerHTML=[
    {l:'Total Revenue',v:'$'+rev.toLocaleString(),s:'all weeks logged',c:'var(--green)'},
    {l:'Total Leads',v:leads,s:'tracked',c:'var(--gold)'},
    {l:'Lead→Consult',v:leads>0?Math.round((cons/leads)*100)+'%':'—',s:'target 60%',c:'var(--blue)'},
    {l:'Consult→Retain',v:cons>0?Math.round((ret/cons)*100)+'%':'—',s:'target 70%',c:'var(--amber)'},
  ].map(m=>`<div class="metric-card"><div class="metric-label">${m.l}</div><div class="metric-value" style="color:${m.c}">${m.v}</div><div class="metric-sub">${m.s}</div></div>`).join('');
  const hist=document.getElementById('kpi-history');
  if(!S.kpis.length){hist.innerHTML='<div class="muted">No weeks logged yet.</div>';return;}
  hist.innerHTML=S.kpis.slice().reverse().map(k=>`<div class="card" style="background:var(--surface3);margin-bottom:8px;padding:12px;"><div style="font-size:12px;color:var(--gold);font-weight:600;margin-bottom:8px;">Week of ${k.week}</div><div class="grid-2" style="gap:8px;font-size:11.5px;"><div>Leads: <strong>${k.leads}</strong></div><div>Consults: <strong>${k.consults}</strong></div><div>Retained: <strong>${k.retained}</strong></div><div style="color:var(--green);">Revenue: <strong>$${k.revenue}</strong></div>${k.re?`<div>RE Files: <strong>${k.re}</strong></div>`:''}</div>${k.notes?`<div style="font-size:11px;color:var(--text3);margin-top:6px;border-top:1px solid var(--border);padding-top:6px;">${k.notes}</div>`:''}</div>`).join('');
}

function logKPI(){
  const week=document.getElementById('kpi-week').value;
  if(!week){toast('Enter week date');return;}
  const entry={week,leads:document.getElementById('kpi-leads').value||0,consults:document.getElementById('kpi-consults').value||0,retained:document.getElementById('kpi-retained').value||0,revenue:document.getElementById('kpi-revenue').value||0,re:document.getElementById('kpi-re').value||0,imm:document.getElementById('kpi-imm').value||0,notes:document.getElementById('kpi-notes').value,date:new Date().toISOString()};
  S.kpis.push(entry);
  saveLocal();syncToFirebase();
  log('KPI logged: Week '+week+' · $'+entry.revenue,'📊');
  toast('KPI logged + synced to Firebase!');
  renderKPIs();
}

// ════════════════════════════════════════════════════════════
//  STAFF HUB
// ════════════════════════════════════════════════════════════
function renderStaff(){
  const sl=document.getElementById('staff-list');
  if(!S.staff.length){sl.innerHTML='<div class="muted mb12">No staff added yet.</div>';}
  else{sl.innerHTML=S.staff.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface3);border-radius:var(--radius);margin-bottom:8px;">
    <div style="width:34px;height:34px;border-radius:50%;background:var(--gold-dim);border:1.5px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0;">${s.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
    <div style="flex:1;"><div style="font-size:12.5px;font-weight:500;color:var(--text);">${s.name}</div><div class="muted">${s.role} · ${s.email}</div></div>
    <button class="btn btn-ghost btn-sm" onclick="emailStaff('${s.name}')">📧</button></div>`).join('');}
  const ds=document.getElementById('del-staff');
  ds.innerHTML='<option value="">Select…</option>'+S.staff.map(s=>`<option>${s.name}</option>`).join('');
  document.getElementById('delegation-map').innerHTML=`
    <div><div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:8px;">✓ STAFF CAN HANDLE</div>${STAFF_CAN.map(t=>`<div class="compliance-item ok mb6" style="padding:8px 10px;"><div style="font-size:11.5px;">${t}</div></div>`).join('')}</div>
    <div><div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px;">⚖ LAWYER ONLY (LSO Rule 5.1)</div>${LAWYER_ONLY.map(t=>`<div class="compliance-item alert mb6" style="padding:8px 10px;"><div style="font-size:11.5px;">${t}</div></div>`).join('')}</div>`;
}

function addStaff(){
  openModal('Add Staff Member',`<div class="form-group"><label class="form-label">Full Name</label><input type="text" id="s-name"/></div><div class="form-group"><label class="form-label">Role</label><input type="text" id="s-role" placeholder="Law Clerk / Receptionist / Office Manager"/></div><div class="form-group"><label class="form-label">Email</label><input type="email" id="s-email"/></div>`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-gold" onclick="saveStaff()">Add Staff</button>`);
}
function saveStaff(){
  const name=document.getElementById('s-name').value;
  if(!name){toast('Enter name');return;}
  S.staff.push({name,role:document.getElementById('s-role').value,email:document.getElementById('s-email').value});
  saveLocal();syncToFirebase();log('Staff added: '+name,'👥');closeModal();renderStaff();toast('Staff added + synced!');
}
function emailStaff(name){
  const s=S.staff.find(x=>x.name===name);
  if(s){document.getElementById('c-email').value=s.email||'';}
  document.getElementById('c-name').value=name;
  document.getElementById('email-template').value='staff-weekly';
  loadTemplate();nav('compose');
}
function sendDelegate(){
  const st=document.getElementById('del-staff').value;
  if(!st){toast('Select a staff member');return;}
  const s=S.staff.find(x=>x.name===st);
  document.getElementById('c-name').value=st;
  if(s) document.getElementById('c-email').value=s.email||'';
  document.getElementById('c-context').value='Delegation: '+document.getElementById('del-pkg').value+'\nNotes: '+document.getElementById('del-notes').value;
  document.getElementById('email-template').value='staff-sop';
  loadTemplate();nav('compose');toast('Delegation email ready →');
}
function quickDel(id){nav('staff');toast('Select staff and click "Generate Delegation Email"');}

// ════════════════════════════════════════════════════════════
//  PLAYBOOK
// ════════════════════════════════════════════════════════════
function renderPlaybook(key='intake'){
  document.querySelectorAll('#section-playbook .tab-btn').forEach(b=>b.classList.remove('active'));
  const items=PLAYBOOK_DATA[key]||[];
  document.getElementById('playbook-content').innerHTML=`
    <div style="background:var(--surface3);border:1px solid var(--gold-border);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--amber);">
      ⚖️ <strong>Critical Rule:</strong> Staff NEVER gives legal advice. If unsure, say: <em>"That is a great question — let me make sure [LAWYER] gives you the right answer. I will have [LAWYER] call you back by [TIME] today."</em>
    </div>
    ${items.map((item,i)=>`<div class="playbook-item" onclick="togglePlaybook(${i})">
      <div class="flex fc fb"><div class="playbook-q">Q: ${item.q}</div><span style="color:var(--text3);">▾</span></div>
      <div class="playbook-a" id="pa-${i}"><div style="font-size:12px;color:var(--text3);margin-bottom:4px;font-style:italic;">Approved Staff Response:</div>${item.a}</div>
    </div>`).join('')}
    <button class="btn btn-purple mt12" onclick="aiStaffQuestion()">🤖 Ask AI: What should staff say when…</button>
  `;
}
function playtab(k){
  document.querySelectorAll('#section-playbook .tab-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  renderPlaybook(k);
}
function togglePlaybook(i){
  const el=document.getElementById('pa-'+i);
  el.classList.toggle('open');
}
async function aiStaffQuestion(){
  const q=prompt('What situation should staff know how to handle?');
  if(!q) return;
  document.getElementById('ai-input').value=`You are HKS Law staff training guide. A staff member needs to handle this situation: "${q}". Write an approved script response they can use. The response must: (1) never give legal advice, (2) be professional and reassuring, (3) always involve the lawyer for any substantive question, (4) keep the client feeling cared for. Format: State what to say word-for-word, then what to do next (log it, flag to lawyer, etc.)`;
  nav('aiops');
  askAI();
}

// ════════════════════════════════════════════════════════════
//  COMPOSE
// ════════════════════════════════════════════════════════════
const TEMPLATES={
  'realtor-intro':{s:'Real Estate Legal Partnership — HKS Law, Kitchener-Waterloo',b:`Hi [NAME],

My name is [LAWYER] and I am the principal lawyer at HKS Law in Kitchener. I work exclusively in real estate law and reach out to a small number of realtors each year who I think would make strong partners.

What I offer your clients that most lawyers do not:
• Confirmed 4-hour response on all communications
• Digital document signing — clients close from anywhere
• Clear fee disclosure before any commitment
• Direct line to me — not a paralegal — on closing day

I have built my practice on the idea that a delayed or unresponsive lawyer costs you clients. I will not be that lawyer.

Could we connect for 15 minutes this week? Even a quick call to understand how you work.

[LAWYER NAME]
HKS Law · Kitchener, Ontario · hkslaw.ca
Licensed by the Law Society of Ontario`},
  'realtor-followup':{s:'Following Up — HKS Law Partnership',b:`Hi [NAME],

Appreciate you taking the time to speak with me [last week/at the event]. I wanted to follow up and keep our conversation going.

[PERSONALIZED REFERENCE TO YOUR CONVERSATION]

I would love to send you our one-page firm overview — it covers response times, fee structures, and how we handle same-day requests. Would that be useful?

[LAWYER NAME]
HKS Law · hkslaw.ca`},
  'mortgage-intro':{s:'Partnership Opportunity — Real Estate Closings | HKS Law',b:`Hi [NAME],

I am [LAWYER] at HKS Law in Kitchener-Waterloo. I specialize in residential and commercial real estate closings and wanted to reach out directly.

When your clients need a real estate lawyer, how that lawyer performs reflects on you. I built my practice around:

✓ Fast turnaround — title search + review within 48 hours
✓ Clear fixed fees — clients know the number before they sign
✓ Digital-first — no forced office visits
✓ Direct communication with your office throughout

I work with a small number of trusted mortgage brokers. I would value a short conversation if you are open to it.

[LAWYER NAME]
HKS Law · hkslaw.ca`},
  'lead-d1':{s:'Re: Your Inquiry to HKS Law',b:`Hi [NAME],

Thank you for reaching out to HKS Law. I want to make sure your matter gets the right attention.

I would like to set up a brief consultation — usually 20 to 30 minutes — to hear your situation and give you an honest assessment of how we can help.

You can book directly here: [BOOKING LINK]
Or call us: [PHONE]

We are typically available [DAYS/HOURS].

[STAFF NAME]
HKS Law | [PHONE] | hkslaw.ca

Note: This message is from HKS Law administrative staff. Legal advice is provided by [LAWYER NAME], licensed by the Law Society of Ontario.`},
  'lead-d3':{s:'Following Up — HKS Law',b:`Hi [NAME],

I am following up on your recent inquiry to HKS Law. I want to make sure this did not fall through the cracks.

If your situation is time-sensitive, please call us directly at [PHONE] — we pick up.

If the timing is not right or your needs have changed, that is completely fine. Just let us know.

[STAFF NAME] | HKS Law | [PHONE]`},
  'lead-d7':{s:'One Last Follow-Up — HKS Law',b:`Hi [NAME],

This is my final follow-up on your inquiry from last week.

If you have found assistance elsewhere, I am glad — that is what matters most.

If you would like to connect in the future, HKS Law is always here. We would love the chance to help.

Wishing you all the best.

[STAFF NAME] | HKS Law | hkslaw.ca`},
  'retainer-signed':{s:'Welcome to HKS Law — Next Steps',b:`Dear [CLIENT NAME],

We are glad to have you as a client of HKS Law. This email confirms that your file is now open and [LAWYER NAME] is working on your matter.

Reference number: [FILE #]
Matter: [MATTER TYPE]

Here is what happens next:
1. We will contact you within [X] business days with [specific next step]
2. You can reach our office at [PHONE] during business hours
3. For document requests, please respond to emails from [STAFF NAME]

[LAWYER NAME] is your lawyer and will be involved at every key decision point.

If you have any questions, please do not hesitate to reach out.

[LAWYER NAME]
HKS Law | Licensed by the Law Society of Ontario | LAWPRO insured`},
  're-file-open':{s:'HKS Law — Your Real Estate File is Open | [ADDRESS]',b:`Dear [CLIENT NAME],

Thank you for retaining HKS Law. This confirms we are acting for you in connection with:

Property: [ADDRESS]
Transaction: [PURCHASE / SALE / REFINANCE]
Closing Date: [DATE]

To proceed efficiently, please provide the following:
[DOCUMENT LIST]

We will be in touch as the closing date approaches with signing instructions and a detailed statement of adjustments.

[LAWYER NAME]
HKS Law | [PHONE] | hkslaw.ca
LAWPRO insured · LSO registered`},
  'review-request':{s:'A quick favour — HKS Law',b:`Hi [NAME],

It was a genuine pleasure working with you on [MATTER TYPE]. I hope everything went smoothly from your end.

If you have 2 minutes, a Google review would mean a lot to our small firm — it helps other people in similar situations find us.

[GOOGLE REVIEW LINK]

No obligation at all — I just wanted to ask.

Thank you again for trusting us with your matter.

[LAWYER NAME]
HKS Law · hkslaw.ca

(Note: Reviews must be genuine — LSO guidelines prohibit incentivized reviews.)`},
  'staff-weekly':{s:'HKS Law — Weekly Priorities [WEEK OF DATE]',b:`Hi [STAFF NAME],

Here are the priorities for this week. Please review and flag anything before starting.

THIS WEEK:
[TASK LIST — delete and replace with current weekly priorities]

ALWAYS ON:
• Monitor intake email/voicemail — respond within 2 hours
• Update client files in tracking system daily
• Send follow-ups per Day 1/3/7 sequence for all open leads
• Confirm all appointments day before

COMPLIANCE REMINDER:
All client communication is administrative only. Legal questions go to [LAWYER NAME] immediately.

[LAWYER NAME]
HKS Law`},
  'staff-sop':{s:'[ACTION REQUIRED] Staff Briefing & Delegation — HKS Law',b:`Hi [STAFF NAME],

Please review the following delegated responsibilities and procedures.

DELEGATED TASKS:
[LIST TASKS HERE]

STANDARD PROCEDURES:
• Intake calls: Answer professionally, collect name/contact/matter type/urgency, log immediately, book consultation, confirm by email
• Never provide legal advice — escalate all legal questions to [LAWYER NAME]
• Trust account matters — lawyer only, always
• Document requests: use approved templates only

COMPLIANCE:
You are supervised by [LAWYER NAME] under LSO Rule 5.1. Your conduct reflects on the firm licence. When in doubt, escalate.

Please confirm receipt by reply.

[LAWYER NAME]
HKS Law · Licensed by the Law Society of Ontario`},
};

function openCompose(){nav('compose');}
function setComposeTemplate(t){document.getElementById('email-template').value=t;loadTemplate();nav('compose');}
function loadTemplate(){
  const k=document.getElementById('email-template').value;
  const name=document.getElementById('c-name').value;
  if(!k||!TEMPLATES[k]) return;
  const t=TEMPLATES[k];
  document.getElementById('c-subject').value=t.s.replace('[NAME]',name||'[NAME]');
  document.getElementById('c-body').value=t.b.replace(/\[NAME\]/g,name||'[NAME]');
  const legal=['realtor-intro','mortgage-intro','realtor-followup'].includes(k);
  const cc=document.getElementById('c-compliance');
  if(legal){cc.style.display='block';cc.innerHTML='⚠️ <strong>LSO Note:</strong> No fee splitting or payment can be offered to referral sources. Referral arrangements must be disclosed to clients. Review before sending.';}
  else cc.style.display='none';
}

async function generateEmail(){
  const tmpl=document.getElementById('email-template').value;
  const name=document.getElementById('c-name').value||'[NAME]';
  const ctx=document.getElementById('c-context').value;
  if(!tmpl&&!ctx){toast('Select a template or add context');return;}
  const bodyEl=document.getElementById('c-body');
  bodyEl.value='⏳ Generating…';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:800,messages:[{role:'user',content:`You are the email writer for HKS Law, a small Ontario law firm in Kitchener-Waterloo (Real Estate, Immigration, L&T, Insurance).

Write a professional email:
Template: ${tmpl||'custom'}
Recipient: ${name}
Context: ${ctx||'standard outreach'}

Rules: Professional but warm tone. No legal advice. LSO compliant (no fee splitting promises, no outcome guarantees). Under 300 words for outreach, 400 for client service. Include [LAWYER NAME], HKS Law, hkslaw.ca in signature. Write email body only, starting with the greeting.`}]})});
    const d=await r.json();
    bodyEl.value=d.content?.find(b=>b.type==='text')?.text||'';
    if(!document.getElementById('c-subject').value) loadTemplate();
    log('AI drafted email: '+tmpl+' for '+name,'✍️');
    toast('Email drafted! Review before sending.');
  }catch(e){loadTemplate();toast('Using template — connect internet for AI generation');}
}

function saveDraft(){
  const subj=document.getElementById('c-subject').value;
  const body=document.getElementById('c-body').value;
  if(!body||body==='⏳ Generating…'){toast('Generate or write an email first');return;}
  const draft={id:Date.now(),subject:subj,to:document.getElementById('c-email').value,body,created:new Date().toLocaleString()};
  S.drafts.push(draft);
  saveLocal();syncToFirebase();
  log('Draft saved: "'+subj+'"','💾');
  toast('Draft saved + synced to Firebase!');
  renderDraftsList();
}
function renderDraftsList(){
  const el=document.getElementById('saved-drafts-list');
  if(!el) return;
  el.innerHTML=S.drafts.length?S.drafts.slice().reverse().map(d=>`<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);"><div style="font-size:12.5px;color:var(--text);">${d.subject||'(no subject)'}</div><div class="muted">To: ${d.to||'—'} · ${d.created}</div></div>`).join(''):'<div class="muted">No drafts yet.</div>';
}
function copyEmail(){navigator.clipboard.writeText(document.getElementById('c-body').value).then(()=>toast('Copied!'));}
function clearCompose(){['c-subject','c-body','c-name','c-email','c-context'].forEach(id=>document.getElementById(id).value='');document.getElementById('email-template').value='';document.getElementById('c-compliance').style.display='none';}

// ════════════════════════════════════════════════════════════
//  GMAIL
// ════════════════════════════════════════════════════════════
var GMAIL_CLIENT_ID = '935891361676-2lu226hf3l4cfmf6cocdd57ck2odbcep.apps.googleusercontent.com';
var gmailAccessToken = null;

function connectGmail(){
  // Load Google Identity Services
  if(typeof google === 'undefined' || !google.accounts){
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = function(){ initGmailOAuth(); };
    document.head.appendChild(script);
  } else {
    initGmailOAuth();
  }
}

function initGmailOAuth(){
  var client = google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose',
    callback: function(response){
      if(response.error){ toast('Gmail connection failed: '+response.error); return; }
      gmailAccessToken = response.access_token;
      S.gmailConn = true;
      document.getElementById('b-gmail').textContent = '';
      loadGmailInbox();
      toast('Gmail connected successfully!');
      log('Gmail connected via OAuth','📧');
    }
  });
  client.requestAccessToken();
}

async function loadGmailInbox(){
  if(!gmailAccessToken){ connectGmail(); return; }
  try{
    var resp = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread', {
      headers:{ 'Authorization': 'Bearer '+gmailAccessToken }
    });
    var data = await resp.json();
    if(!data.messages){ 
      document.getElementById('gmail-setup').style.display='none';
      document.getElementById('gmail-list').innerHTML='<div style="padding:20px;text-align:center;color:var(--text3);">No unread messages.</div>';
      return;
    }
    document.getElementById('gmail-setup').style.display='none';
    document.getElementById('b-gmail').textContent = data.messages.length;
    document.getElementById('count-lead').textContent = data.messages.length+' emails';
    // Load first 5 message details
    var messages = data.messages.slice(0,5);
    var details = await Promise.all(messages.map(m => 
      fetch('https://www.googleapis.com/gmail/v1/users/me/messages/'+m.id+'?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date',{
        headers:{'Authorization':'Bearer '+gmailAccessToken}
      }).then(r=>r.json())
    ));
        var listHTML = '';
    details.forEach(function(msg){
      var headers = msg.payload.headers;
      var fromHeader = headers.find(function(h){return h.name==='From';});
      var subjectHeader = headers.find(function(h){return h.name==='Subject';});
      var from = fromHeader ? fromHeader.value : 'Unknown';
      var subject = subjectHeader ? subjectHeader.value : '(no subject)';
      var fromName = from.replace(/<[^>]+>/,'').trim() || from;
      var isUnread = msg.labelIds && msg.labelIds.includes('UNREAD');
      var safeId = msg.id;
      var safeSubject = subject.substring(0,40).replace(/['"]/g,'');
      var safeSender = fromName.substring(0,30).replace(/['"]/g,'');
      var unreadClass = isUnread ? 'unread' : '';
      var unreadTag = isUnread ? 'unread' : 'read';
      listHTML += '<div class="gmail-item '+unreadClass+'" onclick="draftReply(this)" data-id="'+safeId+'" data-subject="'+safeSubject+'" data-sender="'+safeSender+'">';
      listHTML += '<div class="gmail-sender">'+safeSender+'</div>';
      listHTML += '<div class="gmail-subject">'+subject.substring(0,60)+'</div>';
      listHTML += '<div class="gmail-preview">Click to draft a reply with AI</div>';
      listHTML += '<div style="margin-top:8px;"><span class="tag tag-auto">'+unreadTag+'</span></div>';
      listHTML += '</div>';
    });
    document.getElementById('gmail-list').innerHTML = listHTML;;
  }catch(e){
    toast('Error loading Gmail: '+e.message);
  }
}

function draftReply(el){
  var subject = el.getAttribute('data-subject') || '';
  var sender = el.getAttribute('data-sender') || '';
  document.getElementById('c-name').value = sender;
  document.getElementById('c-context').value = 'Replying to email from '+sender;
  document.getElementById('email-template').value = 'lead-d1';
  loadTemplate();
  nav('compose');
  toast('Drafting reply with AI');
}

async function saveToGmailDrafts(subject, body, toEmail){
  if(!gmailAccessToken){ toast('Connect Gmail first'); return false; }
  try{
    var nl = '\r\n'; var email = 'To: '+toEmail+nl+'Subject: '+subject+nl+'Content-Type: text/plain; charset=utf-8'+nl+nl+body;
    var encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    var resp = await fetch('https://www.googleapis.com/gmail/v1/users/me/drafts',{
      method:'POST',
      headers:{'Authorization':'Bearer '+gmailAccessToken,'Content-Type':'application/json'},
      body: JSON.stringify({message:{raw:encoded}})
    });
    if(resp.ok){ toast('Draft saved to Gmail!'); return true; }
    else{ toast('Could not save to Gmail drafts'); return false; }
  }catch(e){ toast('Gmail error: '+e.message); return false; }
}
function simGmail(){
  closeModal();
  document.getElementById('gmail-setup').style.display='none';
  document.getElementById('b-gmail').textContent='4';
  document.getElementById('gmail-list').innerHTML=[
    {s:'RE/MAX — Sarah Chen',sub:'Referral — client needs RE lawyer ASAP',pre:'Hi, I have a buyer closing April 28…',t:'9:42am',tag:'referral',u:true},
    {s:'Ahmed Malik',sub:'Immigration inquiry — work permit',pre:'My permit expires in 60 days and I need…',t:'8:15am',tag:'lead',u:true},
    {s:'Lisa Park',sub:'Landlord question — N4 notice',pre:'My tenant is 2 months behind and I served…',t:'Yesterday',tag:'urgent',u:true},
    {s:'Maria Santos',sub:'Thank you — smooth closing!',pre:'Just wanted to say thank you for everything…',t:'2 days ago',tag:'client',u:false},
  ].map(e=>`<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .13s;" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''" onclick="readEmail('${e.sub}','${e.s}','${e.tag}')">
    <div class="flex fb fc"><div style="font-size:12.5px;${e.u?'font-weight:600;color:var(--text);':'color:var(--text2);'}">${e.s}</div><div class="muted">${e.t}</div></div>
    <div style="font-size:12.5px;color:var(--text);">${e.sub}</div>
    <div class="muted">${e.pre}</div>
    <div class="mt8"><span class="tag ${e.tag==='urgent'?'tag-lawyer':e.tag==='referral'?'tag-ai':e.tag==='lead'?'tag-staff':'tag-auto'}">${e.tag}</span></div>
  </div>`).join('');
  document.getElementById('email-cats').innerHTML=['New Lead: 1 email','Urgent/Legal: 1 email','Referral Partner: 1 email','Follow-up: 0 emails'].map(c=>`<div style="font-size:12px;color:var(--text2);padding:7px 0;border-bottom:1px solid var(--border);">📌 ${c}</div>`).join('');
  log('Gmail demo connected','📧');toast('Gmail demo active — click any email to draft a reply');
}
function readEmail(sub,sender,tag){
  document.getElementById('c-name').value=sender;
  document.getElementById('email-template').value=tag==='lead'||tag==='urgent'?'lead-d1':'realtor-intro';
  document.getElementById('c-context').value='Replying to: "'+sub+'" from '+sender;
  loadTemplate();nav('compose');toast('Drafting reply to "'+sub+'" →');
}

// ════════════════════════════════════════════════════════════
//  AI OPS
// ════════════════════════════════════════════════════════════
const QUICK_PROMPTS=[
  ['Realtor script','Write a realtor outreach script for HKS Law in Kitchener-Waterloo 2026'],
  ['Intake script','Write a complete staff phone intake script for HKS Law — qualify, book, log without lawyer'],
  ['RE closing SOP','Build a full real estate closing SOP checklist for HKS Law Ontario 2026 compliant'],
  ['7-day follow-up','Write a 7-day lead follow-up sequence for HKS Law — Day 1, 3, 7 messages'],
  ['LAWPRO risks','What are the top LAWPRO risk management priorities for a small Ontario RE/immigration firm in 2026?'],
  ['Immigration intake','Build the immigration file intake and processing checklist for HKS Law Ontario 2026'],
  ['L&T LTB checklist','Build the L&T Board hearing preparation checklist for HKS Law Ontario 2026'],
  ['LSO delegation rules','What tasks at HKS Law must only be done by the lawyer under LSO Rules of Professional Conduct 2026?'],
  ['Revenue bottleneck','What is the single biggest revenue bottleneck for a small Ontario law firm and how to fix it?'],
  ['Pricing for realtors','How should HKS Law price and position real estate closing services to win realtor referrals in KW?'],
  ['Wills add-on','How do I add wills and powers of attorney to HKS Law as an easy upsell with zero new marketing?'],
  ['KW market strategy','What is the growth strategy for a law firm in Kitchener-Waterloo in 2026 given the local market?'],
];

function renderAIPrompts(){
  document.getElementById('quick-prompts').innerHTML=QUICK_PROMPTS.map(([l,p])=>`<button class="chip" onclick="aiPromptCustom('${p}')">${l}</button>`).join('');
}

function aiPromptCustom(p){document.getElementById('ai-input').value=p;nav('aiops');askAI();}

async function askAI(){
  const input=document.getElementById('ai-input').value.trim();
  if(!input){toast('Enter a question');return;}
  const el=document.getElementById('ai-output');
  el.innerHTML=`<div style="padding:16px;color:var(--text3);"><div class="dots"><span></span><span></span><span></span></div> Thinking…</div>`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:`You are the AI Operating Partner for HKS Law, a small Ontario law firm in Kitchener-Waterloo serving: Real Estate, Immigration, Landlord & Tenant, and Insurance Claims.

Priority order: Revenue impact → Speed → Delegation → Client experience → Compliance → Scalability.

Tag all tasks: [LAWYER ONLY], [STAFF], [AUTOMATABLE], [AI ASSISTED].

All advice must comply with Ontario 2026: LSO Rules of Professional Conduct, LAWPRO risk management, LTB Tribunals Ontario digital-only filing, FINTRAC By-Law 7.1, IRCC 2025/2026 processing changes.

Be direct, commercial, specific. Give scripts, checklists, and step-by-step workflows. No generic advice.

Question: ${input}`}]})});
    const d=await r.json();
    el.innerHTML=`<div class="ai-response">${d.content?.find(b=>b.type==='text')?.text||'No response'}</div>`;
    log('AI consulted: '+input.substring(0,50),'🤖');toast('AI response ready');
  }catch(e){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:24px;margin-bottom:8px;">🔌</div><div>Connect to internet to use AI</div><div style="font-size:12px;margin-top:6px;">All SOPs, templates, and checklists work offline</div></div>`;}
}

function aiDraftContent(topic){
  document.getElementById('ai-input').value=`Write a professional LinkedIn/Google Business post for HKS Law about: "${topic}". The post should be educational (not promotional), position HKS Law as the local expert in KW, be under 200 words, include a subtle call to action, and comply with LSO advertising rules (no superlatives, no outcome promises).`;
  nav('aiops');askAI();
}

// ════════════════════════════════════════════════════════════
//  BACKUP PAGE
// ════════════════════════════════════════════════════════════
function renderBackup(){
  document.getElementById('sync-log').innerHTML=S.syncLog.length?S.syncLog.map(l=>`<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">${l.time} — ${l.msg}</div>`).join(''):'<div class="muted">No syncs yet.</div>';
}

// ════════════════════════════════════════════════════════════
//  SEARCH
// ════════════════════════════════════════════════════════════
function gsearch(e){
  if(e.key!=='Enter') return;
  const q=document.getElementById('global-search').value.trim();
  if(!q) return;
  document.getElementById('ai-input').value=q;
  nav('aiops');askAI();
  document.getElementById('global-search').value='';
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
function init(){
  loadLocal();
  mergeTaskDone();
  renderDash();
  renderAIPrompts();
  setFbStatus(false);
  log('HKS Law OS v2 started','⚡');
  document.getElementById('b-phases').textContent=
    PHASES.flatMap(p=>p.tasks).filter(t=>!t.done&&t.due<new Date().toISOString().split('T')[0]).length;
  // Auto-sync every 5 min if Firebase connected
  setInterval(()=>{if(S.fbReady){saveLocal();syncToFirebase();}},300000);
}
document.addEventListener('DOMContentLoaded',init);
