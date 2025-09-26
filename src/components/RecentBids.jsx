
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, ArrowRight, Plus } from "lucide-react";

export default function RecentBids({ bids }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-slate-700 text-slate-200';
      case 'sent': return 'bg-sky-900/50 text-sky-300'; // Changed from bg-blue-900/50
      case 'accepted': return 'bg-emerald-900/50 text-emerald-300';
      case 'rejected': return 'bg-red-900/50 text-red-300';
      default: return 'bg-slate-700 text-slate-200';
    }
  };

  return (
    <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-bold text-foreground">Recent Bids</CardTitle>
        <Link to={createPageUrl("Bids")}>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {bids.length > 0 ? (
          <div className="space-y-4">
            {bids.slice(0, 4).map(bid => (
              <div key={bid.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-accent transition-colors"> {/* Changed bg-secondary to bg-secondary/50 */}
                <div className="space-y-1">
                    <p className="font-semibold text-foreground">{bid.project_title}</p>
                    <p className="text-sm text-muted-foreground">{bid.client_name}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-foreground">${(bid.total_bid_amount || 0).toLocaleString()}</p>
                    <Badge className={`mt-1 text-xs ${getStatusColor(bid.status)}`}>
                        {bid.status}
                    </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="text-center space-y-4 py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">No bids yet</h3>
                  <p className="text-sm text-muted-foreground">Create your first job bid to see it here</p>
                </div>
                <Link to={createPageUrl("Bids")}>
                  <Button className="bg-primary text-background"> {/* Changed text-primary-foreground to text-background */}
                    <Plus className="w-4 h-4 mr-2" />
                    Create Bid
                  </Button>
                </Link>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
