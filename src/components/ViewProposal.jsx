import React from "react";
import PublicProposalView from "../components/proposals/PublicProposalView";

export default function ViewProposal() {
  const urlParams = new URLSearchParams(window.location.search);
  const bidId = urlParams.get('id');
  
  if (!bidId) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h2>
          <p className="text-slate-600">This proposal link is missing required information. Please contact the contractor for a new link.</p>
        </div>
      </div>
    );
  }

  return <PublicProposalView bidId={bidId} />;
}