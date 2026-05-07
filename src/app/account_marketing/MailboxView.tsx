"use client";
import React from "react";
import toast from "react-hot-toast";

const MailboxView = ({ recipient = "", subject = "" }: { recipient?: string, subject?: string }) => {
  const [recipientEmail, setRecipientEmail] = React.useState(recipient);
  const [subjectText, setSubjectText] = React.useState(subject);

  React.useEffect(() => {
    setRecipientEmail(recipient);
    setSubjectText(subject);
  }, [recipient, subject]);

  return (
    <div className="pb-12 max-w-[800px] mx-auto">
      <h1 className="text-3xl font-bold text-[#0E3B43] mb-1">Mailbox</h1>
      <p className="text-sm text-gray-500 mb-8">Send messages and requests to your store users.</p>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Recipient</label>
          <input 
            type="text" 
            placeholder="store-user@example.com" 
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
          <input 
            type="text" 
            placeholder="Requesting Campaign Status" 
            value={subjectText}
            onChange={(e) => setSubjectText(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
          <textarea rows={6} placeholder="Type your message here..." className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 resize-none"></textarea>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={() => toast.success("Email sent successfully!")} className="px-10 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-all shadow-md shadow-[#FF5722]/20">
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default MailboxView;
