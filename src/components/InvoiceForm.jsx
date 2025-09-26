
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { X, Plus, Trash2, Save, Loader2, DollarSign } from 'lucide-react';
import { motion } from "framer-motion";

export default function InvoiceForm({ invoice, onSave, onCancel, isProcessing }) {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    setFormData(
      invoice
        ? { ...invoice }
        : {
            client_name: "",
            client_email: "",
            project_title: "",
            line_items: [{ description: "", amount: 0 }],
            notes: "",
            tax_rate: 0,
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
          }
    );
  }, [invoice]);

  useEffect(() => {
    if (!formData) return;
    const subtotal = formData.line_items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const tax_rate = Number(formData.tax_rate) || 0;
    const tax_amount = subtotal * (tax_rate / 100);
    const total_amount = subtotal + tax_amount;
    setFormData(prev => ({ ...prev, subtotal, tax_amount, total_amount }));
  }, [formData?.line_items, formData?.tax_rate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...formData.line_items];
    updatedLineItems[index][field] = value;
    setFormData(prev => ({ ...prev, line_items: updatedLineItems }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", amount: "" }],
    }));
  };

  const removeLineItem = (index) => {
    const updatedLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, line_items: updatedLineItems }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!formData) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <form onSubmit={handleSubmit}>
        <Card className="border border-border shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-foreground">Edit Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input id="client_name" name="client_name" value={formData.client_name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Client Email</Label>
                <Input id="client_email" name="client_email" type="email" value={formData.client_email} onChange={handleInputChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_title">Project Title</Label>
              <Input id="project_title" name="project_title" value={formData.project_title} onChange={handleInputChange} />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Line Items</h3>
              {formData.line_items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    className="flex-grow"
                  />
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                      className="w-32 pl-7"
                    />
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeLineItem(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input id="tax_rate" name="tax_rate" type="number" step="0.1" value={formData.tax_rate} onChange={handleInputChange} />
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                    <div className="flex justify-between font-medium"><span>Subtotal:</span><span>${formData.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tax:</span><span>${formData.tax_amount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 border-border"><span>Total:</span><span>${formData.total_amount.toFixed(2)}</span></div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Payment terms, thank you message, etc." />
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Invoice
            </Button>
          </CardFooter>
        </Card>
      </form>
    </motion.div>
  );
}
