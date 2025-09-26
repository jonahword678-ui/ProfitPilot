
import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { ProposalResponse } from "@/api/entities"; // Import the new entity
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send, Eye, Calendar, DollarSign, Trash2, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import BidForm from "../components/bids/BidForm";
import BidPreview from "../components/bids/BidPreview";
import { User } from "@/api/entities";

// Example bid for new users
const EXAMPLE_BID = {
  id: 'example-bid-001',
  client_name: 'Demo Client',
  project_title: 'Sample Kitchen Renovation',
  project_description: 'This is an example bid to show you how the system works. Create your first real bid to get started!',
  materials_total: 2500,
  labor_total: 1800,
  equipment_total: 400,
  overhead_total: 200,
  custom_expenses_total: 300,
  markup_amount: 920,
  total_bid_amount: 5520,
  markup_percentage: 20,
  status: 'draft',
  created_date: new Date().toISOString(),
  updated_date: new Date().toISOString(),
  isExample: true
};

export default function Bids() {
  const [bids, setBids] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [previewingBid, setPreviewingBid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // New state for sync indicator
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    runLoadAndSync();
  }, []);

  const runLoadAndSync = async (retryCount = 0) => {
    try {
      setError(null);
      setIsLoading(true);
      setIsSyncing(false); // Ensure this is false at the start of a fresh load attempt

      const user = await User.me();
      setCurrentUser(user);

      if (!user || !user.email) {
        setBids([EXAMPLE_BID]);
        setIsLoading(false);
        return;
      }
      
      // 1. Fetch initial data
      let bidsData = await JobBid.filter({ created_by: user.email }, '-updated_date');
      const bidIds = bidsData.map(b => b.id);
      let responsesMap = {};
      if (bidIds.length > 0) {
        const responseData = await ProposalResponse.filter({ bid_id: { $in: bidIds } });
        responsesMap = responseData.reduce((acc, res) => {
            acc[res.bid_id] = res;
            return acc;
        }, {});
      }
      setResponses(responsesMap); // Set responses map for current render

      // 2. Check for statuses that need updating
      const updatesToPerform = [];
      for (const bid of bidsData) {
        const response = responsesMap[bid.id];
        // Only update if a response exists and its type differs from the bid's current status
        if (response && bid.status !== response.response_type) {
          updatesToPerform.push(
            JobBid.update(bid.id, { 
              status: response.response_type, 
              change_request_notes: response.notes || bid.change_request_notes // Preserve existing notes if new notes are null/undefined
            })
          );
        }
      }
      
      // 3. If updates are needed, perform them and re-fetch
      if (updatesToPerform.length > 0) {
        setIsSyncing(true); // Show syncing indicator
        await Promise.all(updatesToPerform);
        // Re-fetch the data to get the absolute latest state
        bidsData = await JobBid.filter({ created_by: user.email }, '-updated_date'); // Re-assign bidsData after updates
      }
      
      // Set bids, falling back to example if no actual bids
      if (bidsData.length === 0) {
        setBids([EXAMPLE_BID]);
      } else {
        setBids(bidsData); // bidsData here are actual, non-example bids from DB
      }

    } catch (error) {
      console.error('Error loading or syncing data:', error);
       if (retryCount < 2) {
        setTimeout(() => runLoadAndSync(retryCount + 1), 1500); // Increased retry delay slightly
        return;
      }
      setError('Failed to load bid data. Please check your connection and try again.');
      setBids([EXAMPLE_BID]); // Fallback to example bid on persistent error
      setResponses({}); // Clear responses
    } finally {
      setIsLoading(false);
      setIsSyncing(false); // Hide syncing indicator
    }
  };

  const handleSave = async (bidData) => {
    setIsProcessing(true);
    try {
      if (editingBid && !editingBid.isExample) {
        await JobBid.update(editingBid.id, bidData);
      } else {
        // Removed manual 'created_by' - the system handles this automatically.
        // This was the primary cause of the email issue.
        await JobBid.create(bidData);
      }
      setShowForm(false);
      setEditingBid(null);
      await runLoadAndSync();
    } catch (error) {
      console.error('Error saving bid:', error);
      alert("Failed to save bid. Please check your internet connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (bid) => {
    if (bid.isExample) {
      setEditingBid({ ...bid, id: undefined, isExample: false });
      setShowForm(true);
      return;
    }
    
    setEditingBid(bid);
    setShowForm(true);
  };

  const handleDelete = async (bidId) => {
    if (window.confirm("Are you sure you want to permanently delete this bid? This action cannot be undone.")) {
      try {
        await JobBid.delete(bidId);
        await runLoadAndSync();
      } catch (error) {
        console.error("Error deleting bid:", error);
        alert("Failed to delete bid. Please check your internet connection and try again.");
      }
    }
  };
  
  const handleCancel = () => {
    setShowForm(false);
    setEditingBid(null);
  };

  const handlePreview = (bid) => {
    setPreviewingBid(bid);
  };

  const handleClosePreview = () => {
    setPreviewingBid(null);
  };

  const handleRetry = () => {
    runLoadAndSync();
  };

  // The getStatus function now reads directly from the bid's own status,
  // because the sync process ensures it's always up to date.
  const getStatus = (bid) => {
    return bid.status;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-slate-700 text-slate-200';
      case 'sent': return 'bg-sky-900/50 text-sky-300';
      case 'accepted': return 'bg-emerald-900/50 text-emerald-300';
      case 'rejected': return 'bg-red-900/50 text-red-300';
      case 'changes_requested': return 'bg-amber-800/50 text-amber-300';
      default: return 'bg-slate-700 text-slate-200';
    }
  };

  const displayedBids = bids.filter(bid => !bid.isExample);
  const hasOnlyExample = bids.length === 1 && bids[0].isExample;

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center py-16">
          <div className="text-red-400 mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleRetry} className="bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="h-10 bg-muted rounded w-full mb-6"></div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-card rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Job Bids</h1>
          <p className="text-muted-foreground">
            Create, manage, and track your project proposals
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
          <Button
            onClick={() => {
              setEditingBid(null);
              setShowForm(true);
            }}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bid
          </Button>
        </div>
      </div>

      {/* Bid Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="my-4"
           >
            <BidForm
              bid={editingBid}
              onSave={handleSave}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bid Preview */}
      <AnimatePresence>
        {previewingBid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <BidPreview
                bid={previewingBid}
                onClose={handleClosePreview}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bids List */}
      <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>All Bids</CardTitle>
        </CardHeader>
        <CardContent>
          {(displayedBids.length === 0 && !hasOnlyExample) ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No bids created yet</h3>
              <p className="text-muted-foreground mb-6">
                Click "New Bid" to create your first proposal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {(hasOnlyExample ? bids : displayedBids).map((bid) => (
                  <motion.div
                    key={bid.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                  >
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-accent border border-transparent hover:border-primary/20 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-semibold text-foreground">{bid.project_title}</p>
                          <p className="text-sm text-muted-foreground">{bid.client_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-foreground">
                            ${(bid.total_bid_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                          <Badge className={`mt-1 text-xs ${getStatusColor(getStatus(bid))}`}>{getStatus(bid)}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(bid)}>
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(bid)}>
                            <Edit className="w-3 h-3 mr-1" />
                            {bid.isExample ? 'Use Example' : 'Edit'}
                          </Button>
                          {!bid.isExample && (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(bid.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
