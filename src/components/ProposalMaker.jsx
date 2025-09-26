
import React, { useState, useEffect, useRef } from "react";
import { JobBid } from "@/api/entities";
import { Invoice } from "@/api/entities";
import { User } from "@/api/entities";
import { GenerateImage, InvokeLLM, UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Image, Upload, Download, Send, FileSignature, Pencil, Save, CheckCircle2, Phone, ExternalLink, ClipboardCopy, Check, Loader2, Info } from "lucide-react";
import { addDays } from "date-fns";
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";


const formatPhoneNumber = (value) => {
  if (!value) return "";
  const phoneNumber = value.replace(/[^\d]/g, "");
  const tenDigitNumber = phoneNumber.slice(0, 10);
  const { length } = tenDigitNumber;

  if (length < 4) return tenDigitNumber;
  if (length < 7) {
    return `(${tenDigitNumber.slice(0, 3)}) ${tenDigitNumber.slice(3)}`;
  }
  return `(${tenDigitNumber.slice(0, 3)}) ${tenDigitNumber.slice(3, 6)}-${tenDigitNumber.slice(6, 10)}`;
};

export default function ProposalMaker() {
  const [bids, setBids] = useState([]);
  const [selectedBid, setSelectedBid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false); // New state for copy feedback
  const [sendOptions, setSendOptions] = useState({
    method: 'link', // Changed default method to 'link'
    subject: '', // Kept for now, though not used in new UI
    message: '' // Kept for now, though not used in new UI
  });

  const [generatedProposalHtml, setGeneratedProposalHtml] = useState(null);

  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: ''
  });

  // New state for editing proposal content
  const [editableContent, setEditableContent] = useState({
    executive_summary: '',
    scope_of_work: '',
    timeline: '',
    payment_schedule: '',
    terms_and_conditions: '',
    closing_statement: ''
  });

  useEffect(() => {
    loadBids();
    loadUserBusinessInfo();
    loadSavedProposalState();

    // Add beforeunload event listener to save state when leaving
    const handleBeforeUnload = () => {
      saveProposalState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveProposalState(); // Save when component unmounts
    };
  }, []);

  // Auto-save whenever important state changes
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      saveProposalState();
    }, 2000); // Auto-save after 2 seconds of no changes

    return () => clearTimeout(autoSaveTimer);
  }, [selectedBid, companyInfo, generatedProposalHtml, editableContent]);

  const saveProposalState = () => {
    try {
      const proposalState = {
        selectedBidId: selectedBid?.id || null,
        companyInfo,
        generatedProposalHtml,
        editableContent, // Save editable content
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('proposalMaker_savedState', JSON.stringify(proposalState));
    } catch (error) {
      console.error('Error saving proposal state:', error);
    }
  };

  const loadSavedProposalState = () => {
    try {
      const savedState = localStorage.getItem('proposalMaker_savedState');
      if (savedState) {
        const parsed = JSON.parse(savedState);

        // Only restore if it's recent (within last 24 hours)
        const saveTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now - saveTime) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          if (parsed.generatedProposalHtml) {
            setGeneratedProposalHtml(parsed.generatedProposalHtml);
          }
          if (parsed.editableContent) {
            setEditableContent(parsed.editableContent);
          }

          // Selected bid will be restored after bids are loaded
          if (parsed.selectedBidId) {
            // We'll restore this in loadBids function
            window.proposalMaker_restoreBidId = parsed.selectedBidId;
          }
        } else {
          // Clear old saved state
          localStorage.removeItem('proposalMaker_savedState');
        }
      }
    } catch (error) {
      console.error('Error loading saved proposal state:', error);
    }
  };

  const loadBids = async () => {
    try {
      const currentUser = await User.me();
      const data = await JobBid.filter({ created_by: currentUser.email }, '-updated_date');
      const filteredBids = data.filter(bid => bid.status !== 'rejected');
      setBids(filteredBids);

      // Restore selected bid if we had one saved
      if (window.proposalMaker_restoreBidId) {
        const bidToRestore = filteredBids.find(bid => bid.id === window.proposalMaker_restoreBidId);
        if (bidToRestore) {
          setSelectedBid(bidToRestore);
          // If a bid is restored, and it has proposal_html, load it
          if (bidToRestore.proposal_html) {
            setGeneratedProposalHtml(bidToRestore.proposal_html);
            // Attempt to parse existing HTML back into editableContent
            // This is a simplified approach, a more robust solution might involve AI parsing or a custom parser
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(bidToRestore.proposal_html, 'text/html');
              // Using more specific selectors that should work with the updated HTML structure
              const extractText = (selector) => doc.querySelector(selector)?.textContent.trim() || '';

              setEditableContent({
                executive_summary: extractText('div:nth-of-type(1) p'), // First div section
                scope_of_work: extractText('div:nth-of-type(3) p'), // Third div section
                timeline: extractText('div:nth-of-type(5) p'), // Fifth div section
                payment_schedule: extractText('div:nth-of-type(6) p'), // Sixth div section
                terms_and_conditions: extractText('div:nth-of-type(7) p'), // Seventh div section
                closing_statement: extractText('div:last-of-type p') // Last div section
              });
            } catch (parseError) {
              console.warn('Could not parse existing proposal HTML into editable content:', parseError);
              // Fallback to empty editable content if parsing fails
              setEditableContent({
                executive_summary: '',
                scope_of_work: '',
                timeline: '',
                payment_schedule: '',
                terms_and_conditions: '',
                closing_statement: ''
              });
            }
          }
        }
        delete window.proposalMaker_restoreBidId; // Clean up
      }
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserBusinessInfo = async () => {
    try {
      const user = await User.me();
      if (user.business_name || user.business_email || user.business_phone || user.business_address || user.business_website) {
        setCompanyInfo({
          company_name: user.business_name || '',
          address: user.business_address || '',
          phone: user.business_phone ? formatPhoneNumber(user.business_phone) : '',
          email: user.business_email || '',
          website: user.business_website || '',
          logo_url: user.business_logo_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading user business info:', error);
    }
  };

  const saveUserBusinessInfo = async (info) => {
    try {
      await User.updateMyUserData({
        business_name: info.company_name,
        business_address: info.address,
        business_phone: info.phone.replace(/[^\d]/g, ""),
        business_email: info.email,
        business_website: info.website,
        business_logo_url: info.logo_url
      });
    } catch (error) {
      console.error('Error saving user business info:', error);
    }
  };

  const handleCompanyInfoChange = (updatedFields) => {
    const nextCompanyInfo = { ...companyInfo, ...updatedFields };

    // Apply formatting if the phone field is being updated
    if (updatedFields.hasOwnProperty('phone')) {
      nextCompanyInfo.phone = formatPhoneNumber(updatedFields.phone);
    }

    setCompanyInfo(nextCompanyInfo);
    saveUserBusinessInfo(nextCompanyInfo);
  };

  // Clear saved state when proposal is successfully sent or completed
  const clearSavedState = () => {
    localStorage.removeItem('proposalMaker_savedState');
  };

  const uploadCompanyLogo = async (file) => {
    setIsUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file: file });
      const updatedInfo = { ...companyInfo, logo_url: file_url };
      handleCompanyInfoChange(updatedInfo);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        uploadCompanyLogo(file);
      } else {
        alert('Please select an image file (PNG, JPG, GIF, etc.)');
      }
    }
  };

  const generateCompanyLogo = async () => {
    if (!companyInfo.company_name) return;

    setIsGeneratingImage(true);
    try {
      const result = await GenerateImage({
        prompt: `Professional business logo for "${companyInfo.company_name}" - clean, modern design, construction/contracting company style, suitable for proposals and business documents`
      });
      const updatedInfo = { ...companyInfo, logo_url: result.url };
      handleCompanyInfoChange(updatedInfo);
    } catch (error) {
      console.error('Error generating logo:', error);
      alert('Failed to generate logo. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateProposal = async () => {
    if (!selectedBid) return;

    setIsGenerating(true);
    setGeneratedProposalHtml(null);
    setIsEditingProposal(false);
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const aiResult = await InvokeLLM({
          prompt: `Create a professional, client-ready proposal based on this job bid:

Project: ${selectedBid.project_title}
Client: ${selectedBid.client_name}
Description: ${selectedBid.project_description}
Total Amount: $${selectedBid.total_bid_amount}

Company Info: ${companyInfo.company_name}

Generate a comprehensive proposal that includes: an executive summary, a detailed scope of work, timeline estimates, terms and conditions, a payment schedule, and a professional closing statement. Structure it with clear headings.`,
          response_json_schema: {
            type: "object",
            properties: {
              executive_summary: { type: "string" },
              scope_of_work: { type: "string" },
              timeline: { type: "string" },
              terms_and_conditions: { type: "string" },
              payment_schedule: { type: "string" },
              closing_statement: { type: "string" }
            }
          }
        });

        // Store the editable content
        setEditableContent(aiResult);

        // Generate the HTML and save it
        await generateProposalHtml(aiResult);
        
        // Success - break out of retry loop
        break;

      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          // If all attempts failed, create a basic proposal template
          console.log('All AI attempts failed, creating basic template');
          
          const basicProposal = {
            executive_summary: `Thank you for considering ${companyInfo.company_name || 'our company'} for your ${selectedBid.project_title} project. We are excited to present this comprehensive proposal outlining our approach, timeline, and investment for your project.`,
            scope_of_work: `Project: ${selectedBid.project_title}\n\nDescription: ${selectedBid.project_description}\n\nWe will provide all necessary materials, labor, and expertise to complete this project to your satisfaction. Our experienced team will ensure quality workmanship throughout the entire process.`,
            timeline: `The ${selectedBid.project_title} project is estimated to be completed within 3-5 business days, depending on weather conditions and project complexity. We will coordinate with you to schedule work at your convenience.`,
            terms_and_conditions: `• All work will be completed according to local building codes and regulations\n• We carry full liability insurance and workers compensation\n• Any changes to the original scope will be discussed and approved before implementation\n• Final payment is due upon project completion and your satisfaction`,
            payment_schedule: `Total Investment: $${selectedBid.total_bid_amount}\n\n• 25% deposit due upon contract signing\n• 75% balance due upon project completion\n\nWe accept cash, check, or major credit cards for your convenience.`,
            closing_statement: `We appreciate the opportunity to work with you on this project. Our commitment to quality workmanship and customer satisfaction ensures you'll be pleased with the results. Please don't hesitate to contact us with any questions or concerns.`
          };
          
          setEditableContent(basicProposal);
          await generateProposalHtml(basicProposal);
          
          alert('AI service is temporarily unavailable. We\'ve created a basic proposal template that you can customize as needed.');
          break;
        } else {
          // Wait before retrying (1 second, then 2 seconds)
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        }
      }
    }
    
    setIsGenerating(false);
  };

  const generateProposalHtml = async (content) => {
    if (!selectedBid) return; 

    // Add null checks and fallbacks for all content fields
    const safeContent = {
      executive_summary: content.executive_summary || 'Executive summary will be provided.',
      scope_of_work: content.scope_of_work || 'Scope of work details will be provided.',
      timeline: content.timeline || 'Project timeline will be provided.',
      payment_schedule: content.payment_schedule || 'Payment schedule will be provided.',
      terms_and_conditions: content.terms_and_conditions || 'Terms and conditions will be provided.',
      closing_statement: content.closing_statement || 'Thank you for considering our proposal.'
    };

    const fullHtml = `
      <div style="color: #FFFFFF; line-height: 1.6; font-family: Arial, sans-serif; background-color: #000000; padding: 20px; min-height: 100vh;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #444444; padding-bottom: 20px;">
          ${companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" alt="Company Logo" style="width: 150px; height: auto; margin: 0 auto 20px; display: block;" />` : ''}
          <h1 style="color: #FFFFFF; font-size: 36px; font-weight: bold; margin: 0 0 10px 0;">PROJECT PROPOSAL</h1>
          <p style="color: #FFFFFF; font-size: 20px; margin: 0;">${selectedBid.project_title || 'Project Title'}</p>
          <div style="margin-top: 20px; font-size: 14px; color: #FFFFFF;">
            ${companyInfo.company_name ? `<p style="font-weight: bold; color: #FFFFFF; margin: 5px 0;">${companyInfo.company_name}</p>` : ''}
            ${companyInfo.address ? `<p style="color: #FFFFFF; margin: 5px 0;">${companyInfo.address}</p>` : ''}
            ${companyInfo.phone || companyInfo.email ? `<p style="color: #FFFFFF; margin: 5px 0;">${companyInfo.phone || ''} ${companyInfo.phone && companyInfo.email ? '|' : ''} ${companyInfo.email || ''}</p>` : ''}
            ${companyInfo.website ? `<p style="color: #FFFFFF; margin: 5px 0;">${companyInfo.website}</p>` : ''}
            <p style="margin-top: 15px; color: #FFFFFF; font-weight: bold;">Proposal Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Executive Summary</h3>
          <p style="color: #FFFFFF; line-height: 1.8; margin: 0; font-size: 16px;">${safeContent.executive_summary.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Project Details</h3>
          <div style="background-color: #1a1a1a; padding: 20px; border: 1px solid #444444;">
            <p style="color: #FFFFFF; margin: 10px 0; font-size: 16px;"><strong style="color: #FFFFFF;">Project:</strong> ${selectedBid.project_title}</p>
            <p style="color: #FFFFFF; margin: 10px 0; font-size: 16px;"><strong style="color: #FFFFFF;">Client:</strong> ${selectedBid.client_name}</p>
            <p style="color: #FFFFFF; margin: 10px 0; font-size: 16px;"><strong style="color: #FFFFFF;">Description:</strong></p>
            <p style="color: #FFFFFF; line-height: 1.8; margin: 10px 0; font-size: 16px;">${selectedBid.project_description}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Scope of Work</h3>
          <p style="color: #FFFFFF; line-height: 1.8; margin: 0; font-size: 16px;">${safeContent.scope_of_work.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Investment Breakdown</h3>
          <div style="background-color: #2a2a2a; padding: 25px; border: 2px solid #444444;">
            ${(selectedBid.materials_total || 0) > 0 ? `<p style="color: #FFFFFF; margin: 8px 0; font-size: 16px;">Materials & Supplies: <strong style="color: #FFFFFF;">$${(selectedBid.materials_total || 0).toFixed(2)}</strong></p>` : ''}
            ${(selectedBid.labor_total || 0) > 0 ? `<p style="color: #FFFFFF; margin: 8px 0; font-size: 16px;">Labor & Services: <strong style="color: #FFFFFF;">$${(selectedBid.labor_total || 0).toFixed(2)}</strong></p>` : ''}
            ${(selectedBid.equipment_total || 0) > 0 ? `<p style="color: #FFFFFF; margin: 8px 0; font-size: 16px;">Equipment Rental: <strong style="color: #FFFFFF;">$${(selectedBid.equipment_total || 0).toFixed(2)}</strong></p>` : ''}
            ${(selectedBid.overhead_total || 0) > 0 ? `<p style="color: #FFFFFF; margin: 8px 0; font-size: 16px;">Overhead & Admin: <strong style="color: #FFFFFF;">$${(selectedBid.overhead_total || 0).toFixed(2)}</strong></p>` : ''}
            ${(selectedBid.markup_amount || 0) > 0 ? `<p style="color: #FFFFFF; margin: 8px 0; font-size: 16px;">Project Management: <strong style="color: #FFFFFF;">$${(selectedBid.markup_amount || 0).toFixed(2)}</strong></p>` : ''}
            <div style="border-top: 2px solid #444444; margin-top: 15px; padding-top: 15px;">
              <p style="color: #FFFFFF; font-weight: bold; font-size: 20px; margin: 0; text-align: center;">TOTAL INVESTMENT: $${(selectedBid.total_bid_amount || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Project Timeline</h3>
          <p style="color: #FFFFFF; line-height: 1.8; margin: 0; font-size: 16px;">${safeContent.timeline.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Payment Schedule</h3>
          <p style="color: #FFFFFF; line-height: 1.8; margin: 0; font-size: 16px;">${safeContent.payment_schedule.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #FFFFFF; font-size: 22px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 1px solid #444444; padding-bottom: 5px;">Terms & Conditions</h3>
          <p style="color: #FFFFFF; line-height: 1.8; margin: 0; font-size: 16px;">${safeContent.terms_and_conditions.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="text-align: center; border-top: 2px solid #444444; padding-top: 25px; margin-top: 30px;">
          <p style="color: #FFFFFF; line-height: 1.8; font-size: 16px; margin: 0;">${safeContent.closing_statement}</p>
        </div>
      </div>
    `;

    setGeneratedProposalHtml(fullHtml);
    
    // **CRITICAL**: Save to database immediately
    try {
      await JobBid.update(selectedBid.id, { proposal_html: fullHtml });
      console.log("Proposal HTML saved successfully to database");
    } catch (error) {
      console.error("FAILED to save proposal HTML:", error);
      throw new Error("Failed to save proposal content. Cannot create shareable link.");
    }
  };

  const handleEditProposal = () => {
    setIsEditingProposal(true);
  };

  const handleSaveProposalEdits = async () => {
    // Regenerate HTML with edits and save immediately
    await generateProposalHtml(editableContent); 
    setIsEditingProposal(false);
  };

  const handleCancelProposalEdits = () => {
    // Optionally revert editableContent to last generated/saved state
    // For simplicity, we just exit edit mode here, changes will be lost if not saved
    setIsEditingProposal(false);
  };

  const handleCopyToClipboard = () => {
    if (!selectedBid || !generatedProposalHtml) return;

    // Create a temporary div to parse the HTML and extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatedProposalHtml;

    // Function to extract and format text from a node
    const extractText = (node) => {
      let text = '';
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tagName = child.tagName.toLowerCase();
          switch (tagName) {
            case 'p':
            case 'div':
            case 'section':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
              text += extractText(child) + '\n\n';
              break;
            case 'br':
              text += '\n';
              break;
            default:
              text += extractText(child);
              break;
          }
        }
      });
      return text;
    };

    let textProposal = extractText(tempDiv);

    // Further clean-up and formatting for plain text
    textProposal = textProposal
      .replace(/(\n\s*){2,}/g, '\n\n') // Condense multiple newlines
      .replace(/\t/g, '') // Remove tabs
      .replace(/ +/g, ' ') // Condense multiple spaces
      .trim();


    const subject = `Proposal for ${selectedBid.project_title}`;
    const initialMessage = `Hi ${selectedBid.client_name},\n\nI'm excited to submit my proposal for your ${selectedBid.project_title} project. Please review it below and let me know if you have any questions.\n\nI look forward to working with you!\n\nBest regards,\n${companyInfo.company_name || 'Your Business'}`;

    const clipboardText = `Subject: ${subject}\n\n${initialMessage}\n\n-----------------------------------\n\n${textProposal}`;

    navigator.clipboard.writeText(clipboardText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy proposal. Please try again or copy manually.');
    });
  };

  const handleContentChange = (field, value) => {
    setEditableContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendProposal = () => {
    if (!selectedBid || !generatedProposalHtml) return;
    setShowSendModal(true);
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    setIsSendingProposal(true);

    try {
      // The proposal HTML is already saved, so we just need to get the link.
      const proposalLink = `${window.location.origin}${createPageUrl(`ViewProposal?id=${selectedBid.id}`)}`;
      
      await navigator.clipboard.writeText(proposalLink);
      
      alert('Shareable proposal link copied to clipboard! You can now paste this link into an email, text message, or any other platform to send to your client.');
      setShowSendModal(false);
      // We don't clear state here anymore, so the user can keep working if needed.

    } catch (error) {
      console.error('Error generating proposal link:', error);
      alert('Failed to generate proposal link. Please try again.');
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedBid) return;
    setIsCreatingInvoice(true);
    try {
      const lineItems = [];
      if (selectedBid.materials_total > 0) {
        lineItems.push({ description: 'Materials & Supplies', amount: selectedBid.materials_total });
      }
      if (selectedBid.labor_total > 0) {
        lineItems.push({ description: 'Labor & Services', amount: selectedBid.labor_total });
      }
      if (selectedBid.equipment_total > 0) {
        lineItems.push({ description: 'Equipment Rental', amount: selectedBid.equipment_total });
      }
      if (selectedBid.overhead_total > 0) {
        lineItems.push({ description: 'Overhead & Admin', amount: selectedBid.overhead_total });
      }
      if (selectedBid.custom_expenses_total > 0) {
        lineItems.push({ description: 'Other Direct Costs', amount: selectedBid.custom_expenses_total });
      }
      if (selectedBid.markup_amount > 0) {
        lineItems.push({ description: 'Project Management & Overhead', amount: selectedBid.markup_amount });
      }

      const newInvoice = {
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        status: 'draft',
        issue_date: new Date().toISOString(),
        due_date: addDays(new Date(), 30).toISOString(),
        client_name: selectedBid.client_name,
        client_email: selectedBid.client_email,
        project_title: selectedBid.project_title,
        line_items: lineItems,
        subtotal: selectedBid.total_bid_amount,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: selectedBid.total_bid_amount,
        notes: "Thank you for your business!",
        related_bid_id: selectedBid.id,
        company_name: companyInfo.company_name,
        company_address: companyInfo.address,
        company_phone: companyInfo.phone.replace(/[^\d]/g, ""),
        company_email: companyInfo.email,
        company_website: companyInfo.website,
        company_logo_url: companyInfo.logo_url,
      };

      await Invoice.create(newInvoice);
      clearSavedState();
      alert('Invoice created successfully! You will be redirected to the Invoices page.');
      window.location.href = createPageUrl('Invoices');

    } catch (error) {
      console.error("Error creating invoice:", error);
      alert('Failed to create invoice.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // calculate progress based on completion steps
  const getProgressSteps = () => {
    const steps = [
      {
        label: "Company Info",
        completed: companyInfo.company_name && companyInfo.email && companyInfo.phone
      },
      {
        label: "Select Bid",
        completed: !!selectedBid
      },
      {
        label: "Generate Proposal",
        completed: !!generatedProposalHtml
      },
      {
        label: "Review & Edit",
        completed: !!generatedProposalHtml && !isEditingProposal
      },
      {
        label: "Ready to Send",
        completed: !!generatedProposalHtml && !isEditingProposal
      }
    ];

    const completedSteps = steps.filter(step => step.completed).length;
    const progressPercentage = (completedSteps / steps.length) * 100;

    return { steps, completedSteps, progressPercentage };
  };

  const { steps, completedSteps, progressPercentage } = getProgressSteps();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* The inline style block that used to force black text is removed as theme styles now manage text color. */}

      {/* Progress Bar Section */}
      <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Proposal Creation Progress</h3>
            <span className="text-sm text-muted-foreground">{completedSteps} of {steps.length} steps completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2 mb-4" />
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded-full flex-shrink-0" />
              )}
              <span className={`${step.completed ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Proposal Maker</h1>
          <p className="text-muted-foreground">
            Create professional, client-ready proposals.
          </p>
        </div>
        <Button
          onClick={generateProposal}
          disabled={!selectedBid || isGenerating}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          data-tour="generate-ai-proposal"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate AI Proposal
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Column - Setup */}
        <div className="space-y-6">
          {/* Company Information */}
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Company Name</Label>
                <Input
                  value={companyInfo.company_name}
                  onChange={(e) => handleCompanyInfoChange({ company_name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <Textarea
                    value={companyInfo.address}
                    onChange={(e) => handleCompanyInfoChange({ address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                  />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <Input
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyInfoChange({ phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <Input
                    value={companyInfo.email}
                    onChange={(e) => handleCompanyInfoChange({ email: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                <Input
                  value={companyInfo.website}
                  onChange={(e) => handleCompanyInfoChange({ website: e.target.value })}
                  placeholder="www.yourcompany.com"
                />
              </div>

              {/* Logo Generation */}
              <div className="space-y-3 border-t border-border pt-4">
                <Label className="text-sm font-medium text-muted-foreground">Company Logo</Label>

                <div className="flex gap-2">
                  <Button
                    onClick={generateCompanyLogo}
                    disabled={!companyInfo.company_name || isGeneratingImage}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {isGeneratingImage ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600 mr-1" />
                    ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    Generate AI Logo
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploadingLogo}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploadingLogo}
                      className="relative"
                    >
                      {isUploadingLogo ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600 mr-1" />
                      ) : (
                          <Upload className="w-3 h-3 mr-1" />
                      )}
                      Upload Logo
                    </Button>
                  </div>
                </div>

                {companyInfo.logo_url && (
                  <div className="border border-border rounded-lg p-3 bg-secondary/50">
                    <img
                      src={companyInfo.logo_url}
                      alt="Company Logo"
                      className="w-full h-20 object-contain"
                    />
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCompanyInfoChange({ logo_url: '' })}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Upload your own logo or generate one with AI.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bid Selection */}
          <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Select Bid</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-tour="select-bid-dropdown">
                <Select
                  onValueChange={(value) => setSelectedBid(bids.find(b => b.id === value))}
                  value={selectedBid?.id || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bid to convert" />
                  </SelectTrigger>
                  <SelectContent>
                    {bids.map(bid => (
                      <SelectItem key={bid.id} value={bid.id}>
                        {bid.project_title} - ${bid.total_bid_amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBid && (
                <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                  <h4 className="font-medium text-foreground">{selectedBid.project_title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{selectedBid.client_name}</p>
                  <div className="flex justify-between items-center mt-2">
                    <Badge className="bg-emerald-900/50 text-emerald-300">
                      ${selectedBid.total_bid_amount?.toLocaleString()}
                    </Badge>
                    <Badge variant="outline" className="border-border">
                      {selectedBid.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Proposal Viewer/Editor */}
        <div className="lg:col-span-3">
          {isEditingProposal ? (
            <Card className="border border-border shadow-xl bg-card">
              <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b border-border">
                <CardTitle>Edit Proposal Content</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelProposalEdits}>
                    Cancel
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveProposalEdits}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Executive Summary</Label>
                  <Textarea
                    value={editableContent.executive_summary}
                    onChange={(e) => handleContentChange('executive_summary', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                  <Textarea
                    value={editableContent.scope_of_work}
                    onChange={(e) => handleContentChange('scope_of_work', e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Project Timeline</Label>
                  <Textarea
                    value={editableContent.timeline}
                    onChange={(e) => handleContentChange('timeline', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Payment Schedule</Label>
                  <Textarea
                    value={editableContent.payment_schedule}
                    onChange={(e) => handleContentChange('payment_schedule', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Terms & Conditions</Label>
                  <Textarea
                    value={editableContent.terms_and_conditions}
                    onChange={(e) => handleContentChange('terms_and_conditions', e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Closing Statement</Label>
                  <Textarea
                    value={editableContent.closing_statement}
                    onChange={(e) => handleContentChange('closing_statement', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          ) : generatedProposalHtml ? (
            <Card className="border border-border shadow-xl bg-card max-h-[90vh] overflow-auto">
              <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b border-border">
                <CardTitle>Generated Proposal</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={handleEditProposal}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Content
                  </Button>
                  <Button variant="outline" onClick={handleCopyToClipboard} className="w-40">
                    {isCopied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <ClipboardCopy className="w-4 h-4 mr-2" />}
                    {isCopied ? 'Copied!' : 'Copy for Email'}
                  </Button>
                  {selectedBid?.status === 'sent' ? (
                     <Button className="bg-primary hover:bg-primary/90" onClick={handleSendProposal}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Again
                      </Button>
                  ) : (
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleSendProposal}
                      title="Send to Client"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send to Client
                    </Button>
                  )}
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={isCreatingInvoice || !selectedBid}
                    className="bg-sky-600 hover:bg-sky-700"
                    data-tour="create-invoice-from-proposal"
                  >
                    {isCreatingInvoice ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                        <FileSignature className="w-4 h-4 mr-2" />
                    )}
                    {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-card">
                <div id="proposal-preview-container" className="bg-white rounded-lg p-6 max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: generatedProposalHtml }} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center flex flex-col items-center justify-center min-h-[500px]">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Your Proposal Appears Here</h3>
                <p className="text-muted-foreground mb-6">
                  Fill in company info, select a bid, and generate a proposal.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send Proposal Modal */}
      {showSendModal && selectedBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Share Proposal with {selectedBid.client_name}</CardTitle>
              <CardDescription>Generate a shareable link to send to your client.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendSubmit}>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Shareable Proposal Link</Label>
                    <div className="bg-secondary/50 p-3 rounded-md text-sm border border-border mt-2">
                      {`${window.location.origin}${createPageUrl(`ViewProposal?id=${selectedBid.id}`)}`}
                    </div>
                  </div>

                  {/* New Instruction Box */}
                  <div className="bg-card border border-primary/20 rounded-lg p-4 flex items-start gap-4">
                    <Info className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">How to Send Your Proposal</h4>
                      <p className="text-sm text-muted-foreground">
                        Click the "Copy Link" button below. Then, open your email client (like Gmail or Outlook) and paste this link into a new email to send to your client.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowSendModal(false)} disabled={isSendingProposal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSendingProposal} className="bg-primary hover:bg-primary/90">
                    {isSendingProposal ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <ClipboardCopy className="w-4 h-4 mr-2"/>}
                    Copy Link
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
