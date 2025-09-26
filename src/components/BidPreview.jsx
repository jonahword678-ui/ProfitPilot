
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Send, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function BidPreview({ bid, onClose }) {
  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Bid Preview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Send className="w-4 h-4 mr-1" />
            Send to Client
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bid Content */}
      <div className="p-8 space-y-8">
        {/* Company Header */}
        <div className="text-center border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">PROJECT PROPOSAL</h1>
          <p className="text-slate-600">Professional Services & Materials</p>
          <div className="mt-4 text-sm text-slate-500">
            Proposal Date: {format(new Date(bid.created_date), 'MMMM d, yyyy')}
            {bid.valid_until && (
              <span className="ml-4">
                Valid Until: {format(new Date(bid.valid_until), 'MMMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Project & Client Info */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Project Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Project:</span>
                <span className="ml-2 text-slate-900">{bid.project_title}</span>
              </div>
              <div className="mt-3">
                <span className="font-medium text-slate-700">Description:</span>
                <p className="mt-1 text-slate-600 leading-relaxed">{bid.project_description}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Client Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Name:</span>
                <span className="ml-2 text-slate-900">{bid.client_name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Email:</span>
                <span className="ml-2 text-slate-900">{bid.client_email}</span>
              </div>
              <div className="mt-4">
                <Badge className="bg-emerald-100 text-emerald-800">
                  Status: {bid.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Breakdown - Simplified, no costs shown */}
        {bid.materials && bid.materials.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Materials & Supplies</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Item</th>
                    <th className="text-center p-3 font-medium text-slate-700">Qty</th>
                    <th className="text-center p-3 font-medium text-slate-700">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bid.materials.map((material, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-900">{material.name}</td>
                      <td className="p-3 text-center text-slate-600">{material.quantity}</td>
                      <td className="p-3 text-center text-slate-600">{material.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Labor Breakdown - Simplified, no costs shown */}
        {bid.labor_items && bid.labor_items.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Labor & Services</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Description</th>
                    <th className="text-center p-3 font-medium text-slate-700">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bid.labor_items.map((labor, index) => (
                    <tr key={index} className="hover">
                      <td className="p-3 text-slate-900">{labor.description}</td>
                      <td className="p-3 text-center text-slate-600">{labor.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Equipment Breakdown - Simplified, no costs shown */}
        {bid.equipment_items && bid.equipment_items.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Equipment Rental</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Equipment</th>
                    <th className="text-center p-3 font-medium text-slate-700">Duration</th>
                    <th className="text-center p-3 font-medium text-slate-700">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bid.equipment_items.map((equipment, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-900">{equipment.name}</td>
                      <td className="p-3 text-center text-slate-600">{equipment.rental_duration}</td>
                      <td className="p-3 text-center text-slate-600">{equipment.rental_unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overhead Breakdown - Simplified, no costs shown */}
        {bid.overhead_items && bid.overhead_items.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Overhead Costs</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Description</th>
                    <th className="text-center p-3 font-medium text-slate-700">Quantity</th>
                    <th className="text-center p-3 font-medium text-slate-700">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bid.overhead_items.map((overhead, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-900">{overhead.description}</td>
                      <td className="p-3 text-center text-slate-600">{overhead.quantity}</td>
                      <td className="p-3 text-center text-slate-600">{overhead.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Investment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-slate-700">
              <span>Scope of Work Subtotal:</span>
              <span>${(bid.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Overhead & Profit ({bid.markup_percentage}%):</span>
              <span>${(bid.markup_amount || 0).toFixed(2)}</span>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-4 -mx-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Investment:</span>
                <span className="text-3xl font-bold">${(bid.total_bid_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {bid.notes && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Terms & Conditions</h3>
            <div className="bg-slate-50 rounded-lg p-4 text-slate-700 leading-relaxed">
              {bid.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 border-t pt-6">
          <p>Thank you for considering our proposal. We look forward to working with you!</p>
          <p className="mt-2">This proposal is valid until {bid.valid_until ? format(new Date(bid.valid_until), 'MMMM d, yyyy') : 'further notice'}.</p>
        </div>
      </div>
    </div>
  );
}
