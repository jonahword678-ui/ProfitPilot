import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, trend, trendValue }) {
  const isPositiveTrend = trend === 'up';
  
  return (
    <Card className="relative overflow-hidden border border-border shadow-lg bg-card/80 backdrop-blur-sm">
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-12 -translate-y-12 bg-white/5 rounded-full`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">{value}</h3>
              {trend && (
                <div className="flex items-center gap-1">
                  {isPositiveTrend ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${
                    isPositiveTrend ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl bg-secondary`}>
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}