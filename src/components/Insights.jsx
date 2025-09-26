
import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, DollarSign, AlertTriangle, Lightbulb, BarChart3, CheckCircle, XCircle, FileText } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#64748b'];

export default function Insights() {
  const [bids, setBids] = useState([]);
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
      
      if (bidsData.length > 0) {
        generateInsights(bidsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async (bidsData) => {
    setIsGenerating(true);
    
    try {
      const bidStats = {
        totalBids: bidsData.length,
        acceptedCount: bidsData.filter(b => b.status === 'accepted').length,
        rejectedCount: bidsData.filter(b => b.status === 'rejected').length,
        averageBidValue: bidsData.length > 0 ? bidsData.reduce((sum, b) => sum + b.total_bid_amount, 0) / bidsData.length : 0,
        averageMargin: bidsData.length > 0 ? bidsData.reduce((sum, b) => sum + b.profit_margin_percentage, 0) / bidsData.length : 0,
        winRate: bidsData.length > 0 ? (bidsData.filter(b => b.status === 'accepted').length / bidsData.length) * 100 : 0,
      };

      const result = await InvokeLLM({
        prompt: `Analyze this company's job bidding performance and provide strategic insights:

Bidding Overview:
- Total Bids Submitted: ${bidStats.totalBids}
- Win Rate: ${bidStats.winRate.toFixed(1)}%
- Accepted Bids: ${bidStats.acceptedCount}
- Rejected Bids: ${bidStats.rejectedCount}
- Average Bid Value: $${bidStats.averageBidValue.toFixed(2)}
- Average Profit Margin on Bids: ${bidStats.averageMargin.toFixed(1)}%

Provide comprehensive business insights for this service company based on their bidding data. Include:
1. Overall performance assessment and a score out of 100.
2. Specific opportunities to improve win rate and profitability.
3. Bidding strategy recommendations (e.g., pricing adjustments, proposal improvements).
4. Risk assessment based on bidding patterns (e.g., margins too low, bidding on wrong projects).
5. Actionable priorities, ranked by impact and effort.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number", minimum: 0, maximum: 100 },
            performance_assessment: { type: "string" },
            optimization_opportunities: {
              type: "array",
              items: { type: "string" }
            },
            bidding_strategy_recommendations: {
              type: "array", 
              items: { type: "string" }
            },
            risk_factors: {
              type: "array",
              items: { type: "string" }
            },
            action_priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  impact: { type: "string", enum: ["high", "medium", "low"] },
                  effort: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
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

  const getStatusData = () => {
    const statusCounts = bids.reduce((acc, bid) => {
        acc[bid.status] = (acc[bid.status] || 0) + 1;
        return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  };

  const getMarginData = () => {
    return bids.filter(b => b.status === 'accepted').map(bid => {
      return {
        name: bid.project_title.length > 15 ? bid.project_title.substring(0, 15) + '...' : bid.project_title,
        fullName: bid.project_title, // Add full name for tooltip
        margin: bid.profit_margin_percentage,
        value: bid.total_bid_amount
      };
    }).sort((a, b) => b.value - a.value).slice(0, 10);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-card rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No data available</h3>
          <p className="text-muted-foreground mb-6">
            Create some job bids first to see AI-powered insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Bidding Insights</h1>
          <p className="text-muted-foreground">
            AI-powered analysis and recommendations for your bidding strategy
          </p>
        </div>
        <Button
          onClick={() => generateInsights(bids)}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Bids by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    className="fill-foreground"
                  >
                    {getStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        color: 'hsl(var(--foreground))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Profit Margin on Accepted Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMarginData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: 'Margin %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Profit Margin']}
                    labelFormatter={(label, payload) => `Project: ${payload[0]?.payload.fullName || label}`}
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="space-y-6">
          {/* Overall Performance */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                AI Bidding Performance Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">
                    {insights.overall_score}/100
                  </div>
                  <div className="text-sm text-slate-300">Bidding Score</div>
                </div>
                <div className="flex-1">
                  <p className="text-slate-200 break-words leading-relaxed">{insights.performance_assessment}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights Grid */}
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {insights.optimization_opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-secondary rounded-lg">
                      <Lightbulb className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <DollarSign className="w-5 h-5 text-sky-400" />
                  Bidding Strategy Advice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {insights.bidding_strategy_recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-secondary rounded-lg">
                      <div className="w-2 h-2 bg-sky-400 rounded-full mt-3 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {insights.risk_factors.map((risk, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-secondary rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">{risk}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {insights.action_priorities && insights.action_priorities.length > 0 && (
            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Recommended Action Priorities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.action_priorities.map((action, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-secondary rounded-lg gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground break-words leading-relaxed">{action.action}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge 
                          className={action.impact === 'high' ? 'bg-emerald-900/50 text-emerald-300' : action.impact === 'medium' ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-700 text-slate-200'}
                        >
                          {action.impact} impact
                        </Badge>
                        <Badge variant="outline" className="border-border">
                          {action.effort} effort
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
