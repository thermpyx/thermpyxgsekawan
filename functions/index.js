'use strict';
const {getApps,initializeApp}=require('firebase-admin/app');
const {onValueCreated}=require('firebase-functions/v2/database');
const {defineSecret,defineString}=require('firebase-functions/params');
const nodemailer=require('nodemailer');
const {deliverFeedback}=require('./notifications');
if(!getApps().length)initializeApp();
const gmailUser=defineSecret('FEEDBACK_GMAIL_USER');
const gmailPassword=defineSecret('FEEDBACK_GMAIL_APP_PASSWORD');
const recipient=defineString('FEEDBACK_EMAIL_TO',{default:'thermpyx@gmail.com',description:'Fixed administrator inbox for feedback notifications.'});
exports.notifyFeedbackEmail=onValueCreated({
  ref:'/feedback/{senderUid}/{feedbackId}',instance:'thermpyx-default-rtdb',region:'asia-southeast1',
  secrets:[gmailUser,gmailPassword],retry:false,maxInstances:1,concurrency:1,timeoutSeconds:60,memory:'256MiB'
},async event=>{
  const {senderUid,feedbackId}=event.params;
  // This separate, private path is Admin-only under the existing default Rules.
  // Do not modify the visitor's create-only feedback record.
  const ledger=event.data.ref.root.child('_feedbackEmail/'+senderUid+'/'+feedbackId);
  const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,
    auth:{user:gmailUser.value().trim(),pass:gmailPassword.value().replace(/\s+/g,'')},
    connectionTimeout:15000,greetingTimeout:15000,socketTimeout:25000});
  await deliverFeedback({row:event.data.val(),senderUid,feedbackId,eventId:event.id},{
    settings:{sender:gmailUser.value().trim(),recipient:recipient.value().trim()},
    claim:async initial=>(await ledger.transaction(current=>current===null?initial:undefined,undefined,false)).committed,
    record:patch=>ledger.update(patch),sendMail:mail=>transport.sendMail(mail)
  });
});
