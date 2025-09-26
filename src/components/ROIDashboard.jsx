
import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, DollarSign, Calendar, Target, Sparkles, Calculator, Award } from "lucide-react";
import { format, subMonths, isAfter } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ROIDashboard() {
  const [bids, setBids] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [benchmarkData, setBenchmarkData] = useState({
    monthly_subscription: 29, // Default app cost
    time_saved_hours: 10, // Hours saved per month
    hourly_rate: 50, // User's hourly rate
    start_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bidsData, userData] = await Promise.all([
        JobBid.list('-updated_date'),
        User.me().catch(() => null)
      ]);
      setBids(bidsData);
      setUser(userData);
      
      // Set default start date to 3 months ago or user creation date
      const defaultStartDate = userData?.created_date 
        ? new Date(userData.created_date) 
        : subMonths(new Date(), 3);
      
      setBenchmarkData(prev => ({
        ...prev,
        start_date: format(defaultStartDate, 'yyyy-MM-dd')
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBenchmarkChange = (e) => {
    const { name, value } = e.target;
    setBenchmarkData(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const calculateROI = () => {
    if (!benchmarkData.start_date) return null;

    const startDate = new Date(benchmarkData.start_date);
    const monthsSinceStart = Math.max(1, Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24 * 30)));
    
    const bidsAfterStart = bids.filter(bid => 
      isAfter(new Date(bid.created_date), startDate)
    );
    
    const acceptedBids = bidsAfterStart.filter(bid => bid.status === 'accepted');
    
    // Calculate improvements
    const totalRevenue = acceptedBids.reduce((sum, bid) => sum + (bid.total_bid_amount || 0), 0);
    const totalProfit = acceptedBids.reduce((sum, bid) => sum + (bid.total_profit || 0), 0);
    const avgProfitMargin = acceptedBids.length > 0 
      ? acceptedBids.reduce((sum, bid) => sum + (bid.profit_margin_percentage || 0), 0) / acceptedBids.length
      : 0;
    
    // Estimate improvements (conservative estimates)
    const estimatedMarginImprovement = Math.max(0, avgProfitMargin - 15); // Assume 15% was baseline
    const additionalProfitFromMargins = totalRevenue * (estimatedMarginImprovement / 100);
    
    // Time savings value
    const timeSavingsValue = (parseFloat(benchmarkData.time_saved_hours) || 0) * (parseFloat(benchmarkData.hourly_rate) || 0) * monthsSinceStart;
    
    // App costs
    const totalAppCost = (parseFloat(benchmarkData.monthly_subscription) || 0) * monthsSinceStart;
    
    // Calculate ROI
    const totalBenefit = additionalProfitFromMargins + timeSavingsValue;
    const roi = totalAppCost > 0 ? ((totalBenefit - totalAppCost) / totalAppCost) * 100 : 0;
    
    return {
      monthsSinceStart,
      totalBids: bidsAfterStart.length,
      acceptedBids: acceptedBids.length,
      totalRevenue,
      totalProfit,
      avgProfitMargin,
      additionalProfitFromMargins,
      timeSavingsValue,
      totalAppCost,
      totalBenefit,
      roi,
      netGain: totalBenefit - totalAppCost
    };
  };

  const getMonthlyTrend = () => {
    if (!benchmarkData.start_date || bids.length === 0) {
      // Return sample data if no bids exist yet
      return [
        { month: 'Jan 2024', revenue: 0, profit: 0, margin: 0, bids: 0, accepted: 0 },
        { month: 'Feb 2024', revenue: 0, profit: 0, margin: 0, bids: 0, accepted: 0 },
        { month: 'Mar 2024', revenue: 0, profit: 0, margin: 0, bids: 0, accepted: 0 }
      ];
    }
    
    const startDate = new Date(benchmarkData.start_date);
    const months = [];
    const currentDate = new Date();
    
    let date = new Date(startDate);
    while (date <= currentDate) {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthBids = bids.filter(bid => {
        const bidDate = new Date(bid.created_date);
        return bidDate >= monthStart && bidDate <= monthEnd;
      });
      
      const acceptedBids = monthBids.filter(bid => bid.status === 'accepted');
      const monthRevenue = acceptedBids.reduce((sum, bid) => sum + (bid.total_bid_amount || 0), 0);
      const monthProfit = acceptedBids.reduce((sum, bid) => sum + (bid.total_profit || 0), 0);
      const avgMargin = acceptedBids.length > 0 
        ? acceptedBids.reduce((sum, bid) => sum + (bid.profit_margin_percentage || 0), 0) / acceptedBids.length
        : 0;
      
      months.push({
        month: format(date, 'MMM yyyy'),
        revenue: monthRevenue,
        profit: monthProfit,
        margin: Math.round(avgMargin * 10) / 10, // Round to 1 decimal
        bids: monthBids.length,
        accepted: acceptedBids.length
      });
      
      date = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }
    
    // If no months with data, add at least current month with zeros
    if (months.length === 0) {
      months.push({
        month: format(new Date(), 'MMM yyyy'),
        revenue: 0,
        profit: 0,
        margin: 0,
        bids: 0,
        accepted: 0
      });
    }
    
    return months;
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

  const roiData = calculateROI();
  const monthlyTrend = getMonthlyTrend();

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ROI Dashboard</h1>
          <p className="text-muted-foreground">
            Track exactly how much ProfitPilot has improved your business profitability
          </p>
        </div>
        <Badge 
          className={`px-4 py-2 text-lg ${
            roiData && roiData.roi > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {roiData ? `${roiData.roi.toFixed(0)}% ROI` : 'Set Benchmark'}
        </Badge>
      </div>

      {/* Benchmark Setup */}
      <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            ROI Calculation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Monthly Subscription</Label>
              <Input
                name="monthly_subscription"
                type="number"
                value={benchmarkData.monthly_subscription}
                onChange={handleBenchmarkChange}
                onFocus={(e) => e.target.select()}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Hours Saved/Month</Label>
              <Input
                name="time_saved_hours"
                type="number"
                value={benchmarkData.time_saved_hours}
                onChange={handleBenchmarkChange}
                onFocus={(e) => e.target.select()}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Your Hourly Rate</Label>
              <Input
                name="hourly_rate"
                type="number"
                value={benchmarkData.hourly_rate}
                onChange={handleBenchmarkChange}
                onFocus={(e) => e.target.select()}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Started Using App</Label>
              <Input
                name="start_date"
                type="date"
                value={benchmarkData.start_date}
                onChange={handleBenchmarkChange}
                className="bg-background border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {roiData && (
        <>
          {/* ROI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Total ROI</p>
                    <p className="text-3xl font-bold">{roiData.roi.toFixed(0)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Net Gain</p>
                    <p className="text-2xl font-bold">${roiData.netGain.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Avg Profit Margin</p>
                    <p className="text-2xl font-bold">{roiData.avgProfitMargin.toFixed(1)}%</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Months Tracked</p>
                    <p className="text-2xl font-bold">{roiData.monthsSinceStart}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Value Breakdown */}
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                <Award className="w-5 h-5 text-emerald-400" />
                Value Created by ProfitPilot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">
                    ${roiData.additionalProfitFromMargins.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-muted-foreground text-sm">Additional Profit from Better Margins</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated improvement over {roiData.avgProfitMargin.toFixed(1)}% avg margin
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    ${roiData.timeSavingsValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-muted-foreground text-sm">Time Savings Value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {benchmarkData.time_saved_hours}h/month × ${benchmarkData.hourly_rate}/h × {roiData.monthsSinceStart} months
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    ${roiData.totalAppCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-muted-foreground text-sm">Total App Investment</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${benchmarkData.monthly_subscription}/month × {roiData.monthsSinceStart} months
                  </p>
                </div>
              </div>
              
              <div className="border-t border-border mt-6 pt-6 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  ${roiData.totalBenefit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-lg text-foreground">Total Value Created</p>
                <p className="text-sm text-muted-foreground mt-2">
                  For every $1 spent on ProfitPilot, you've gained ${(roiData.totalBenefit / roiData.totalAppCost).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend */}
            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Monthly Revenue Growth</CardTitle>
                <p className="text-sm text-muted-foreground">Track your revenue and profit trends over time</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(value) => value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `$${Number(value).toLocaleString()}`, 
                          name === 'revenue' ? 'Revenue' : 'Profit'
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        name="Revenue"
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        name="Profit"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span className="text-muted-foreground">Monthly Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-muted-foreground">Monthly Profit</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Profit Margin Trend */}
            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Profit Margin Improvement</CardTitle>
                <p className="text-sm text-muted-foreground">Track your profit margin percentage by month</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        domain={[0, 50]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(1)}%`, 'Profit Margin']} 
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar 
                        dataKey="margin" 
                        fill="#8b5cf6" 
                        name="Profit Margin" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-muted-foreground">Average Profit Margin Per Month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Bidding Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bids Since Start:</span>
                      <span className="font-medium text-foreground">{roiData.totalBids}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accepted Bids:</span>
                      <span className="font-medium text-foreground">{roiData.acceptedBids}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium text-foreground">{((roiData.acceptedBids / roiData.totalBids) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span className="font-medium text-foreground">${roiData.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Profit:</span>
                      <span className="font-medium text-foreground">${roiData.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-3">ROI Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">App Investment:</span>
                      <span className="font-medium text-red-400">${roiData.totalAppCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin Improvements:</span>
                      <span className="font-medium text-emerald-400">${roiData.additionalProfitFromMargins.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Savings:</span>
                      <span className="font-medium text-emerald-400">${roiData.timeSavingsValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-3">
                      <span className="text-foreground font-medium">Net Benefit:</span>
                      <span className="font-bold text-emerald-400">${roiData.netGain.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground font-medium">Return on Investment:</span>
                      <span className="font-bold text-emerald-400">{roiData.roi.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
