import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Goals from "./Goals";

import Insights from "./Insights";

import Bids from "./Bids";

import ServiceRates from "./ServiceRates";

import ProposalMaker from "./ProposalMaker";

import ProfitForecast from "./ProfitForecast";

import CashFlowAlerts from "./CashFlowAlerts";

import ROIDashboard from "./ROIDashboard";

import Profile from "./Profile";

import Invoices from "./Invoices";

import AIAssistant from "./AIAssistant";

import ViewProposal from "./ViewProposal";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Goals: Goals,
    
    Insights: Insights,
    
    Bids: Bids,
    
    ServiceRates: ServiceRates,
    
    ProposalMaker: ProposalMaker,
    
    ProfitForecast: ProfitForecast,
    
    CashFlowAlerts: CashFlowAlerts,
    
    ROIDashboard: ROIDashboard,
    
    Profile: Profile,
    
    Invoices: Invoices,
    
    AIAssistant: AIAssistant,
    
    ViewProposal: ViewProposal,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Goals" element={<Goals />} />
                
                <Route path="/Insights" element={<Insights />} />
                
                <Route path="/Bids" element={<Bids />} />
                
                <Route path="/ServiceRates" element={<ServiceRates />} />
                
                <Route path="/ProposalMaker" element={<ProposalMaker />} />
                
                <Route path="/ProfitForecast" element={<ProfitForecast />} />
                
                <Route path="/CashFlowAlerts" element={<CashFlowAlerts />} />
                
                <Route path="/ROIDashboard" element={<ROIDashboard />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Invoices" element={<Invoices />} />
                
                <Route path="/AIAssistant" element={<AIAssistant />} />
                
                <Route path="/ViewProposal" element={<ViewProposal />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}