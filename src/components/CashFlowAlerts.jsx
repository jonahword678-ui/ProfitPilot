
import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingDown, DollarSign, Target, Sparkles, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";

export default function CashFlowAlerts() {
  const [bids, setBids] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const bidsData = await JobBid.list('-updated_date');
      setBids(bidsData);
      generateAlerts(bidsData);
      if (bidsData.length > 0) {
        generateAIInsights(bidsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAlerts = (bidsData) => {
    const alertsFound = [];
    const recentBids = bidsData.filter(bid => 
      isAfter(new Date(bid.created_date), subDays(new Date(), 30))
    );

    // Check for low profit margins
    const lowMarginBids = recentBids.filter(bid => 
      bid.profit_margin_percentage && bid.profit_margin_percentage < 15
    );
    if (lowMarginBids.length > 0) {
      alertsFound.push({
        type: 'warning',
        title: 'Low Profit Margin Alert',
        description: `${lowMarginBids.length} recent bids have profit margins below 15%`,
        icon: TrendingDown,
        color: 'text-red-400',
        bgColor: 'bg-secondary',
        borderColor: 'border-red-700/50',
        bids: lowMarginBids,
        priority: 'high'
      });
    }

    // Check rejection rate
    const rejectedBids = recentBids.filter(bid => bid.status === 'rejected');
    const rejectionRate = recentBids.length > 0 ? (rejectedBids.length / recentBids.length) * 100 : 0;
    if (rejectionRate > 40) {
      alertsFound.push({
        type: 'error',
        title: 'High Rejection Rate',
        description: `${rejectionRate.toFixed(0)}% of recent bids were rejected. Consider reviewing your pricing strategy.`,
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-secondary',
        borderColor: 'border-red-700/50',
        priority: 'high'
      });
    }

    // Check for pricing inconsistencies
    const acceptedBids = bidsData.filter(bid => bid.status === 'accepted');
    if (acceptedBids.length >= 3) {
      const avgBidAmount = acceptedBids.reduce((sum, bid) => sum + bid.total_bid_amount, 0) / acceptedBids.length;
      const recentLowBids = recentBids.filter(bid => 
        bid.total_bid_amount < (avgBidAmount * 0.7) && bid.status !== 'rejected'
      );
      
      if (recentLowBids.length > 0) {
        alertsFound.push({
          type: 'warning',
          title: 'Potentially Underbidding',
          description: `${recentLowBids.length} recent bids are significantly below your average of $${avgBidAmount.toLocaleString()}`,
          icon: AlertTriangle,
          color: 'text-amber-400',
          bgColor: 'bg-secondary',
          borderColor: 'border-amber-700/50',
          bids: recentLowBids,
          priority: 'medium'
        });
      }
    }

    // Check for stagnant bids
    const oldDraftBids = bidsData.filter(bid => 
      bid.status === 'draft' && 
      !isAfter(new Date(bid.created_date), subDays(new Date(), 7))
    );
    if (oldDraftBids.length > 0) {
      alertsFound.push({
        type: 'info',
        title: 'Stagnant Draft Bids',
        description: `${oldDraftBids.length} draft bids haven't been sent in over a week`,
        icon: Clock,
        color: 'text-sky-400',
        bgColor: 'bg-secondary',
        borderColor: 'border-sky-700/50',
        bids: oldDraftBids,
        priority: 'low'
      });
    }

    // Positive alert for good performance
    const highMarginBids = recentBids.filter(bid => 
      bid.profit_margin_percentage && bid.profit_margin_percentage > 30
    );
    if (highMarginBids.length > 0) {
      alertsFound.push({
        type: 'success',
        title: 'Excellent Profit Margins',
        description: `${highMarginBids.length} recent bids achieved profit margins above 30%!`,
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-secondary',
        borderColor: 'border-emerald-700/50',
        bids: highMarginBids,
        priority: 'positive'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2, positive: 3 };
    alertsFound.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setAlerts(alertsFound);
  };

  const generateAIInsights = async (bidsData) => {
    setIsGenerating(true);
    try {
      const recentBids = bidsData.filter(bid => 
        isAfter(new Date(bid.created_date), subDays(new Date(), 30))
      );

      const bidStats = {
        totalBids: bidsData.length,
        recentBids: recentBids.length,
        acceptedCount: bidsData.filter(b => b.status === 'accepted').length,
        rejectedCount: bidsData.filter(b => b.status === 'rejected').length,
        averageMargin: bidsData.reduce((sum, b) => sum + (b.profit_margin_percentage || 0), 0) / bidsData.length,
        averageBidAmount: bidsData.reduce((sum, b) => sum + b.total_bid_amount, 0) / bidsData.length,
        winRate: (bidsData.filter(b => b.status === 'accepted').length / bidsData.length) * 100
      };

      const result = await InvokeLLM({
        prompt: `Analyze this contractor's cash flow and bidding patterns for potential financial risks:

Bidding Statistics:
- Total Bids: ${bidStats.totalBids}
- Recent Bids (30 days): ${bidStats.recentBids}
- Win Rate: ${bidStats.winRate.toFixed(1)}%
- Average Profit Margin: ${bidStats.averageMargin.toFixed(1)}%
- Average Bid Amount: $${bidStats.averageBidAmount.toFixed(2)}
- Accepted Bids: ${bidStats.acceptedCount}
- Rejected Bids: ${bidStats.rejectedCount}

Provide cash flow risk assessment and actionable recommendations to prevent financial problems. Focus on:
1. Risk level assessment (low/medium/high)
2. Specific cash flow concerns
3. Pricing strategy recommendations
4. Market positioning advice
5. Immediate action items`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string", enum: ["low", "medium", "high"] },
            cash_flow_score: { type: "number", minimum: 0, maximum: 100 },
            key_risks: {
              type: "array",
              items: { type: "string" }
            },
            pricing_recommendations: {
              type: "array", 
              items: { type: "string" }
            },
            immediate_actions: {
              type: "array",
              items: { type: "string" }
            },
            market_insights: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cash Flow Alerts</h1>
          <p className="text-slate-600">
            Early warning system to protect your profitability and cash flow
          </p>
        </div>
        <Button
          onClick={() => generateAIInsights(bids)}
          disabled={isGenerating}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Refresh Analysis
        </Button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">High Priority</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.priority === 'high').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Medium Priority</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.priority === 'medium').length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Low Priority</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.priority === 'low').length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Good News</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.priority === 'positive').length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Risk Assessment */}
      {insights && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              AI Cash Flow Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  insights.risk_level === 'low' ? 'text-emerald-400' :
                  insights.risk_level === 'medium' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {insights.cash_flow_score}/100
                </div>
                <div className="text-sm text-slate-300">Cash Flow Score</div>
              </div>
              <div className="flex-1">
                <Badge 
                  className={`mb-2 ${
                    insights.risk_level === 'low' ? 'bg-emerald-500' :
                    insights.risk_level === 'medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  } text-white`}
                >
                  {insights.risk_level.toUpperCase()} RISK
                </Badge>
                <p className="text-slate-200 text-sm">
                  Based on your bidding patterns and profit margins over the last 30 days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="p-16 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">All Clear!</h3>
              <p className="text-muted-foreground">
                No cash flow concerns detected in your recent bidding activity.
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert, index) => (
            <Alert key={index} className={`border ${alert.borderColor} ${alert.bgColor}`}>
              <alert.icon className={`h-4 w-4 ${alert.color}`} />
              <AlertDescription className="ml-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-semibold ${alert.color} mb-1`}>{alert.title}</h4>
                    <p className="text-foreground text-sm">{alert.description}</p>
                    {alert.bids && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Affected bids:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.bids.slice(0, 3).map((bid, bidIndex) => (
                            <Badge key={bidIndex} variant="outline" className="text-xs border-border">
                              {bid.project_title.length > 20 
                                ? bid.project_title.substring(0, 20) + '...' 
                                : bid.project_title
                              }
                            </Badge>
                          ))}
                          {alert.bids.length > 3 && (
                            <Badge variant="outline" className="text-xs border-border">
                              +{alert.bids.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Badge 
                    className={`ml-4 text-white font-medium ${
                      alert.priority === 'high' ? 'bg-red-600 hover:bg-red-700' :
                      alert.priority === 'medium' ? 'bg-orange-600 hover:bg-orange-700' :
                      alert.priority === 'low' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {alert.priority}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))
        )}
      </div>

      {/* AI Recommendations */}
      {insights && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Key Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.key_risks?.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-900/30 rounded-lg border border-red-800/30">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-300">{risk}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Immediate Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.immediate_actions?.map((action, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-emerald-900/30 rounded-lg border border-emerald-800/30">
                    <Target className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-emerald-300">{action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Pricing Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.pricing_recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-900/30 rounded-lg border border-blue-800/30">
                    <DollarSign className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-300">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Market Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.market_insights?.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-purple-900/30 rounded-lg border border-purple-800/30">
                    <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-purple-300">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
