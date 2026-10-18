'use strict';
const {createHash}=require('node:crypto');
const KEY=/^[A-Za-z0-9_-]{1,128}$/;
const EMAIL=/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const categories={suggestion:{en:'Suggestion',id:'Saran'},bug:{en:'Problem report',id:'Laporan masalah'},other:{en:'Other feedback',id:'Masukan lainnya'}};
function buildMail({row,senderUid,feedbackId},settings){
  if(!KEY.test(senderUid||'')||!KEY.test(feedbackId||'')||!row||row.id!==feedbackId||row.sender_id!==senderUid||
    typeof row.message!=='string'||!row.message.trim()||row.message.length>2000||typeof row.name!=='string'||row.name.length>80||
    !Object.hasOwn(categories,row.category)||!['id','en'].includes(row.language)||!Number.isFinite(row.submitted_at)||row.submitted_at<=0||
    typeof row.page!=='string'||row.page.length>600)throw Object.assign(new Error('Invalid feedback record'),{code:'INVALID_FEEDBACK'});
  if(!EMAIL.test(settings.sender||'')||!EMAIL.test(settings.recipient||''))throw Object.assign(new Error('Invalid email configuration'),{code:'INVALID_MAIL_CONFIG'});
  let page='THERMPYX';
  if(row.page!=='THERMPYX'){
    const url=new URL(row.page);
    if(!['http:','https:'].includes(url.protocol))throw Object.assign(new Error('Invalid feedback page'),{code:'INVALID_FEEDBACK'});
    page=url.origin+url.pathname;
  }
  const id=row.language==='id',name=row.name.replace(/[\r\n\u0000-\u001f]/g,' ').trim();
  const labels=id?{heading:'Masukan baru di THERMPYX',category:'Kategori',name:'Nama',unknown:'Tidak diisi',time:'Waktu',page:'Halaman',message:'Pesan',reference:'ID masukan'}:
    {heading:'New feedback on THERMPYX',category:'Category',name:'Name',unknown:'Not provided',time:'Time',page:'Page',message:'Message',reference:'Feedback ID'};
  const digest=createHash('sha256').update(senderUid+'/'+feedbackId).digest('hex');
  return {
    from:{name:'THERMPYX',address:settings.sender},to:settings.recipient,
    subject:'[THERMPYX] '+labels.heading,
    messageId:'<feedback-'+digest+'@thermpyx.firebaseapp.com>',
    text:[labels.heading,'',labels.category+': '+categories[row.category][row.language],labels.name+': '+(name||labels.unknown),
      labels.time+': '+new Date(row.submitted_at).toISOString(),labels.page+': '+page,'',labels.message+':',row.message,'',labels.reference+': '+feedbackId].join('\n')
  };
}
async function deliverFeedback(input,dependencies){
  const mail=buildMail(input,dependencies.settings);
  const claimed=await dependencies.claim({status:'processing',event_id:input.eventId,claimed_at:Date.now()});
  if(!claimed)return {status:'duplicate'};
  let accepted=false;
  try{
    const receipt=await dependencies.sendMail(mail);
    if(!receipt?.accepted?.length||receipt.rejected?.length)throw Object.assign(new Error('SMTP did not accept the recipient'),{code:'SMTP_REJECTED'});
    accepted=true;
    await dependencies.record({status:'smtp-accepted',message_id:mail.messageId,accepted_at:Date.now()});
    return {status:'smtp-accepted'};
  }catch(error){
    // Never save SMTP error text: it may contain authentication/server details.
    const code=/^[A-Z0-9_-]{1,48}$/.test(error?.code||'')?error.code:'MAIL_FAILED';
    try{await dependencies.record({status:accepted?'uncertain':'failed',code,checked_at:Date.now()});}catch(_){/* The existing claim still blocks duplicate sends. */}
    throw Object.assign(new Error('Feedback notification was not confirmed; check the private notification status'),{code});
  }
}
module.exports={buildMail,deliverFeedback};
