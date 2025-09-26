
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2, FileText, Calculator, FolderPlus, AlertCircle, Copy, Wrench } from "lucide-react";

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

const EQUIPMENT_UNITS = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' }
];

export default function BidForm({ bid, onSave, onCancel, isProcessing }) {
  // Use a ref to store the current bid object, especially its ID for auto-saving new drafts
  // This allows us to update the ID after a new draft is created without re-rendering or prop issues.
  const bidRef = useRef(bid);

  const [formData, setFormData] = useState(bid || {
    client_name: '',
    client_email: '',
    project_title: '',
    project_description: '',
    materials: [],
    labor_items: [],
    equipment_items: [], // New state for equipment items
    overhead_items: [], // NEW: New state for overhead items
    custom_expenses: [],
    markup_percentage: 20,
    status: 'draft',
    notes: '',
    valid_until: ''
  });

  const [serviceRates, setServiceRates] = useState([]);
  const [totals, setTotals] = useState({
    materials_total: 0,
    labor_total: 0,
    equipment_total: 0, // New total for equipment
    overhead_total: 0, // NEW: New total for overhead
    custom_expenses_total: 0,
    subtotal: 0,
    markup_amount: 0,
    total_bid_amount: 0,
    total_actual_cost: 0,
    total_profit: 0,
    profit_margin_percentage: 0
  });

  // New state for auto-save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState(null);

  // Initial load of service rates and beforeunload event listener
  useEffect(() => {
    loadServiceRates();
    loadUserBusinessInfo(); // Call this function on component mount/update based on hasUnsavedChanges

    // Add beforeunload event listener to warn about unsaved changes
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Standard for browser prompts
        return ''; // For some older browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]); // Re-run if hasUnsavedChanges state changes

  // Effect to recalculate totals whenever relevant form data changes
  useEffect(() => {
    calculateTotals();
  }, [formData.materials, formData.labor_items, formData.equipment_items, formData.overhead_items, formData.custom_expenses, formData.markup_percentage]); // ADDED formData.overhead_items

  // Auto-save effect - saves draft every 10 seconds if there are changes
  useEffect(() => {
    // Only auto-save if there are unsaved changes and a project title exists
    // (Project title is a good minimum for a "valid" draft to save)
    if (!hasUnsavedChanges || !formData.project_title) {
      return;
    }

    const autoSaveTimer = setTimeout(async () => {
      await performAutoSave();
    }, 10000); // Auto-save after 10 seconds of no changes

    return () => clearTimeout(autoSaveTimer); // Clear timer if formData changes before 10s
  }, [formData, hasUnsavedChanges]); // Dependencies for auto-save

  const loadServiceRates = async () => {
    try {
      const { ServiceRate } = await import("@/api/entities");
      const rates = await ServiceRate.list();
      setServiceRates(rates);
    } catch (error) {
      console.error('Error loading service rates:', error);
      setServiceRates([]);
      // Don't show error to user for service rates as it's not critical
    }
  };

  const loadUserBusinessInfo = async () => {
    try {
      const { User } = await import("@/api/entities");
      const user = await User.me();
      
      setFormData(prev => {
        if (!prev.client_email && user?.business_email) {
          return {
            ...prev,
            client_email: user.business_email
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error loading user business info:', error);
      // Continue without auto-filling business email
    }
  };

  const calculateTotals = () => {
    // Calculate YOUR actual costs for materials and labor
    const materialsCostTotal = formData.materials.reduce((sum, item) => sum + (parseFloat(item.actual_cost) || 0), 0);
    const laborCostTotal = formData.labor_items.reduce((sum, item) => sum + (parseFloat(item.actual_cost) || 0), 0);
    const equipmentCostTotal = formData.equipment_items.reduce((sum, item) => sum + (parseFloat(item.actual_cost) || 0), 0); // Calculate equipment cost
    const overheadCostTotal = formData.overhead_items.reduce((sum, item) => sum + (parseFloat(item.actual_cost) || 0), 0); // NEW: Calculate overhead cost

    // Calculate custom expenses costs
    const customExpensesTotal = formData.custom_expenses.reduce((sum, category) => {
      const categoryTotal = category.items.reduce((catSum, item) => catSum + (parseFloat(item.actual_cost) || 0), 0);
      return sum + categoryTotal;
    }, 0);

    // Total job cost is the sum of your material, labor, equipment, overhead, and custom expenses costs
    const totalJobCost = materialsCostTotal + laborCostTotal + equipmentCostTotal + overheadCostTotal + customExpensesTotal; // MODIFIED: Included overheadCostTotal

    // Markup is applied to your total job cost
    const markupPercentage = parseFloat(formData.markup_percentage) || 0; // Parse here for calculation
    const markupAmount = totalJobCost * (markupPercentage / 100);

    // Total bid amount is your job cost plus the markup
    const totalBidAmount = totalJobCost + markupAmount;

    // Your total profit is the markup amount
    const totalProfit = markupAmount;

    // Profit margin percentage based on the total bid amount
    const profitMarginPercentage = totalBidAmount > 0 ? (totalProfit / totalBidAmount) * 100 : 0;

    setTotals({
      materials_total: materialsCostTotal, // Represents total material COST
      labor_total: laborCostTotal,       // Represents total labor COST
      equipment_total: equipmentCostTotal, // Represents total equipment COST
      overhead_total: overheadCostTotal, // NEW: Represents total overhead COST
      custom_expenses_total: customExpensesTotal, // Represents total custom expenses COST
      subtotal: totalJobCost,             // Represents the total job cost (your cost)
      markup_amount: markupAmount,
      total_bid_amount: totalBidAmount,
      total_actual_cost: totalJobCost,    // Same as subtotal now
      total_profit: totalProfit,
      profit_margin_percentage: profitMarginPercentage
    });
  };

  const performAutoSave = async () => {
    // Prevent auto-save if already saving or if no project title (minimal data for a valid draft)
    if (!formData.project_title || isAutoSaving) {
      return;
    }

    setIsAutoSaving(true);
    try {
      // Create a clean version of the data for saving, converting empty strings to 0 for number fields
      const cleanedDataForSave = {
        ...formData,
        materials: formData.materials.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            cost_per_unit: parseFloat(item.cost_per_unit) || 0,
        })),
        labor_items: formData.labor_items.map(item => ({
            ...item,
            hours: parseFloat(item.hours) || 0,
            cost_per_hour: parseFloat(item.cost_per_hour) || 0,
        })),
        equipment_items: formData.equipment_items.map(item => ({
            ...item,
            rental_duration: parseFloat(item.rental_duration) || 0,
            cost_per_unit: parseFloat(item.cost_per_unit) || 0,
        })),
        overhead_items: formData.overhead_items.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            cost_per_unit: parseFloat(item.cost_per_unit) || 0,
        })),
        custom_expenses: formData.custom_expenses.map(category => ({
            ...category,
            items: category.items.map(item => ({
                ...item,
                quantity: parseFloat(item.quantity) || 0,
                cost_per_unit: parseFloat(item.cost_per_unit) || 0,
            }))
        })),
        markup_percentage: parseFloat(formData.markup_percentage) || 0,
      };

      const autoSaveData = {
        ...cleanedDataForSave,
        status: 'draft', // Auto-saves always keep bid in draft status
        materials_total: totals.materials_total,
        labor_total: totals.labor_total,
        equipment_total: totals.equipment_total, // Include equipment total
        overhead_total: totals.overhead_total, // NEW: Include overhead total
        custom_expenses_total: totals.custom_expenses_total,
        subtotal: totals.subtotal,
        markup_amount: totals.markup_amount,
        total_bid_amount: totals.total_bid_amount,
        total_actual_cost: totals.total_actual_cost,
        total_profit: totals.total_profit,
        profit_margin_percentage: totals.profit_margin_percentage
      };

      const { JobBid } = await import("@/api/entities");
      let currentBidId = bidRef.current?.id;

      if (currentBidId) {
        // Update existing bid
        await JobBid.update(currentBidId, autoSaveData);
      } else {
        // Create new bid as draft
        const newBid = await JobBid.create(autoSaveData);
        // Update the bidRef with the new ID for subsequent auto-saves
        if (newBid?.id) {
          bidRef.current = { ...bidRef.current, id: newBid.id }; // Update ref to include new ID
        }
      }

      setHasUnsavedChanges(false);
      setLastAutoSaveTime(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Do not show error to user for auto-save failures to avoid disrupting workflow
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Centralized handler for all form data changes
  const handleFormDataChange = (newData) => {
    setFormData(newData);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Show confirmation if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmSave = window.confirm(
        'You have unsaved changes. Do you want to save this bid and finish editing?'
      );
      if (!confirmSave) return;
    }
    
    // Create a clean version of the data for saving, converting empty strings to 0 for number fields
    const dataToSave = {
      ...formData,
      materials: formData.materials.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          cost_per_unit: parseFloat(item.cost_per_unit) || 0,
      })),
      labor_items: formData.labor_items.map(item => ({
          ...item,
          hours: parseFloat(item.hours) || 0,
          cost_per_hour: parseFloat(item.cost_per_hour) || 0,
      })),
      equipment_items: formData.equipment_items.map(item => ({
          ...item,
          rental_duration: parseFloat(item.rental_duration) || 0,
          cost_per_unit: parseFloat(item.cost_per_unit) || 0,
      })),
      overhead_items: formData.overhead_items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          cost_per_unit: parseFloat(item.cost_per_unit) || 0,
      })),
      custom_expenses: formData.custom_expenses.map(category => ({
          ...category,
          items: category.items.map(item => ({
              ...item,
              quantity: parseFloat(item.quantity) || 0,
              cost_per_unit: parseFloat(item.cost_per_unit) || 0,
          }))
      })),
      markup_percentage: parseFloat(formData.markup_percentage) || 0,
      // Pass the calculated totals for saving
      materials_total: totals.materials_total,
      labor_total: totals.labor_total,
      equipment_total: totals.equipment_total, // Include equipment total
      overhead_total: totals.overhead_total, // NEW: Include overhead total
      custom_expenses_total: totals.custom_expenses_total,
      subtotal: totals.subtotal,
      markup_amount: totals.markup_amount,
      total_bid_amount: totals.total_bid_amount,
      total_actual_cost: totals.total_actual_cost,
      total_profit: totals.total_profit,
      profit_margin_percentage: totals.profit_margin_percentage
    };

    setHasUnsavedChanges(false); // Changes are now saved
    onSave(dataToSave);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmCancel = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel? Your changes will be auto-saved as a draft.'
      );
      if (!confirmCancel) return;
    }
    onCancel();
  };

  // Material functions simplified to only handle costs
  const addMaterial = () => {
    handleFormDataChange({
      ...formData,
      materials: [...formData.materials, {
        name: '',
        quantity: '', // Initialize as empty string for flexible input
        unit: 'sq ft', // Default unit for new materials
        cost_per_unit: '',  // Initialize as empty string for flexible input
        actual_cost: 0     // What it costs you total
      }]
    });
  };

  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };

    // Only recalculate actual_cost when quantity or cost_per_unit changes
    if (field === 'quantity' || field === 'cost_per_unit') {
      const quantity = parseFloat(updatedMaterials[index].quantity) || 0;
      const costPerUnit = parseFloat(updatedMaterials[index].cost_per_unit) || 0;
      updatedMaterials[index].actual_cost = quantity * costPerUnit;
    }

    handleFormDataChange({ ...formData, materials: updatedMaterials });
  };

  const removeMaterial = (index) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    handleFormDataChange({ ...formData, materials: updatedMaterials });
  };
  
  const duplicateMaterial = (index) => {
    const materialToDuplicate = formData.materials[index];
    // Create a deep copy if there were nested objects, but here it's flat enough for shallow copy
    const newMaterial = { ...materialToDuplicate, actual_cost: materialToDuplicate.actual_cost }; 
    const updatedMaterials = [...formData.materials];
    updatedMaterials.splice(index + 1, 0, newMaterial); // Insert copy after original
    handleFormDataChange({ ...formData, materials: updatedMaterials });
  };

  const addFromServiceRate = (rateId, type = 'materials') => {
    const rate = serviceRates.find(r => r.id === rateId);
    if (rate && type === 'materials') {
      const newMaterial = {
        name: rate.name,
        quantity: rate.quantity ? String(rate.quantity) : '1', // Ensure string for input, fallback to 1
        unit: rate.unit,
        cost_per_unit: String(rate.cost_per_unit), // Ensure string for input
        actual_cost: rate.cost_per_unit // Initial actual cost (quantity 1)
      };
      handleFormDataChange(prevData => ({ // Use functional update with handleFormDataChange
        ...prevData,
        materials: [...prevData.materials, newMaterial]
      }));
    } else if (rate && type === 'labor') {
      const newLabor = {
        description: rate.name,
        hours: rate.hours ? String(rate.hours) : '1', // Ensure string for input, fallback to 1
        cost_per_hour: String(rate.cost_per_unit), // Use cost_per_unit from service rate, ensure string
        actual_cost: rate.cost_per_unit // Initial actual cost (hours 1)
      };
      handleFormDataChange(prevData => ({ // Use functional update with handleFormDataChange
        ...prevData,
        labor_items: [...prevData.labor_items, newLabor]
      }));
    } else if (rate && type === 'equipment') { // New equipment rate handling
      const newEquipment = {
        name: rate.name,
        rental_duration: rate.quantity ? String(rate.quantity) : '1', // Use quantity as duration
        rental_unit: rate.unit || 'day', // Use rate unit or default to 'day'
        cost_per_unit: String(rate.cost_per_unit),
        actual_cost: rate.cost_per_unit // Initial actual cost (quantity 1)
      };
      handleFormDataChange(prevData => ({
        ...prevData,
        equipment_items: [...prevData.equipment_items, newEquipment]
      }));
    } else if (rate && type === 'overhead') { // NEW: New overhead rate handling
      const newOverhead = {
        description: rate.name,
        quantity: rate.quantity ? String(rate.quantity) : '1', // fallback to 1
        unit: rate.unit,
        cost_per_unit: String(rate.cost_per_unit),
        actual_cost: rate.cost_per_unit // Initial actual cost (quantity 1)
      };
      handleFormDataChange(prevData => ({
        ...prevData,
        overhead_items: [...prevData.overhead_items, newOverhead]
      }));
    }
  };

  // Labor functions simplified to only handle costs
  const addLabor = () => {
    handleFormDataChange({
      ...formData,
      labor_items: [...formData.labor_items, {
        description: '',
        hours: '', // Initialize as empty string for flexible input
        cost_per_hour: '',  // Initialize as empty string for flexible input
        actual_cost: 0     // What it costs you total
      }]
    });
  };

  const updateLabor = (index, field, value) => {
    const updatedLabor = [...formData.labor_items];
    updatedLabor[index] = { ...updatedLabor[index], [field]: value };

    // Only recalculate actual_cost when hours or cost_per_hour changes
    if (field === 'hours' || field === 'cost_per_hour') {
      const hours = parseFloat(updatedLabor[index].hours) || 0;
      const costPerHour = parseFloat(updatedLabor[index].cost_per_hour) || 0;
      updatedLabor[index].actual_cost = hours * costPerHour;
    }

    handleFormDataChange({ ...formData, labor_items: updatedLabor });
  };

  const removeLabor = (index) => {
    const updatedLabor = formData.labor_items.filter((_, i) => i !== index);
    handleFormDataChange({ ...formData, labor_items: updatedLabor });
  };

  const duplicateLabor = (index) => {
    const laborToDuplicate = formData.labor_items[index];
    const newLaborItem = { ...laborToDuplicate, actual_cost: laborToDuplicate.actual_cost }; // Create a copy
    const updatedLabor = [...formData.labor_items];
    updatedLabor.splice(index + 1, 0, newLaborItem); // Insert copy after original
    handleFormDataChange({ ...formData, labor_items: updatedLabor });
  };

  // Equipment functions
  const addEquipment = () => {
    handleFormDataChange({
      ...formData,
      equipment_items: [...formData.equipment_items, {
        name: '',
        rental_duration: '',
        rental_unit: 'day', // Default unit for new equipment
        cost_per_unit: '',
        actual_cost: 0
      }]
    });
  };

  const updateEquipment = (index, field, value) => {
    const updatedEquipment = [...formData.equipment_items];
    updatedEquipment[index] = { ...updatedEquipment[index], [field]: value };

    if (field === 'rental_duration' || field === 'cost_per_unit') {
      const duration = parseFloat(updatedEquipment[index].rental_duration) || 0;
      const costPerUnit = parseFloat(updatedEquipment[index].cost_per_unit) || 0;
      updatedEquipment[index].actual_cost = duration * costPerUnit;
    }

    handleFormDataChange({ ...formData, equipment_items: updatedEquipment });
  };

  const removeEquipment = (index) => {
    const updatedEquipment = formData.equipment_items.filter((_, i) => i !== index);
    handleFormDataChange({ ...formData, equipment_items: updatedEquipment });
  };

  const duplicateEquipment = (index) => {
    const equipmentToDuplicate = formData.equipment_items[index];
    const newEquipmentItem = { ...equipmentToDuplicate, actual_cost: equipmentToDuplicate.actual_cost };
    const updatedEquipment = [...formData.equipment_items];
    updatedEquipment.splice(index + 1, 0, newEquipmentItem);
    handleFormDataChange({ ...formData, equipment_items: updatedEquipment });
  };

  // NEW: Overhead functions
  const addOverhead = () => {
    handleFormDataChange({
      ...formData,
      overhead_items: [...formData.overhead_items, {
        description: '',
        quantity: '',
        unit: 'each',
        cost_per_unit: '',
        actual_cost: 0
      }]
    });
  };

  const updateOverhead = (index, field, value) => {
    const updatedOverhead = [...formData.overhead_items];
    updatedOverhead[index] = { ...updatedOverhead[index], [field]: value };

    if (field === 'quantity' || field === 'cost_per_unit') {
      const quantity = parseFloat(updatedOverhead[index].quantity) || 0;
      const costPerUnit = parseFloat(updatedOverhead[index].cost_per_unit) || 0;
      updatedOverhead[index].actual_cost = quantity * costPerUnit;
    }

    handleFormDataChange({ ...formData, overhead_items: updatedOverhead });
  };

  const removeOverhead = (index) => {
    const updatedOverhead = formData.overhead_items.filter((_, i) => i !== index);
    handleFormDataChange({ ...formData, overhead_items: updatedOverhead });
  };

  const duplicateOverhead = (index) => {
    const overheadToDuplicate = formData.overhead_items[index];
    const newOverheadItem = { ...overheadToDuplicate, actual_cost: overheadToDuplicate.actual_cost };
    const updatedOverhead = [...formData.overhead_items];
    updatedOverhead.splice(index + 1, 0, newOverheadItem);
    handleFormDataChange({ ...formData, overhead_items: updatedOverhead });
  };


  // Custom Expense Category Functions
  const addCustomExpenseCategory = () => {
    const categoryName = prompt("Enter name for new expense category (e.g., 'Equipment Rental', 'Permits', 'Subcontractors'):");
    if (categoryName && categoryName.trim()) {
      handleFormDataChange(prev => ({
        ...prev,
        custom_expenses: [...prev.custom_expenses, {
          category_name: categoryName.trim(),
          items: [],
        }]
      }));
    }
  };

  const removeCustomExpenseCategory = (categoryIndex) => {
    const updatedCategories = formData.custom_expenses.filter((_, i) => i !== categoryIndex);
    handleFormDataChange({ ...formData, custom_expenses: updatedCategories });
  };

  const addCustomExpenseItem = (categoryIndex) => {
    const updatedCategories = [...formData.custom_expenses];
    updatedCategories[categoryIndex].items.push({
      description: '',
      quantity: '', // Initialize as empty string
      unit: 'each', // Default unit for custom expense items
      cost_per_unit: '', // Initialize as empty string
      actual_cost: 0
    });
    handleFormDataChange({ ...formData, custom_expenses: updatedCategories });
  };

  const updateCustomExpenseItem = (categoryIndex, itemIndex, field, value) => {
    const updatedCategories = [...formData.custom_expenses];
    updatedCategories[categoryIndex].items[itemIndex] = {
      ...updatedCategories[categoryIndex].items[itemIndex],
      [field]: value
    };

    // Only recalculate actual_cost when quantity or cost_per_unit changes
    if (field === 'quantity' || field === 'cost_per_unit') {
      const quantity = parseFloat(updatedCategories[categoryIndex].items[itemIndex].quantity) || 0;
      const costPerUnit = parseFloat(updatedCategories[categoryIndex].items[itemIndex].cost_per_unit) || 0;
      updatedCategories[categoryIndex].items[itemIndex].actual_cost = quantity * costPerUnit;
    }

    handleFormDataChange({ ...formData, custom_expenses: updatedCategories });
  };

  const removeCustomExpenseItem = (categoryIndex, itemIndex) => {
    const updatedCategories = [...formData.custom_expenses];
    updatedCategories[categoryIndex].items = updatedCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
    handleFormDataChange({ ...formData, custom_expenses: updatedCategories });
  };

  // These functions are still used for the overall profit margin display
  const getProfitMargin = (totalCost, actualCost) => {
    if (!totalCost || totalCost === 0) return 0;
    return ((totalCost - actualCost) / totalCost * 100);
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return "bg-emerald-100 text-emerald-800";
    if (margin >= 20) return "bg-yellow-100 text-yellow-800";
    if (margin < 20 && margin >= 0) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };


  return (
    <Card className="border border-border shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {bid ? 'Edit Job Bid' : 'Create New Job Bid'}
          </CardTitle>

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isAutoSaving && (
              <div className="flex items-center gap-1 text-sky-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-sky-400"></div>
                <span>Auto-saving...</span>
              </div>
            )}
            {hasUnsavedChanges && !isAutoSaving && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>Unsaved changes</span>
              </div>
            )}
            {lastAutoSaveTime && !hasUnsavedChanges && !isAutoSaving && (
              <div className="text-muted-foreground">
                <span>Saved {lastAutoSaveTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client & Project Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Project Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name" className="text-sm font-medium text-muted-foreground">
                  Client Name *
                </Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleFormDataChange({...formData, client_name: e.target.value})}
                  placeholder="John Smith Construction"
                  className="border-border focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email" className="text-sm font-medium text-muted-foreground">
                  Client Email *
                </Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleFormDataChange({...formData, client_email: e.target.value})}
                  placeholder="john@construction.com"
                  className="border-border focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_title" className="text-sm font-medium text-muted-foreground">
                Project Title *
              </Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => handleFormDataChange({...formData, project_title: e.target.value})}
                placeholder="Kitchen Renovation - Main Floor"
                className="border-border focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_description" className="text-sm font-medium text-muted-foreground">
                Project Description *
              </Label>
              <Textarea
                id="project_description"
                value={formData.project_description}
                onChange={(e) => handleFormDataChange({...formData, project_description: e.target.value})}
                placeholder="Detailed description of the work to be performed..."
                className="border-border focus:border-primary"
                rows={4}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_until" className="text-sm font-medium text-muted-foreground">
                  Bid Valid Until
                </Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => handleFormDataChange({...formData, valid_until: e.target.value})}
                  className="border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleFormDataChange({...formData, status: value})}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Materials & Supplies Costs</h3>
              <div className="flex gap-2">
                {serviceRates.filter(r => r.category === 'materials').length > 0 && (
                  <Select onValueChange={(value) => addFromServiceRate(value, 'materials')}>
                    <SelectTrigger className="w-48 border-purple-500/50 text-purple-300">
                      <SelectValue placeholder="Add from rates" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceRates.filter(r => r.category === 'materials').map(rate => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} - ${rate.cost_per_unit}/{rate.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  onClick={addMaterial}
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {formData.materials.map((material, index) => {
                return (
                  <Card key={index} className="border-2 border-border bg-secondary/30">
                    <div className="p-4 space-y-4">
                      {/* Material Input Row */}
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[150px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Material / Item Name</Label>
                          <Input
                            value={material.name}
                            onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                            placeholder="e.g., Drywall Sheets"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.quantity}
                            onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                            className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                        />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                          <Select
                            value={material.unit}
                            onValueChange={(value) => updateMaterial(index, 'unit', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Your Cost per {material.unit}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.cost_per_unit}
                            onChange={(e) => updateMaterial(index, 'cost_per_unit', e.target.value)}
                            placeholder="0.00"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                        />
                        </div>
                         <div className="flex items-center gap-1 self-end">
                            <span className="font-bold text-lg text-red-400 mr-2">${(material.actual_cost || 0).toFixed(2)}</span>
                             <Button variant="ghost" size="icon" onClick={() => duplicateMaterial(index)} className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                                <Copy className="w-4 h-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => removeMaterial(index)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Labor Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Labor & Services Costs</h3>
              <div className="flex gap-2">
                {serviceRates.filter(r => r.category === 'labor').length > 0 && (
                  <Select onValueChange={(value) => addFromServiceRate(value, 'labor')}>
                    <SelectTrigger className="w-48 border-purple-500/50 text-purple-300">
                      <SelectValue placeholder="Add from rates" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceRates.filter(r => r.category === 'labor').map(rate => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} - ${rate.cost_per_unit}/{rate.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  onClick={addLabor}
                  variant="outline"
                  className="border-sky-500/50 text-sky-300 hover:bg-sky-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Labor Item
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {formData.labor_items.map((labor, index) => {
                return (
                  <Card key={index} className="border-2 border-border bg-secondary/30">
                    <div className="p-4 space-y-4">
                      {/* Labor Input Row */}
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[150px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Labor Description</Label>
                          <Input
                            value={labor.description}
                            onChange={(e) => updateLabor(index, 'description', e.target.value)}
                            placeholder="e.g., Installation, Demolition"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Hours</Label>
                          <Input
                            type="number"
                            step="0.25"
                            value={labor.hours}
                            onChange={(e) => updateLabor(index, 'hours', e.target.value)}
                            className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                        />
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Your Cost per Hour</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={labor.cost_per_hour}
                            onChange={(e) => updateLabor(index, 'cost_per_hour', e.target.value)}
                            placeholder="0.00"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                        />
                        </div>
                        <div className="flex items-center gap-1 self-end">
                            <span className="font-bold text-lg text-red-400 mr-2">${(labor.actual_cost || 0).toFixed(2)}</span>
                            <Button variant="ghost" size="icon" onClick={() => duplicateLabor(index)} className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                                <Copy className="w-4 h-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => removeLabor(index)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Equipment Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Equipment Costs</h3>
              <div className="flex gap-2">
                {serviceRates.filter(r => r.category === 'equipment').length > 0 && (
                  <Select onValueChange={(value) => addFromServiceRate(value, 'equipment')}>
                    <SelectTrigger className="w-48 border-purple-500/50 text-purple-300">
                      <SelectValue placeholder="Add from rates" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceRates.filter(r => r.category === 'equipment').map(rate => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} - ${rate.cost_per_unit}/{rate.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  onClick={addEquipment}
                  variant="outline"
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Add Equipment
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {formData.equipment_items.map((equipment, index) => {
                return (
                  <Card key={index} className="border-2 border-border bg-secondary/30">
                    <div className="p-4 space-y-4">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[150px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Equipment Name</Label>
                          <Input
                            value={equipment.name}
                            onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                            placeholder="e.g., Scissor Lift, Excavator"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={equipment.rental_duration}
                            onChange={(e) => updateEquipment(index, 'rental_duration', e.target.value)}
                            className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                          <Select
                            value={equipment.rental_unit}
                            onValueChange={(value) => updateEquipment(index, 'rental_unit', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Your Cost per {equipment.rental_unit}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={equipment.cost_per_unit}
                            onChange={(e) => updateEquipment(index, 'cost_per_unit', e.target.value)}
                            placeholder="0.00"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <div className="flex items-center gap-1 self-end">
                          <span className="font-bold text-lg text-red-400 mr-2">${(equipment.actual_cost || 0).toFixed(2)}</span>
                          <Button variant="ghost" size="icon" onClick={() => duplicateEquipment(index)} className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeEquipment(index)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* NEW: Overhead Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Overhead Costs</h3>
              <div className="flex gap-2">
                {serviceRates.filter(r => r.category === 'overhead').length > 0 && (
                  <Select onValueChange={(value) => addFromServiceRate(value, 'overhead')}>
                    <SelectTrigger className="w-48 border-purple-500/50 text-purple-300">
                      <SelectValue placeholder="Add from rates" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceRates.filter(r => r.category === 'overhead').map(rate => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} - ${rate.cost_per_unit}/{rate.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  onClick={addOverhead}
                  variant="outline"
                  className="border-rose-500/50 text-rose-300 hover:bg-rose-500/10"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Overhead
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {formData.overhead_items.map((overhead, index) => {
                return (
                  <Card key={index} className="border-2 border-border bg-secondary/30">
                    <div className="p-4 space-y-4">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[150px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Overhead Description</Label>
                          <Input
                            value={overhead.description}
                            onChange={(e) => updateOverhead(index, 'description', e.target.value)}
                            placeholder="e.g., Insurance, Permits, Admin Fees"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={overhead.quantity}
                            onChange={(e) => updateOverhead(index, 'quantity', e.target.value)}
                            className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                          <Select
                            value={overhead.unit}
                            onValueChange={(value) => updateOverhead(index, 'unit', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">Your Cost per {overhead.unit}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={overhead.cost_per_unit}
                            onChange={(e) => updateOverhead(index, 'cost_per_unit', e.target.value)}
                            placeholder="0.00"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <div className="flex items-center gap-1 self-end">
                          <span className="font-bold text-lg text-red-400 mr-2">${(overhead.actual_cost || 0).toFixed(2)}</span>
                          <Button variant="ghost" size="icon" onClick={() => duplicateOverhead(index)} className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeOverhead(index)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Expense Categories Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Other Direct Costs</h3>
              <Button
                type="button"
                onClick={addCustomExpenseCategory}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {formData.custom_expenses.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="border-2 border-purple-500/20 bg-purple-900/10">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-purple-300">{category.category_name}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => addCustomExpenseItem(categoryIndex)}
                        size="sm"
                        variant="outline"
                        className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Item
                      </Button>
                      <Button
                        type="button"
                        onClick={() => removeCustomExpenseCategory(categoryIndex)}
                        size="sm"
                        variant="outline"
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex flex-wrap items-end gap-4 p-3 bg-secondary/40 rounded-lg border border-border">
                      <div className="flex-1 min-w-[150px] space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateCustomExpenseItem(categoryIndex, itemIndex, 'description', e.target.value)}
                          placeholder="e.g., Crane rental, Permits"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateCustomExpenseItem(categoryIndex, itemIndex, 'quantity', e.target.value)}
                          className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onFocus={(e) => e.target.select()}
                      />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateCustomExpenseItem(categoryIndex, itemIndex, 'unit', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[120px] space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Cost per {item.unit}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.cost_per_unit}
                          onChange={(e) => updateCustomExpenseItem(categoryIndex, itemIndex, 'cost_per_unit', e.target.value)}
                          placeholder="0.00"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onFocus={(e) => e.target.select()}
                      />
                      </div>
                      <div className="flex items-center gap-2 self-end">
                        <span className="font-bold text-lg text-red-400">${(item.actual_cost || 0).toFixed(2)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomExpenseItem(categoryIndex, itemIndex)}
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {category.items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No items added to this category yet.</p>
                      <Button
                        type="button"
                        onClick={() => addCustomExpenseItem(categoryIndex)}
                        size="sm"
                        variant="outline"
                        className="mt-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add First Item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {formData.custom_expenses.length === 0 && (
              <div className="text-center py-8 bg-secondary/20 rounded-lg border-2 border-dashed border-border">
                <FolderPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No custom expense categories yet</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Add categories like "Permits", "Subcontractors", etc.
                </p>
                <Button
                  type="button"
                  onClick={addCustomExpenseCategory}
                  variant="outline"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Your First Category
                </Button>
              </div>
            )}
          </div>

          {/* Updated Pricing Summary */}
          <div className="bg-gradient-to-br from-secondary/30 to-background/30 rounded-xl p-6 space-y-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Bid Summary & Profit Analysis</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Column 1: Total Job Cost (Your Costs) */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Your Total Cost</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials Cost:</span>
                    <span className="font-medium">${totals.materials_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor Cost:</span>
                    <span className="font-medium">${totals.labor_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipment Cost:</span>
                    <span className="font-medium">${totals.equipment_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overhead Cost:</span>
                    <span className="font-medium">${totals.overhead_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Expenses:</span>
                    <span className="font-medium">${totals.custom_expenses_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-red-400">
                    <span className="font-medium">Total Job Cost:</span>
                    <span className="font-bold">${totals.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Markup Calculation (Your Profit) */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Overhead & Profit</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-muted-foreground">Markup %:</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.markup_percentage}
                      onChange={(e) => handleFormDataChange({...formData, markup_percentage: e.target.value})}
                      className="w-20 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onFocus={(e) => e.target.select()}
                  />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Markup Amount:</span>
                    <span className="font-medium">${totals.markup_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span className="font-medium">Total Profit:</span>
                    <span className="font-bold">${totals.total_profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Final Bid & Margin */}
              <div className="space-y-3">
                 <h4 className="font-medium text-foreground">Final Bid & Margin</h4>
                <div className="space-y-2">
                    <div className="bg-primary text-background rounded-lg p-3">
                        <div className="flex justify-between items-center">
                        <span className="font-medium">Total Bid Price:</span>
                        <span className="text-2xl font-bold">${totals.total_bid_amount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="bg-secondary/50 text-primary-foreground rounded-lg p-3">
                        <div className="flex justify-between items-center">
                        <span className="font-medium">Profit Margin:</span>
                        <span className="text-xl font-bold">{totals.profit_margin_percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Profit Insights */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    For every $100 you charge, you profit ${(totals.profit_margin_percentage).toFixed(0)}
                  </span>
                </div>
                <Badge
                  className={totals.profit_margin_percentage >= 30 ? 'bg-primary/90 text-primary-foreground' :
                            totals.profit_margin_percentage >= 20 ? 'bg-amber-500 text-background' :
                            'bg-destructive text-destructive-foreground'}
                  size="lg"
                >
                  {totals.profit_margin_percentage >= 30 ? 'Excellent Margin' :
                   totals.profit_margin_percentage >= 20 ? 'Good Margin' :
                   'Consider Higher Pricing'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
              Additional Notes & Terms
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFormDataChange({...formData, notes: e.target.value})}
              placeholder="Payment terms, warranties, additional conditions..."
              className="border-border focus:border-primary"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || isAutoSaving}
              className="bg-primary text-background hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {bid ? 'Save & Finish Bid' : 'Save & Finish Bid'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
