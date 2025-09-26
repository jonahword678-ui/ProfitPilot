
import React, { useState, useEffect } from "react";
import { JobBid } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, DollarSign, Target } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ProfitForecast() {
  const [bids, setBids] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('6months');
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generateForecast();
  }, [bids, timeframe]);

  const loadData = async () => {
    try {
      const bidsData = await JobBid.list('-updated_date');
      setBids(bidsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateForecast = () => {
    const months = timeframe === '3months' ? 3 : timeframe === '6months' ? 6 : 12;
    const today = new Date();
    const forecast = [];

    // Calculate historical average
    const acceptedBids = bids.filter(b => b.status === 'accepted');
    const avgMonthlyBids = acceptedBids.length > 0 ? acceptedBids.length / 6 : 1; // Assume 6 months of history
    const avgBidValue = acceptedBids.length > 0 
      ? acceptedBids.reduce((sum, bid) => sum + bid.total_bid_amount, 0) / acceptedBids.length
      : 5000;
    const avgProfitMargin = acceptedBids.length > 0
      ? acceptedBids.reduce((sum, bid) => sum + (bid.profit_margin_percentage || 20), 0) / acceptedBids.length
      : 20;

    // Generate forecast for each month
    for (let i = 0; i < months; i++) {
      const month = addMonths(today, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // Count existing bids in this month
      const existingBids = bids.filter(bid => {
        const bidDate = new Date(bid.created_date);
        return isWithinInterval(bidDate, { start: monthStart, end: monthEnd });
      });

      const existingRevenue = existingBids
        .filter(b => b.status === 'accepted')
        .reduce((sum, bid) => sum + bid.total_bid_amount, 0);

      const existingProfit = existingBids
        .filter(b => b.status === 'accepted')
        .reduce((sum, bid) => sum + (bid.total_profit || 0), 0);

      // Forecast additional bids
      const projectedBids = Math.max(1, avgMonthlyBids - existingBids.length);
      const projectedRevenue = projectedBids * avgBidValue;
      const projectedProfit = projectedRevenue * (avgProfitMargin / 100);

      const totalRevenue = existingRevenue + projectedRevenue;
      const totalProfit = existingProfit + projectedProfit;

      forecast.push({
        month: format(month, 'MMM yyyy'),
        existingRevenue,
        projectedRevenue,
        totalRevenue,
        existingProfit,
        projectedProfit,
        totalProfit,
        bidCount: existingBids.length + projectedBids
      });
    }

    setForecastData(forecast);
  };

  const getTotals = () => {
    return forecastData.reduce((acc, month) => ({
      totalRevenue: acc.totalRevenue + month.totalRevenue,
      totalProfit: acc.totalProfit + month.totalProfit,
      totalBids: acc.totalBids + month.bidCount
    }), { totalRevenue: 0, totalProfit: 0, totalBids: 0 });
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

  const totals = getTotals();

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Profit Forecast</h1>
          <p className="text-muted-foreground">
            Predict your earnings and track progress toward your goals
          </p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Next 3 Months</SelectItem>
            <SelectItem value="6months">Next 6 Months</SelectItem>
            <SelectItem value="12months">Next 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Projected Revenue</p>
                <p className="text-2xl font-bold">${totals.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Projected Profit</p>
                <p className="text-2xl font-bold">${totals.totalProfit.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Expected Bids</p>
                <p className="text-2xl font-bold">{totals.totalBids}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Avg Monthly</p>
                <p className="text-2xl font-bold">${Math.round(totals.totalRevenue / forecastData.length).toLocaleString()}</p>
              </div>
              <Target className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Forecast Chart */}
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Revenue Forecast</CardTitle>
            <p className="text-sm text-muted-foreground">Track confirmed vs projected revenue by month</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      const formattedValue = `$${Number(value).toLocaleString()}`;
                      if (name === 'existingRevenue') return [formattedValue, 'Confirmed Revenue'];
                      if (name === 'projectedRevenue') return [formattedValue, 'Projected Revenue'];
                      return [formattedValue, name];
                    }}
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
                    dataKey="existingRevenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    strokeDasharray="none"
                    name="existingRevenue"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projectedRevenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="projectedRevenue"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-muted-foreground">Confirmed Revenue (solid line)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-blue-500 rounded" style={{borderTop: '2px dashed #3b82f6'}}></div>
                <span className="text-muted-foreground">Projected Revenue (dashed line)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Forecast Chart */}
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Profit Forecast</CardTitle>
            <p className="text-sm text-muted-foreground">Compare confirmed profits with projected profits</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      const formattedValue = `$${Number(value).toLocaleString()}`;
                      if (name === 'existingProfit') return [formattedValue, 'Confirmed Profit'];
                      if (name === 'projectedProfit') return [formattedValue, 'Projected Profit'];
                      return [formattedValue, name];
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="existingProfit" fill="#10b981" name="existingProfit" />
                  <Bar dataKey="projectedProfit" fill="#60a5fa" name="projectedProfit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-muted-foreground">Confirmed Profit (from accepted bids)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <span className="text-muted-foreground">Projected Profit (estimated future)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
