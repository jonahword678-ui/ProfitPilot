
import React, { useState, useEffect } from "react";
import { JobBid, IncomeGoal, User, ServiceRate, Invoice } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Plus,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw // Added RefreshCw icon for retry button
} from "lucide-react";

import StatsCard from "../components/dashboard/StatsCard";
import RecentBids from "../components/dashboard/RecentBids";
import OnboardingModal from "../components/assistant/OnboardingModal";

export default function Dashboard() {
  const [bids, setBids] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState(null); // New state for error handling

  useEffect(() => {
    loadDashboardData(); // Call the data loading function
  }, []);

  // Renamed and modified loadDashboardData to include retry logic
  const loadDashboardData = async (retryCount = 0) => {
    setIsLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      const currentUser = await User.me();
      const userFilter = { created_by: currentUser.email };
      
      // Add .catch(() => []) to individual promises within Promise.all
      // This allows Promise.all to resolve even if one data fetch fails,
      // providing partial data instead of a full error screen immediately.
      const [bidsData, goalsData] = await Promise.all([
        JobBid.filter(userFilter, '-updated_date').catch(() => {
          console.warn('Failed to load job bids, returning empty array.');
          return []; // Return empty array on error for bids
        }),
        IncomeGoal.filter(userFilter, '-created_date').catch(() => {
          console.warn('Failed to load income goals, returning empty array.');
          return []; // Return empty array on error for goals
        })
      ]);
      
      setBids(bidsData);
      setGoals(goalsData);
      
      if (!currentUser.has_completed_onboarding) {
        setShowOnboarding(true);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Implement retry logic
      if (retryCount < 2) { // Allow up to 2 retries (total 3 attempts)
        console.log(`Retrying dashboard data load... Attempt ${retryCount + 1}`);
        setTimeout(() => loadDashboardData(retryCount + 1), 1500); // Retry after 1.5 seconds
        return; // Exit function to prevent setting error or finishing loading immediately
      }
      
      setError('Failed to load dashboard data. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    const totalBids = bids.length;
    
    const acceptedBids = bids.filter(b => b.status === 'accepted');
    const acceptedBidsValue = acceptedBids.reduce((sum, bid) => sum + (bid.total_bid_amount || 0), 0);
    
    const avgProfitMargin = acceptedBids.length > 0 
      ? acceptedBids.reduce((sum, bid) => sum + (bid.profit_margin_percentage || 0), 0) / acceptedBids.length
      : 0;

    const pendingBidsCount = bids.filter(b => b.status === 'draft' || b.status === 'sent').length;

    const activeGoals = goals.filter(g => g.is_active);
    const goalProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, goal) => sum + (goal.current_progress || 0), 0) / activeGoals.length
      : 0;

    return {
      totalBids,
      acceptedBids,
      acceptedBidsValue,
      avgProfitMargin,
      pendingBidsCount,
      goalProgress,
      activeGoals: activeGoals.length
    };
  };

  const stats = calculateStats();

  // New function to handle retry button click
  const handleRetry = () => {
    loadDashboardData();
  };

  // Display error message if an error occurred
  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center py-16">
          <div className="text-red-400 text-5xl mb-4">⚠️</div> {/* Larger icon for emphasis */}
          <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleRetry} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-card rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      <div className="p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to ProfitPilot
            </h1>
            <p className="text-muted-foreground">
              AI-powered insights to optimize your job bids and boost profits
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Bids")}>
              <Button variant="outline" className="transition-all duration-200 hover:scale-[1.02] hover:bg-accent">
                <FileText className="w-4 h-4 mr-2" />
                Create Bid
              </Button>
            </Link>
            <Link to={createPageUrl("AIAssistant")}>
              <Button className="bg-primary text-background hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.02]">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Bids"
            value={stats.totalBids}
            icon={FileText}
            trend={stats.totalBids > 0 ? "up" : null}
            trendValue={`${stats.pendingBidsCount} pending`}
          />
          <StatsCard
            title="Avg Profit Margin"
            value={`${stats.avgProfitMargin.toFixed(1)}%`}
            icon={TrendingUp}
            trend={stats.avgProfitMargin > 20 ? "up" : "down"}
            trendValue="On accepted bids"
          />
          <StatsCard
            title="Accepted Bids Value"
            value={`$${stats.acceptedBidsValue.toLocaleString()}`}
            icon={CheckCircle2}
            trend="up"
            trendValue={`${stats.acceptedBids.length} bids won`}
          />
          <StatsCard
            title="Goal Progress"
            value={`${stats.goalProgress.toFixed(0)}%`}
            icon={Target}
            trend={stats.goalProgress > 50 ? "up" : "down"}
            trendValue={`${stats.activeGoals} active goals`}
          />
        </div>

        {/* Charts and Insights */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentBids bids={bids} />
          </div>

          <div className="space-y-6">
            {/* AI Insights Card */}
            <div className="border border-border shadow-lg bg-gradient-to-br from-card to-background rounded-xl p-6 text-foreground transition-all duration-200 hover:shadow-xl hover:shadow-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold">AI Insights</h3>
              </div>
              <div className="space-y-3">
                {stats.avgProfitMargin > 0 && stats.avgProfitMargin < 20 && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-sm">
                      💡 Your average margin is {stats.avgProfitMargin.toFixed(1)}%.
                      Review your pricing strategy on new bids.
                    </p>
                  </div>
                )}
                {stats.totalBids === 0 && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-sm">
                      🚀 Create your first job bid and let AI help you optimize your pricing.
                    </p>
                  </div>
                )}
                {stats.totalBids > 0 && stats.avgProfitMargin >= 20 && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-sm">
                      ✨ Great job! Your accepted bids are showing healthy profit margins.
                    </p>
                  </div>
                )}
              </div>
              <Link to={createPageUrl("Insights")}>
                <Button variant="outline" className="w-full mt-4 transition-all duration-200 hover:scale-[1.02] hover:bg-accent">
                  View Detailed Insights
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="border border-border shadow-lg bg-card/80 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-primary/10">
              <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to={createPageUrl("Bids")} className="block">
                  <Button variant="outline" className="w-full justify-start transition-all duration-200 hover:scale-[1.02] hover:bg-accent">
                    <FileText className="w-4 h-4 mr-2" />
                    Create New Bid
                  </Button>
                </Link>
                <Link to={createPageUrl("Goals")} className="block">
                  <Button variant="outline" className="w-full justify-start transition-all duration-200 hover:scale-[1.02] hover:bg-accent">
                    <Target className="w-4 h-4 mr-2" />
                    Set Income Goal
                  </Button>
                </Link>
                <Link to={createPageUrl("Insights")} className="block">
                  <Button variant="outline" className="w-full justify-start transition-all duration-200 hover:scale-[1.02] hover:bg-accent">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI Recommendations
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
