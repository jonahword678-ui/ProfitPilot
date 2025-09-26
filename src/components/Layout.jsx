

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { JobBid } from "@/api/entities"; // Added import for JobBid
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Target, 
  TrendingUp, 
  Sparkles,
  DollarSign,
  Calculator,
  FileText,
  FileImage,
  AlertTriangle,
  Award,
  Bot
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { motion, AnimatePresence } from 'framer-motion';

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "AI Assistant",
    url: createPageUrl("AIAssistant"),
    icon: Bot,
  },
  {
    title: "Service Rates",
    url: createPageUrl("ServiceRates"),
    icon: Calculator,
  },
  {
    title: "Bids",
    url: createPageUrl("Bids"), 
    icon: FileText,
  },
  {
    title: "Proposal Maker",
    url: createPageUrl("ProposalMaker"),
    icon: FileImage,
  },
  {
    title: "Invoices",
    url: createPageUrl("Invoices"),
    icon: DollarSign,
  },
  {
    title: "Goals",
    url: createPageUrl("Goals"),
    icon: Target,
  },
  {
    title: "Insights", 
    url: createPageUrl("Insights"),
    icon: TrendingUp,
  },
  {
    title: "Profit Forecast",
    url: createPageUrl("ProfitForecast"), 
    icon: DollarSign,
  },
  {
    title: "Cash Flow Alerts",
    url: createPageUrl("CashFlowAlerts"),
    icon: AlertTriangle,
  },
  {
    title: "ROI Dashboard",
    url: createPageUrl("ROIDashboard"),
    icon: Award,
  },
];

