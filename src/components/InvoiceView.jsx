
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";

export default function InvoiceView({ invoice, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col border border-border shadow-2xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b border-border">
        <CardTitle>Invoice #{invoice.invoice_number}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8 overflow-auto" id="invoice-printable-area">
        <style>
          {`@media print {
              body * { visibility: hidden; }
              #invoice-printable-area, #invoice-printable-area * { visibility: visible; }
              #invoice-printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          }`}
        </style>
        <div className="space-y-8">
          <div className="flex justify-between items-start">
            <div>
              {invoice.company_logo_url && (
                <img src={invoice.company_logo_url} alt={`${invoice.company_name || 'Company'} Logo`} className="h-16 max-w-[200px] object-contain mb-4 bg-white p-2 rounded-lg" />
              )}
              <h1 className="text-3xl font-bold text-foreground">INVOICE</h1>
              <p className="text-muted-foreground">Invoice Number: {invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold text-foreground">{invoice.company_name || ''}</h2>
              {invoice.company_address && <p className="text-sm text-muted-foreground">{invoice.company_address}</p>}
              {invoice.company_email && <p className="text-sm text-muted-foreground">{invoice.company_email}</p>}
              {invoice.company_phone && <p className="text-sm text-muted-foreground">{invoice.company_phone}</p>}
              {invoice.company_website && (
                <a href={invoice.company_website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  {invoice.company_website}
                </a>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
            <div>
              <h4 className="font-semibold text-foreground/80">Billed To</h4>
              <p className="text-foreground">{invoice.client_name}</p>
              <p className="text-foreground">{invoice.client_email}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground/80">Issue Date</h4>
              <p className="text-foreground">{format(new Date(invoice.issue_date), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground/80">Due Date</h4>
              <p className="text-foreground">{format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>
            </div>
          </div>

          <div>
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground/80">Description</th>
                  <th className="text-right p-3 font-medium text-foreground/80">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.line_items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-3 text-foreground">{item.description}</td>
                    <td className="p-3 text-right text-foreground">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">${invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({invoice.tax_rate}%):</span>
                <span className="font-medium text-foreground">${invoice.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-3 bg-primary text-primary-foreground rounded-lg">
                <span className="text-lg font-bold">Amount Due:</span>
                <span className="text-lg font-bold">${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h4 className="font-semibold text-foreground/80">Notes</h4>
              <p className="text-sm text-muted-foreground mt-2 p-3 bg-secondary/50 rounded-lg">{invoice.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
