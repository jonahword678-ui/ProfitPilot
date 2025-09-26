import React, { useState, useEffect } from "react";
import { IncomeGoal } from "@/api/entities";
import { User } from "@/api/entities";
import { JobBid } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Calendar, TrendingUp, Edit, Save, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    target_period: 'monthly',
    deadline: '',
    strategy_notes: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const currentUser = await User.me();
      const goalsData = await IncomeGoal.filter({ created_by: currentUser.email }, '-created_date');
      const bidsData = await JobBid.filter({ created_by: currentUser.email }, '-updated_date');
      
      // Calculate progress for each goal
      const goalsWithProgress = goalsData.map(goal => {
        const acceptedBids = bidsData.filter(bid => bid.status === 'accepted');
        const totalRevenue = acceptedBids.reduce((sum, bid) => sum + (bid.total_bid_amount || 0), 0);
        const progressPercentage = goal.target_amount > 0 ? Math.min((totalRevenue / goal.target_amount) * 100, 100) : 0;
        
        return {
          ...goal,
          current_progress: Math.round(progressPercentage * 10) / 10,
          achieved_amount: totalRevenue
        };
      });
      
      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const currentUser = await User.me();
      const goalData = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        is_active: true,
        created_by: currentUser.email
      };

      if (editingGoal) {
        await IncomeGoal.update(editingGoal.id, goalData);
      } else {
        await IncomeGoal.create(goalData);
      }
      
      setShowForm(false);
      setEditingGoal(null);
      resetForm();
      loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target_amount: goal.target_amount.toString(),
      target_period: goal.target_period,
      deadline: goal.deadline,
      strategy_notes: goal.strategy_notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    if (window.confirm("Are you sure you want to permanently delete this goal? This action cannot be undone.")) {
      try {
        await IncomeGoal.delete(goalId);
        await loadGoals();
      } catch (error) {
        console.error("Error deleting goal:", error);
        alert("Failed to delete goal. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      target_amount: '',
      target_period: 'monthly',
      deadline: '',
      strategy_notes: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGoal(null);
    resetForm();
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-primary";
    if (progress >= 50) return "bg-sky-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-muted-foreground";
  };

  const getPeriodBadgeColor = (period) => {
    switch(period) {
      case 'monthly': return "bg-sky-900/50 text-sky-300";
      case 'quarterly': return "bg-purple-900/50 text-purple-300";
      case 'yearly': return "bg-emerald-900/50 text-emerald-300";
      default: return "bg-slate-700 text-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-card rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Income Goals</h1>
          <p className="text-muted-foreground">
            Set and track your financial targets to grow your business
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Goal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border border-border shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">
                        Goal Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Reach $10k monthly revenue"
                        className="border-border focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_amount" className="text-sm font-medium text-muted-foreground">
                        Target Amount ($) *
                      </Label>
                      <Input
                        id="target_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.target_amount}
                        onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                        placeholder="10000"
                        className="border-border focus:border-primary"
                        onFocus={(e) => e.target.select()}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_period" className="text-sm font-medium text-muted-foreground">
                        Time Period *
                      </Label>
                      <Select 
                        value={formData.target_period} 
                        onValueChange={(value) => setFormData({...formData, target_period: value})}
                      >
                        <SelectTrigger className="border-border focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline" className="text-sm font-medium text-muted-foreground">
                        Target Date *
                      </Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                        className="border-border focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strategy_notes" className="text-sm font-medium text-muted-foreground">
                      Strategy & Action Plan
                    </Label>
                    <Textarea
                      id="strategy_notes"
                      value={formData.strategy_notes}
                      onChange={(e) => setFormData({...formData, strategy_notes: e.target.value})}
                      placeholder="Describe your strategy to achieve this goal..."
                      className="border-border focus:border-primary focus:ring-primary"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isProcessing}
                      className="border-border hover:bg-accent"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingGoal ? 'Update Goal' : 'Create Goal'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No goals set yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first income goal to start tracking your business growth
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Your First Goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence>
            {goals.map((goal) => {
              const progress = goal.current_progress || 0;
              const daysUntilDeadline = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntilDeadline < 0;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <CardTitle className="text-xl text-foreground">
                            {goal.title}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge className={getPeriodBadgeColor(goal.target_period)}>
                              {goal.target_period}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1 border-border text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(goal.deadline), "MMM d, yyyy")}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                            {!goal.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(goal)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium text-foreground">{progress}%</span>
                        </div>
                        <Progress 
                          value={progress} 
                          className="h-3"
                          indicatorClassName={getProgressColor(progress)}
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            ${(goal.achieved_amount || 0).toLocaleString()} achieved
                          </span>
                          <span className="font-medium text-foreground">
                            ${goal.target_amount.toLocaleString()} target
                          </span>
                        </div>
                      </div>

                      {/* Time Status */}
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${
                              isOverdue ? 'text-destructive' : daysUntilDeadline <= 30 ? 'text-amber-400' : 'text-primary'
                            }`} />
                            <span className="text-sm font-medium">
                              {isOverdue 
                                ? `${Math.abs(daysUntilDeadline)} days overdue`
                                : daysUntilDeadline === 0 
                                  ? 'Due today'
                                  : `${daysUntilDeadline} days remaining`
                              }
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {progress >= 100 ? 'Goal achieved!' : 
                             progress >= 75 ? 'Almost there!' :
                             progress >= 50 ? 'Halfway there!' :
                             'Getting started'}
                          </span>
                        </div>
                      </div>

                      {/* Strategy Notes */}
                      {goal.strategy_notes && (
                        <div className="border-t border-border pt-4">
                          <h4 className="text-sm font-medium text-foreground mb-2">Strategy</h4>
                          <p className="text-sm text-muted-foreground">{goal.strategy_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}