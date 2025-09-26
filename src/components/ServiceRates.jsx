
import React, { useState, useEffect } from "react";
import { ServiceRate } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator, Edit, Trash2, DollarSign, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const UNITS = [
  { value: 'sq ft', label: 'Square Feet (sq ft)' },
  { value: 'linear ft', label: 'Linear Feet (linear ft)' },
  { value: 'cubic ft', label: 'Cubic Feet (cubic ft)' },
  { value: 'cubic yd', label: 'Cubic Yards (cubic yd)' },
  { value: 'each', label: 'Each (each)' },
  { value: 'hour', label: 'Hours (hour)' },
  { value: 'day', label: 'Days (day)' },
  { value: 'lbs', label: 'Pounds (lbs)' },
  { value: 'gallons', label: 'Gallons (gallons)' },
  { value: 'tons', label: 'Tons (tons)' },
  { value: 'yards', label: 'Yards (yards)' }
];

const CATEGORIES = [
  { value: 'materials', label: 'Materials', color: 'bg-blue-500 text-white' },
  { value: 'labor', label: 'Labor', color: 'bg-emerald-500 text-white' },
  { value: 'equipment', label: 'Equipment', color: 'bg-purple-500 text-white' },
  { value: 'overhead', label: 'Overhead', color: 'bg-orange-500 text-white' }
];

export default function ServiceRates() {
  const [rates, setRates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'sq ft',
    cost_per_unit: '',
    charge_per_unit: '',
    category: 'materials'
  });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setError(null);
      const currentUser = await User.me();
      const data = await ServiceRate.filter({ created_by: currentUser.email }, '-updated_date');
      setRates(data || []);
    } catch (error) {
      console.error('Error loading rates:', error);
      setError('Failed to load service rates. Please try again.');
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMargin = (cost, charge) => {
    if (!cost || !charge || charge === 0) return 0;
    return ((charge - cost) / charge * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const rateData = {
        ...formData,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        charge_per_unit: parseFloat(formData.charge_per_unit) || 0,
        profit_margin: calculateMargin(
          parseFloat(formData.cost_per_unit) || 0, 
          parseFloat(formData.charge_per_unit) || 0
        )
      };

      if (editingRate) {
        await ServiceRate.update(editingRate.id, rateData);
      } else {
        await ServiceRate.create(rateData);
      }
      
      setShowForm(false);
      setEditingRate(null);
      resetForm();
      loadRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Failed to save rate. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      description: rate.description || '',
      unit: rate.unit,
      cost_per_unit: rate.cost_per_unit.toString(),
      charge_per_unit: rate.charge_per_unit.toString(),
      category: rate.category
    });
    setShowForm(true);
  };

  const handleDelete = async (rateId) => {
    if (window.confirm('Are you sure you want to delete this rate?')) {
      try {
        await ServiceRate.delete(rateId);
        loadRates();
      } catch (error) {
        console.error('Error deleting rate:', error);
        alert('Failed to delete rate. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'sq ft',
      cost_per_unit: '',
      charge_per_unit: '',
      category: 'materials'
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRate(null);
    resetForm();
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return "bg-emerald-900/50 text-emerald-300";
    if (margin >= 20) return "bg-yellow-900/50 text-yellow-300";
    return "bg-red-900/50 text-red-300";
  };

  const getCategoryInfo = (category) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[0];
  };

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center py-16">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Service Rates</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadRates} className="bg-primary text-primary-foreground">
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Service Rates</h1>
          <p className="text-muted-foreground">
            Define your pricing per unit with built-in profit margin tracking
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rate
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Rates</p>
                <p className="text-2xl font-bold">{rates.length}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg Margin</p>
                <p className="text-2xl font-bold">
                  {rates.length > 0 
                    ? `${(rates.reduce((sum, rate) => sum + (rate.profit_margin || 0), 0) / rates.length).toFixed(1)}%`
                    : '0%'
                  }
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Materials</p>
                <p className="text-2xl font-bold">{rates.filter(r => r.category === 'materials').length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Labor</p>
                <p className="text-2xl font-bold">{rates.filter(r => r.category === 'labor').length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Form */}
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
                  <Calculator className="w-5 h-5 text-primary" />
                  {editingRate ? 'Edit Service Rate' : 'Add New Service Rate'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                        Service/Material Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Drywall Installation"
                        className="border-border focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium text-muted-foreground">
                        Category *
                      </Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger className="border-border focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of what this rate covers..."
                      className="border-border focus:border-primary"
                      rows={2}
                    />
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                    <h3 className="font-semibold text-foreground">Pricing Information</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium text-muted-foreground">
                          Unit *
                        </Label>
                        <Select 
                          value={formData.unit} 
                          onValueChange={(value) => setFormData({...formData, unit: value})}
                        >
                          <SelectTrigger className="border-border focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost_per_unit" className="text-sm font-medium text-muted-foreground">
                          Your Cost per {formData.unit} *
                        </Label>
                        <Input
                          id="cost_per_unit"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cost_per_unit}
                          onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                          placeholder="0.00"
                          className="border-border focus:border-primary"
                          onFocus={(e) => e.target.select()}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="charge_per_unit" className="text-sm font-medium text-muted-foreground">
                          You Charge per {formData.unit} *
                        </Label>
                        <Input
                          id="charge_per_unit"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.charge_per_unit}
                          onChange={(e) => setFormData({...formData, charge_per_unit: e.target.value})}
                          placeholder="0.00"
                          className="border-border focus:border-primary"
                          onFocus={(e) => e.target.select()}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Profit Analysis</Label>
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Profit per {formData.unit}:</span>
                              <span className="font-medium">
                                ${(parseFloat(formData.charge_per_unit) || 0) - (parseFloat(formData.cost_per_unit) || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Margin:</span>
                              <Badge variant={calculateMargin(parseFloat(formData.cost_per_unit), parseFloat(formData.charge_per_unit)) > 20 ? "default" : "secondary"} className="text-xs">
                                {calculateMargin(parseFloat(formData.cost_per_unit), parseFloat(formData.charge_per_unit)).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      {editingRate ? 'Update Rate' : 'Save Rate'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rates List */}
      {rates.length === 0 ? (
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="text-center py-16">
                <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No service rates defined yet</h3>
                <p className="text-muted-foreground mb-6">
                    Add your first service rate to track pricing and profit margins
                </p>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Rate
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence>
            {rates.map((rate) => {
              const categoryInfo = getCategoryInfo(rate.category);
              
              return (
                <motion.div
                  key={rate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <CardTitle className="text-xl text-foreground">
                            {rate.name}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge className={`${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </Badge>
                            <Badge className={getMarginColor(rate.profit_margin || 0)}>
                              {(rate.profit_margin || 0).toFixed(1)}% margin
                            </Badge>
                            <Badge variant="outline" className="border-border">
                              per {rate.unit}
                            </Badge>
                          </div>
                          {rate.description && (
                            <p className="text-sm text-muted-foreground">{rate.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(rate)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rate.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Your Cost</p>
                          <p className="text-lg font-semibold text-red-400">
                            ${(rate.cost_per_unit || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">per {rate.unit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">You Charge</p>
                          <p className="text-lg font-semibold text-emerald-400">
                            ${(rate.charge_per_unit || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">per {rate.unit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Profit</p>
                          <p className="text-lg font-semibold text-sky-400">
                            ${((rate.charge_per_unit || 0) - (rate.cost_per_unit || 0)).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">per {rate.unit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Margin</p>
                          <p className="text-lg font-semibold text-purple-400">
                            {(rate.profit_margin || 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">profit margin</p>
                        </div>
                      </div>
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
