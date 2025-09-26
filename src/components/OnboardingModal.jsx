import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, Bot, ArrowRight } from 'lucide-react';

export default function OnboardingModal({ onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white border-0 shadow-2xl">
        <DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-slate-900">
            Welcome to ProfitPilot!
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 text-base mt-2">
            Let's get your business set up. Our AI assistant will configure everything for you based on your business description.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center">
          <p className="text-slate-700">
            Click below to go to the AI Assistant and simply tell it what you do.
          </p>
        </div>
        <div className="flex justify-center">
          <Link to={createPageUrl('AIAssistant')}>
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300"
              onClick={onClose}
            >
              <Bot className="w-5 h-5 mr-3" />
              Go to AI Assistant
              <ArrowRight className="w-5 h-5 ml-3" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}