const PremiumDarkThemeStyles = () => (
  <style>{`
    :root {
      --background: 222 83% 4%;
      --foreground: 0 0% 100%;
      
      --card: 222 83% 9%;
      --card-foreground: 0 0% 100%;

      --popover: 222 83% 4%;
      --popover-foreground: 0 0% 100%;

      --primary: 147 80% 40%;
      --primary-foreground: 0 0% 100%;

      --secondary: 217 33% 17%;
      --secondary-foreground: 0 0% 100%;
      
      --muted: 217 33% 17%;
      --muted-foreground: 0 0% 75%;

      --accent: 217 33% 22%;
      --accent-foreground: 0 0% 100%;

      --destructive: 0 62.8% 50.5%;
      --destructive-foreground: 0 0% 100%;

      --border: 217 33% 17%;
      --input: 217 33% 17%;
      --ring: 147 80% 40%;

      --radius: 0.75rem;

      /* Updated sidebar colors for metallic silver/gray background with black text */
      --sidebar-bg: 0 0% 75%; /* Metallic silver background */
      --sidebar-border: 0 0% 65%; /* Slightly darker silver for borders */
      --sidebar-text: 0 0% 0%; /* Black text */
      --sidebar-text-muted: 0 0% 30%; /* Dark gray for muted text */
      --sidebar-hover: 0 0% 70%; /* Darker silver for hover */
      --sidebar-active: 0 0% 0%; /* Black for active state */
    }
    
    body {
      color-scheme: dark;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      min-height: 100vh;
    }
    
    /* Force white text on main content */
    .main-content * {
      color: hsl(0 0% 100%) !important;
    }
    
    .main-content h1, 
    .main-content h2, 
    .main-content h3, 
    .main-content h4, 
    .main-content h5, 
    .main-content h6 {
      color: hsl(0 0% 100%) !important;
    }
    
    .main-content p,
    .main-content span,
    .main-content div {
      color: hsl(0 0% 100%) !important;
    }
    
    /* Muted text should still be visible but slightly dimmed */
    .main-content .text-muted-foreground {
      color: hsl(0 0% 75%) !important;
    }
    
    /* Subtle background pattern */
    .financial-bg::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(circle at 20% 80%, hsla(0, 0%, 75%, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, hsla(0, 0%, 75%, 0.05) 0%, transparent 50%);
      pointer-events: none;
      z-index: -1;
    }
    
    /* Subtle grid overlay */
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(hsla(0, 0%, 75%, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, hsla(0, 0%, 75%, 0.03) 1px, transparent 1px);
      background-size: 75px 75px;
      pointer-events: none;
      z-index: -1;
    }
    
    /* Subtle chart animations */
    @keyframes chartPulse {
      0%, 100% { opacity: 0.03; }
      50% { opacity: 0.06; }
    }
    
    .chart-bg {
      position: fixed;
      top: 10%;
      right: -10%;
      width: 400px;
      height: 300px;
      background: linear-gradient(45deg, 
        hsla(0, 0%, 75%, 0.05) 0%,
        hsla(0, 0%, 75%, 0.01) 50%,
        transparent 100%);
      transform: rotate(-15deg);
      border-radius: 20px;
      animation: chartPulse 8s infinite;
      pointer-events: none;
      z-index: -1;
    }
    
    .chart-bg-2 {
      position: fixed;
      bottom: 5%;
      left: -5%;
      width: 350px;
      height: 250px;
      background: linear-gradient(-45deg, 
        hsla(0, 0%, 75%, 0.04) 0%,
        hsla(0, 0%, 75%, 0.01) 50%,
        transparent 100%);
      transform: rotate(12deg);
      border-radius: 20px;
      animation: chartPulse 10s infinite reverse;
      pointer-events: none;
      z-index: -1;
    }
    
    /* Add metallic shine effect to sidebar */
    .sidebar-metallic {
      background: linear-gradient(135deg, 
        hsl(0, 0%, 78%) 0%,
        hsl(0, 0%, 75%) 25%,
        hsl(0, 0%, 72%) 50%,
        hsl(0, 0%, 75%) 75%,
        hsl(0, 0%, 78%) 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 
                  inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    }
  `}</style>
);

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState({ avgMargin: 0, activeBids: 0 }); // New state
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true); // New state

  useEffect(() => {
    const fetchUserAndMetrics = async () => { // Combined function
      setIsLoadingUser(true);
      setIsLoadingMetrics(true); // Set loading for metrics
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (user && user.email) {
          const bidsData = await JobBid.filter({ created_by: user.email });
          
          const acceptedBids = bidsData.filter(b => b.status === 'accepted');
          const avgMargin = acceptedBids.length > 0 
            ? acceptedBids.reduce((sum, bid) => sum + (bid.profit_margin_percentage || 0), 0) / acceptedBids.length 
            : 0;

          const activeBids = bidsData.filter(b => b.status === 'draft' || b.status === 'sent').length;

          setPerformanceMetrics({ avgMargin, activeBids });
        } else {
            setPerformanceMetrics({ avgMargin: 0, activeBids: 0 });
        }
      } catch (e) {
        setCurrentUser(null);
        setPerformanceMetrics({ avgMargin: 0, activeBids: 0 }); // Set defaults on error
      } finally {
        setIsLoadingUser(false);
        setIsLoadingMetrics(false); // Unset loading for metrics
      }
    };
    fetchUserAndMetrics();
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };
  
  const currentPage = navigationItems.find(item => item.url === location.pathname);
  const currentPageTitle = currentPage ? currentPage.title : 'Dashboard';

  return (
    <SidebarProvider>
      <PremiumDarkThemeStyles />
      <div className="min-h-screen flex w-full bg-background text-foreground financial-bg">
        {/* Background elements */}
        <div className="grid-overlay" />
        <div className="chart-bg" />
        <div className="chart-bg-2" />
        
        <Sidebar className="border-r sidebar-metallic" style={{ 
          borderColor: 'hsl(var(--sidebar-border))'
        }}>
          <SidebarHeader className="border-b p-6" style={{ 
            borderColor: 'hsl(var(--sidebar-border))',
            backgroundColor: 'transparent'
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'hsl(var(--sidebar-text))' }}>ProfitPilot</h2>
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>Premium Intelligence</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3" style={{ backgroundColor: 'transparent' }}>
            <div className="px-3 mb-4">
              {isLoadingUser ? (
                <div className="p-3 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                    <div>
                      <div className="h-4 w-24 rounded mb-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                      <div className="h-3 w-16 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                    </div>
                  </div>
                </div>
              ) : currentUser ? (
                <Link to={createPageUrl("Profile")} className="block group">
                  <div className="p-3 rounded-xl shadow-lg group-hover:scale-[1.02] transition-all duration-300 border" 
                       style={{ 
                         backgroundColor: 'rgba(0,0,0,0.1)', 
                         borderColor: 'rgba(0,0,0,0.2)'
                       }}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 border-2 rounded-full bg-black flex items-center justify-center overflow-hidden"
                           style={{ 
                             borderColor: 'hsl(var(--sidebar-text))'
                           }}>
                        {currentUser.profile_picture_url ? (
                          <img 
                            src={currentUser.profile_picture_url} 
                            alt={currentUser.full_name || 'Profile'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: 'hsl(var(--sidebar-text))' }}>{currentUser.full_name || 'Elite User'}</h3>
                        <p className="text-sm" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>Elite Member</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link to={createPageUrl("Profile")} className="block group">
                  <div className="p-3 rounded-xl shadow-lg group-hover:scale-[1.02] transition-all duration-300 border"
                       style={{ 
                         backgroundColor: 'rgba(0,0,0,0.1)', 
                         borderColor: 'rgba(0,0,0,0.2)'
                       }}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 border-2 rounded-full bg-black flex items-center justify-center"
                           style={{ 
                             borderColor: 'hsl(var(--sidebar-text))'
                           }}>
                        <span className="text-white font-bold">U</span>
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: 'hsl(var(--sidebar-text))' }}>Elite User</h3>
                        <p className="text-sm" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>Premium Access</p>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
                                 style={{ color: 'hsl(var(--sidebar-text-muted))' }}>
                Executive Tools
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url 
                            ? 'shadow-lg' 
                            : ''
                        }`}
                        style={{
                          backgroundColor: location.pathname === item.url 
                            ? 'hsl(var(--sidebar-active))' 
                            : 'transparent',
                          color: location.pathname === item.url 
                            ? 'white' 
                            : 'hsl(var(--sidebar-text))',
                        }}
                        onMouseEnter={(e) => {
                          if (location.pathname !== item.url) {
                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (location.pathname !== item.url) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <Link 
                          to={item.url} 
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
                                 style={{ color: 'hsl(var(--sidebar-text-muted))' }}>
                Performance Metrics
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {isLoadingMetrics ? (
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3 text-sm animate-pulse">
                      <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                      <div>
                        <div className="h-3 w-16 rounded mb-1" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                        <div className="h-4 w-8 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm animate-pulse">
                      <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                      <div>
                        <div className="h-3 w-16 rounded mb-1" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                        <div className="h-4 w-8 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                           style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                        <DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-text))' }} />
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>Avg Margin</p>
                        <p className="font-bold" style={{ color: 'hsl(var(--sidebar-text))' }}>{performanceMetrics.avgMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                           style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                        <FileText className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-text))' }} />
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'hsl(var(--sidebar-text-muted))' }}>Active Bids</p>
                        <p className="font-bold" style={{ color: 'hsl(var(--sidebar-text))' }}>{performanceMetrics.activeBids}</p>
                      </div>
                    </div>
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-3" style={{ 
            borderColor: 'hsl(var(--sidebar-border))',
            backgroundColor: 'transparent'
          }}>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          <header className="border-b px-6 py-3 flex items-center justify-between sticky top-0 z-30"
                  style={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    backdropFilter: 'blur(12px)'
                  }}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent/50 p-2 rounded-lg transition-colors duration-200 md:hidden" />
              <h1 className="text-xl font-bold text-white">{currentPageTitle}</h1>
            </div>
            
            {isLoadingUser ? (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center border border-primary/30 overflow-hidden">
                {currentUser?.profile_picture_url ? (
                  <img 
                    src={currentUser.profile_picture_url} 
                    alt={currentUser.full_name || 'Profile'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-bold">
                    {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto main-content" style={{ backgroundColor: 'hsl(var(--background))' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ 
                  duration: 0.15,
                  ease: "easeInOut"
                }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

