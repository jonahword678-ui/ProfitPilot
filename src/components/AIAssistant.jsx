
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/api/entities';
import { ServiceRate } from '@/api/entities';
import { JobBid } from '@/api/entities';
import { IncomeGoal } from '@/api/entities';
import { ChatHistory } from '@/api/entities'; // New import
import { InvokeLLM } from '@/api/integrations';
import { Bot, User as UserIcon, Loader2, Sparkles, Send, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from "framer-motion";
import { addMonths } from 'date-fns';

const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
          <Bot className="w-5 h-5 text-background" />
        </div>
      )}
      <div
        className={`px-4 py-3 rounded-2xl max-w-lg ${
          isUser
            ? 'bg-primary text-background rounded-br-none'
            : 'bg-secondary text-secondary-foreground rounded-bl-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};

export default function AIAssistant() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [sessionId, setSessionId] = useState(null); // New state for session ID
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const user = await User.me();
      setCurrentUser(user);
      
      // Generate or get session ID - using timestamp for a simple session ID
      const currentSessionId = Date.now().toString();
      setSessionId(currentSessionId);
      
      // Load existing chat history
      await loadChatHistory(user);
      
      if (user.has_completed_onboarding) {
        setOnboardingComplete(true);
        // Only add welcome message if no existing chat history was found in the database for this user
        // Refined check: check if there are any existing messages for this user in the database
        const existingMessages = await ChatHistory.filter({ created_by: user.email }, '-created_date', 1);
        if (existingMessages.length === 0) {
          const welcomeMessage = {
            message: "Welcome back. What strategic objective can I help you accomplish?",
            isUser: false,
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, welcomeMessage]);
          await saveChatMessage(welcomeMessage, user.email, currentSessionId);
        }
      } else {
        // If user has not completed onboarding, always show the initial onboarding message
        const welcomeMessage = {
          message: "Hi. Welcome to ProfitPilot. To get started, describe your business in detail. I will build your entire system based on your description.",
          isUser: false,
          timestamp: new Date().toISOString()
        };
        // Overwrite any potentially loaded history to ensure onboarding prompt is always present
        setChatHistory([welcomeMessage]); 
        await saveChatMessage(welcomeMessage, user.email, currentSessionId);
      }
    };
    init();
  }, []);

  const loadChatHistory = async (user) => {
    try {
      // Load last 100 messages for the current user, sorted by date descending then reversed for display order
      const messages = await ChatHistory.filter({ created_by: user.email }, '-created_date', 100); 
      const formattedMessages = messages.reverse().map(msg => ({
        message: msg.message,
        isUser: msg.is_user, // Use is_user from DB, map to isUser for component state
        timestamp: msg.timestamp
      }));
      setChatHistory(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatHistory([]); // Ensure chatHistory is an empty array on error
    }
  };

  const saveChatMessage = async (messageObj, userEmail, currentSessionId) => {
    try {
      await ChatHistory.create({
        message: messageObj.message,
        is_user: messageObj.isUser, // Save isUser from state as is_user in DB
        timestamp: messageObj.timestamp || new Date().toISOString(),
        session_id: currentSessionId,
        created_by: userEmail
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [userInput]);

  const handleSendMessage = async (e) => { // Added 'e' parameter
    e.preventDefault(); // Added to prevent default form submission behavior if any
    
    if (!userInput.trim() || isLoading) return;

    const newUserMessage = { 
      message: userInput.trim(), // Trim userInput
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);
    await saveChatMessage(newUserMessage, currentUser.email, sessionId);
    
    setUserInput('');
    setIsLoading(true);

    try {
      if (!onboardingComplete) {
        // --- Existing Onboarding Logic ---
        const setupResult = await InvokeLLM({
          prompt: `A business owner described their operation: "${newUserMessage.message}"

Based on this description, I need you to create a complete business setup including:

1. SERVICE RATES: Extract detailed service rates with realistic costs and pricing for this industry. Use "sq ft" as the default unit for most materials and services unless the business specifically requires other units like "hour" for labor or "each" for individual items.

IMPORTANT: ALWAYS include a general "Labor" service rate with unit "hour" for basic worker hourly costs that applies to any business. This should be in addition to any specialized labor services for the specific industry.

2. INCOME GOALS: Suggest appropriate monthly/yearly income targets.

Provide comprehensive data. Make all numbers realistic for the industry described. If they mentioned specific costs, use those as a baseline. Default to square feet (sq ft) for area-based pricing unless another unit makes more sense for the specific service.

For the general Labor rate, use realistic hourly costs for that industry (what you pay workers) and realistic hourly charges (what you charge customers).`,
          response_json_schema: {
            type: "object",
            properties: {
              business_type: { type: "string" },
              service_rates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    category: { type: "string", enum: ["materials", "labor", "equipment", "overhead"] },
                    unit: { type: "string" },
                    cost_per_unit: { type: "number" },
                    charge_per_unit: { type: "number" },
                    description: { type: "string" }
                  }
                }
              },
              income_goals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    target_amount: { type: "number" },
                    target_period: { type: "string", enum: ["monthly", "quarterly", "yearly"] },
                    strategy_notes: { type: "string" }
                  }
                }
              },
              setup_summary: { type: "string" }
            }
          }
        });

        // Clear existing data first
        try {
          const [existingRates, existingBids, existingGoals] = await Promise.all([
            ServiceRate.list(),
            JobBid.list(),
            IncomeGoal.list()
          ]);
          
          await Promise.all([
            ...existingRates.map(rate => ServiceRate.delete(rate.id)),
            ...existingBids.map(bid => JobBid.delete(bid.id)), 
            ...existingGoals.map(goal => IncomeGoal.delete(goal.id))
          ]);
        } catch (clearError) {
          console.log("Note: Some existing data couldn't be cleared, but that's okay for new users.", clearError);
        }

        // Create service rates one by one to handle any individual failures
        if (setupResult.service_rates && setupResult.service_rates.length > 0) {
          const successfulRates = [];
          for (const rate of setupResult.service_rates) {
            try {
              const rateData = {
                ...rate,
                profit_margin: ((rate.charge_per_unit - rate.cost_per_unit) / rate.charge_per_unit) * 100,
                created_by: currentUser.email
              };
              await ServiceRate.create(rateData);
              successfulRates.push(rate.name);
            } catch (rateError) {
              console.error(`Failed to create rate: ${rate.name}`, rateError);
            }
          }
          console.log(`Successfully created ${successfulRates.length} service rates`);
        }

        // Create income goals one by one
        if (setupResult.income_goals && setupResult.income_goals.length > 0) {
          const successfulGoals = [];
          for (const goal of setupResult.income_goals) {
            try {
              const goalData = {
                ...goal,
                deadline: addMonths(new Date(), goal.target_period === 'monthly' ? 1 : goal.target_period === 'quarterly' ? 3 : 12).toISOString(),
                is_active: true,
                current_progress: 0,
                created_by: currentUser.email
              };
              await IncomeGoal.create(goalData);
              successfulGoals.push(goal.title);
            } catch (goalError) {
              console.error(`Failed to create goal: ${goal.title}`, goalError);
            }
          }
          console.log(`Successfully created ${successfulGoals.length} income goals`);
        }

        await User.updateMyUserData({ has_completed_onboarding: true });

        const successMessage = { 
          message: `System built successfully! ${setupResult.setup_summary}

Your business is now fully operational in ProfitPilot.`, 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, successMessage]);
        await saveChatMessage(successMessage, currentUser.email, sessionId);
        setOnboardingComplete(true);

        // --- Add Automatic Usage Guide After Setup (unconditional) ---
        setTimeout(async () => {
          const usageGuide = {
            message: `🎉 **Your ProfitPilot system is now ready to use!** Here's your complete guide to get started:

**📊 Service Rates**
Your website should already be built with common service rates for your business. Review your Service Rates page to make sure everything you need is there. If you need to add a service rate: press "Add Rate", fill out the criteria (name, cost per unit, what you charge per unit), scroll down and press "Save Rate". These will be available for quick bidding.

**📋 Bids** 
To create a new bid: click "Bids", then "New Bid". Fill out the project details and client information. Scroll down to the pricing section - all the service rates you've saved will be right there in the drop-down menus, so you can quickly pick whatever services you need to build your bid. This makes bidding fast and accurate.

**📄 Proposal Maker**
To create a professional proposal: First, fill out your company information on the left side (business name, address, phone, email, logo). Then select a bid to make a proposal from. Click "Generate AI Proposal" and the system will create a beautiful, client-ready proposal. You can edit it if needed, then send it directly to your client with a shareable link.

**💰 Invoices**
After your proposal is accepted, you can instantly create an invoice by clicking "Create Invoice" right from the Proposal Maker page. This pulls all the bid details automatically. You can then view all your invoices, print them, or save them as PDFs for your records.

**🎯 Goals**
Set income targets (monthly, quarterly, yearly) to track your business growth. The system automatically calculates your progress based on accepted bids and helps you stay on track.

**📈 Insights** 
Get AI-powered analysis of your bidding performance, win rates, and profit margins. Receive specific recommendations to improve your bidding strategy and increase profitability.

**💵 Profit Forecast**
See projected income based on your current bids and historical performance. Plan ahead and make informed business decisions.

**⚠️ Cash Flow Alerts**
Get notified about upcoming payment due dates, overdue invoices, and cash flow issues before they become problems.

**🏆 ROI Dashboard**
Track your return on investment across different types of projects and clients to focus on the most profitable work.

You're all set! Start with reviewing your Service Rates, then create your first bid. The system is designed to make everything flow together seamlessly. 🚀`,
            isUser: false,
            timestamp: new Date().toISOString()
          };
          
          setChatHistory(prev => [...prev, usageGuide]);
          await saveChatMessage(usageGuide, currentUser.email, sessionId);
        }, 2000); // Send after 2 second delay

      } else {
        // --- General Chat Logic (Modified to new prompt and conditional guide) ---
        const aiResponse = await InvokeLLM({
          prompt: `You are an AI assistant for ProfitPilot, a contractor/service business management platform. The user is asking: "${newUserMessage.message}"

Context: This platform helps contractors and service businesses with:
- Service rate management (pricing per unit)
- Job bidding and proposals 
- Invoice creation
- Goal tracking
- Business insights and profit forecasting
- ROI analysis

Please provide helpful, specific advice. If the user is describing their business for the first time or asking for setup help, be comprehensive in your response and let them know you can help set up their service rates and business information.

Be conversational, helpful, and focus on practical business advice.`,
          add_context_from_internet: true
        });

        const assistantMessage = { 
          message: aiResponse, 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
        await saveChatMessage(assistantMessage, currentUser.email, sessionId);

        // Check if this looks like a business setup conversation and send usage guide (conditional)
        if (newUserMessage.message.toLowerCase().includes('business') || 
            newUserMessage.message.toLowerCase().includes('contractor') ||
            newUserMessage.message.toLowerCase().includes('service') ||
            newUserMessage.message.toLowerCase().includes('work') ||
            newUserMessage.message.toLowerCase().includes('company')) {
          
          // Send the comprehensive usage guide
          setTimeout(async () => {
            const usageGuide = {
              message: `🎉 **Your ProfitPilot system is now ready to use!** Here's your complete guide to get started:

**📊 Service Rates**
Your website should already be built with common service rates for your business. Review your Service Rates page to make sure everything you need is there. If you need to add a service rate: press "Add Rate", fill out the criteria (name, cost per unit, what you charge per unit), scroll down and press "Save Rate". These will be available for quick bidding.

**📋 Bids** 
To create a new bid: click "Bids", then "New Bid". Fill out the project details and client information. Scroll down to the pricing section - all the service rates you've saved will be right there in the drop-down menus, so you can quickly pick whatever services you need to build your bid. This makes bidding fast and accurate.

**📄 Proposal Maker**
To create a professional proposal: First, fill out your company information on the left side (business name, address, phone, email, logo). Then select a bid to make a proposal from. Click "Generate AI Proposal" and the system will create a beautiful, client-ready proposal. You can edit it if needed, then send it directly to your client with a shareable link.

**💰 Invoices**
After your proposal is accepted, you can instantly create an invoice by clicking "Create Invoice" right from the Proposal Maker page. This pulls all the bid details automatically. You can then view all your invoices, print them, or save them as PDFs for your records.

**🎯 Goals**
Set income targets (monthly, quarterly, yearly) to track your business growth. The system automatically calculates your progress based on accepted bids and helps you stay on track.

**📈 Insights** 
Get AI-powered analysis of your bidding performance, win rates, and profit margins. Receive specific recommendations to improve your bidding strategy and increase profitability.

**💵 Profit Forecast**
See projected income based on your current bids and historical performance. Plan ahead and make informed business decisions.

**⚠️ Cash Flow Alerts**
Get notified about upcoming payment due dates, overdue invoices, and cash flow issues before they become problems.

**🏆 ROI Dashboard**
Track your return on investment across different types of projects and clients to focus on the most profitable work.

You're all set! Start with reviewing your Service Rates, then create your first bid. The system is designed to make everything flow together seamlessly. 🚀`,
              isUser: false,
              timestamp: new Date().toISOString()
            };
            
            setChatHistory(prev => [...prev, usageGuide]);
            await saveChatMessage(usageGuide, currentUser.email, sessionId);
          }, 2000); // Send after 2 second delay
        }
      }
    } catch (error) {
      console.error("Error with AI Assistant:", error);
      const errorMessage = { 
        message: "System error. Rephrase your request and try again.", 
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      await saveChatMessage(errorMessage, currentUser.email, sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e); // Pass the event object to handleSendMessage
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-xl m-4 border border-border">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <AnimatePresence>
          {chatHistory.map((chat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChatMessage message={chat.message} isUser={chat.isUser} />
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
                <Bot className="w-5 h-5 text-background" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 md:p-6 bg-card/80 backdrop-blur-sm border-t border-border rounded-b-xl">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your business or ask for an analysis..."
            className="w-full pr-12 resize-none bg-secondary border-border focus:ring-primary"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="absolute right-2 bottom-2 bg-primary hover:bg-primary/90"
          >
            <ArrowUp className="w-5 h-5 text-background" />
          </Button>
        </div>
      </div>
    </div>
  );
}
