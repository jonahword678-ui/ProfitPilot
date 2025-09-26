import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { ProposalResponse } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileX, MessageSquare, Printer, Loader2 } from "lucide-react";

export default function PublicProposalView({ bidId }) {
  const [bid, setBid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [response, setResponse] = useState(null); // Will hold 'accepted', 'rejected', etc.
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeRequestText, setChangeRequestText] = useState("");
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    const loadProposal = async () => {
      if (!bidId) {
        setError("This proposal link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        // Step 1: Fetch the main proposal data. This must succeed.
        const bidData = await JobBid.get(bidId);
        if (!bidData || !bidData.proposal_html) {
          throw new Error("The proposal content could not be found.");
        }
        setBid(bidData);

        // Step 2: Check if a response has already been submitted.
        const existingResponses = await ProposalResponse.filter({ bid_id: bidId });
        if (existingResponses.length > 0) {
          setResponse(existingResponses[0]);
        }

      } catch (err) {
        console.error("Failed to load proposal:", err);
        setError("This proposal could not be loaded. It may have been removed or the link may be incorrect.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProposal();
  }, [bidId]);
  
  const submitResponse = async (responseType, notes = null, email = null) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // **PRIMARY ACTION: Create the guaranteed response record**
      const newResponse = {
        bid_id: bid.id,
        response_type: responseType,
        notes: notes,
        client_email: email
      };
      const createdResponse = await ProposalResponse.create(newResponse);
      setResponse(createdResponse);

      // **SECONDARY ACTION: Send a courtesy email notification**
      let subject = '';
      let body = '';

      if (responseType === 'accepted') {
        subject = `✅ Proposal Accepted: "${bid.project_title}"`;
        body = `Good news!\n\n${bid.client_name} has accepted your proposal for "${bid.project_title}".\n\nA permanent acceptance record has been created in your ProfitPilot account. You can log in to create an invoice.\n\nClient Contact: ${email}`;
      } else if (responseType === 'rejected') {
        subject = `❌ Proposal Not Accepted: "${bid.project_title}"`;
        body = `This is an automated notification that ${bid.client_name} has decided not to move forward with the proposal for "${bid.project_title}" at this time.`;
      } else if (responseType === 'changes_requested') {
        subject = `📝 Change Request for "${bid.project_title}"`;
        body = `${bid.client_name} has requested changes for the proposal "${bid.project_title}".\n\nTheir notes: "${notes}"`;
      }

      await SendEmail({
        to: bid.created_by,
        from_name: `${bid.client_name} (via ProfitPilot)`,
        subject: subject,
        body: `${body}\n\nRegards,\nThe ProfitPilot Team`
      });

      alert("Thank you! Your response has been recorded and the contractor has been notified.");

    } catch (err) {
      console.error("Error submitting response:", err);
      alert(`There was an error submitting your response. Please contact the contractor directly.`);
    } finally {
      setIsSubmitting(false);
      setShowAcceptForm(false);
      setShowChangeRequest(false);
    }
  };

  const handleAcceptSubmit = () => {
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      alert("Please enter a valid email address.");
      return;
    }
    submitResponse('accepted', null, clientEmail);
  };

  const handleReject = () => {
    if (window.confirm("Are you sure you want to reject this proposal? This action cannot be undone.")) {
      submitResponse('rejected');
    }
  };

  const handleRequestChanges = () => {
    if (!changeRequestText.trim()) {
      alert("Please describe the changes you would like to request.");
      return;
    }
    submitResponse('changes_requested', changeRequestText);
  };
  
  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <p className="ml-4 text-slate-600">Loading Proposal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <FileX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Error</h2>
          <p className="text-slate-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (response) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-10 rounded-lg shadow-md">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Thank You!</h2>
          <p className="text-slate-600 mt-2">Your response has been recorded. The contractor has been notified.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Action Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm shadow-sm p-4 border-b">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print / Save PDF</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAcceptForm(true)}><CheckCircle2 className="w-4 h-4 mr-2" />Accept Proposal</Button>
            <Button variant="outline" onClick={() => setShowChangeRequest(true)}><MessageSquare className="w-4 h-4 mr-2" />Request Changes</Button>
            <Button variant="destructive" onClick={handleReject}><FileX className="w-4 h-4 mr-2" />Reject</Button>
        </div>
        
        {/* Forms inside the action bar */}
        {showAcceptForm && (
            <div className="max-w-lg mx-auto mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h4 className="font-bold text-emerald-800 mb-2">Confirm Acceptance</h4>
                <p className="text-sm text-emerald-700 mb-3">Please provide your email so the contractor can follow up.</p>
                <input type="email" placeholder="your-email@example.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full p-2 border rounded" />
                <div className="flex gap-2 mt-3">
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAcceptSubmit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Confirm'}</Button>
                    <Button variant="ghost" onClick={() => setShowAcceptForm(false)}>Cancel</Button>
                </div>
            </div>
        )}
        {showChangeRequest && (
            <div className="max-w-lg mx-auto mt-4 p-4 bg-slate-50 border rounded-lg">
                <h4 className="font-bold text-slate-800 mb-2">Request Changes</h4>
                <Textarea placeholder="Please describe the changes you need..." value={changeRequestText} onChange={e => setChangeRequestText(e.target.value)} />
                <div className="flex gap-2 mt-3">
                    <Button onClick={handleRequestChanges} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Send Request'}</Button>
                    <Button variant="ghost" onClick={() => setShowChangeRequest(false)}>Cancel</Button>
                </div>
            </div>
        )}
      </div>
      
      {/* Proposal Content */}
      <div className="max-w-4xl mx-auto my-8 p-4 md:p-8 bg-white shadow-lg rounded-lg">
        <div dangerouslySetInnerHTML={{ __html: bid.proposal_html }} />
      </div>
    </div>
  );
}