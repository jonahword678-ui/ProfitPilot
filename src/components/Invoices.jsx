
import React, { useState, useEffect } from "react";
import { Invoice } from "@/api/entities";
import { User } from "@/api/entities"; // Added User import
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle }
from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSignature, CheckCircle, Clock, AlertTriangle, Plus, Eye, DollarSign, Trash2, Pencil, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import InvoiceView from "../components/invoices/InvoiceView";
import InvoiceForm from "../components/invoices/InvoiceForm";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me(); // Fetch current user
      // Filter invoices by the current user's email as 'created_by'
      const data = await Invoice.filter({ created_by: currentUser.email }, '-created_date');
      setInvoices(data);
    } catch (error) {
      console.error("Error loading invoices:", error);
      // Optionally handle specific errors, e.g., user not logged in
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleSaveInvoice = async (invoiceData) => {
    setIsProcessing(true);
    try {
      // Ensure all amounts are numbers
      const cleanedData = {
        ...invoiceData,
        line_items: invoiceData.line_items.map(item => ({
          ...item,
          amount: Number(item.amount) || 0
        }))
      };

      // Removed manual 'created_by' here as well for consistency and correctness.
      if (invoiceData.id) {
        await Invoice.update(invoiceData.id, cleanedData);
      } else {
        await Invoice.create(cleanedData);
      }
      setShowForm(false);
      setEditingInvoice(null);
      await loadInvoices();
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to save invoice.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    setIsProcessing(true);
    try {
      await Invoice.update(invoiceId, { status: 'paid' });
      await loadInvoices();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      alert("Failed to mark invoice as paid.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnmarkAsPaid = async (invoiceId) => {
    setIsProcessing(true);
    try {
      // Revert to draft status, as it's the most neutral state.
      await Invoice.update(invoiceId, { status: 'draft' });
      await loadInvoices();
    } catch (error) {
      console.error("Error unmarking invoice as paid:", error);
      alert("Failed to unmark invoice.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (invoiceId) => {
    if (window.confirm("Are you sure you want to permanently delete this invoice? This action cannot be undone.")) {
      try {
        await Invoice.delete(invoiceId);
        await loadInvoices(); // Refresh the list
      } catch (error) {
        console.error("Error deleting invoice:", error);
        alert("Failed to delete invoice. Please try again.");
      }
    }
  };

  const getStatusProps = (status) => {
    switch (status) {
      case 'paid':
        return { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle };
      case 'sent':
        return { color: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'overdue':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      default: // draft
        return { color: 'bg-gray-100 text-gray-800', icon: FileSignature };
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading Invoices...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Invoices</h1>
          <p className="text-muted-foreground">Manage and track your client invoices.</p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => { setShowForm(false); setEditingInvoice(null); }}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <InvoiceForm
                invoice={editingInvoice}
                onSave={handleSaveInvoice}
                onCancel={() => {
                  setShowForm(false);
                  setEditingInvoice(null);
                }}
                isProcessing={isProcessing}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setViewingInvoice(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <InvoiceView invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {invoices.length === 0 ? (
        <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="text-center py-16">
                <FileSignature className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No invoices created yet</h3>
                <p className="text-muted-foreground">
                    Create an invoice from an accepted proposal to get started.
                </p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {invoices.map((invoice) => {
            const statusProps = getStatusProps(invoice.status);
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                  <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="text-primary font-bold text-lg">#{invoice.invoice_number}</div>
                        <Badge className={statusProps.color}>
                          <statusProps.icon className="w-3 h-3 mr-1" />
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground mt-2">{invoice.project_title}</p>
                      <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-2">
                       <div className="text-2xl font-bold text-foreground">${(invoice.total_amount || 0).toLocaleString()}</div>
                       <p className="text-sm text-muted-foreground">Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-none flex-wrap">
                       <Button variant="outline" size="sm" onClick={() => setViewingInvoice(invoice)}>
                         <Eye className="w-4 h-4 mr-1" /> View
                       </Button>
                       <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                         <Pencil className="w-4 h-4 mr-1" /> Edit
                       </Button>
                       {invoice.status === 'paid' ? (
                         <Button size="sm" variant="outline" onClick={() => handleUnmarkAsPaid(invoice.id)} disabled={isProcessing}>
                           <Undo2 className="w-4 h-4 mr-1" /> Unmark as Paid
                         </Button>
                       ) : (
                         <Button size="sm" onClick={() => handleMarkAsPaid(invoice.id)} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                           <DollarSign className="w-4 h-4 mr-1" /> Mark as Paid
                         </Button>
                       )}
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => handleDelete(invoice.id)}
                       >
                         <Trash2 className="w-4 h-4 mr-1" />
                         Delete
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
