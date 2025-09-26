
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { ChatHistory } from "@/api/entities";
import { UploadFile } from "@/api/integrations"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Loader2, User as UserIcon, MapPin, Calendar, Edit3, RefreshCw, Sparkles, Building, Mail, Phone, Globe, Edit } from "lucide-react";

const formatPhoneNumber = (value) => {
  if (!value) return "";
  // 1. Strip all non-digit characters.
  const phoneNumber = value.replace(/[^\d]/g, "");
  // 2. Get the first 10 digits.
  const tenDigitNumber = phoneNumber.slice(0, 10);
  const { length } = tenDigitNumber;

  // 3. Return formatted number based on length.
  if (length < 4) return tenDigitNumber;
  if (length < 7) {
    return `(${tenDigitNumber.slice(0, 3)}) ${tenDigitNumber.slice(3)}`;
  }
  return `(${tenDigitNumber.slice(0, 3)}) ${tenDigitNumber.slice(3, 6)}-${tenDigitNumber.slice(6, 10)}`;
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    professional_title: '',
    bio: '',
    profile_picture_url: '',
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    business_website: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newImage, setNewImage] = useState(null);
  const [previewImageURL, setPreviewImageURL] = useState(null); // New state for image preview
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setFormData({
        full_name: currentUser.full_name || '',
        professional_title: currentUser.professional_title || '',
        bio: currentUser.bio || '',
        profile_picture_url: currentUser.profile_picture_url || '',
        business_name: currentUser.business_name || '',
        business_email: currentUser.business_email || '',
        business_phone: currentUser.business_phone ? formatPhoneNumber(currentUser.business_phone) : '',
        business_address: currentUser.business_address || '',
        business_website: currentUser.business_website || ''
      });
      setPreviewImageURL(null); // Clear any old preview when loading fresh data
    } catch (error) {
      console.error("Failed to load user data", error);
      // Optionally alert user or show a message
      // alert("Failed to load profile data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'business_phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImageURL(event.target.result); // Set preview URL for display
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    let updatedData = { ...formData };

    try {
      if (newImage) {
        const { file_url } = await UploadFile({ file: newImage });
        updatedData.profile_picture_url = file_url; // Update only after successful upload
      }
      
      await User.updateMyUserData({
          full_name: updatedData.full_name,
          professional_title: updatedData.professional_title,
          bio: updatedData.bio,
          profile_picture_url: updatedData.profile_picture_url,
          business_name: updatedData.business_name,
          business_email: updatedData.business_email,
          business_phone: updatedData.business_phone,
          business_address: updatedData.business_address,
          business_website: updatedData.business_website
      });
      
      setNewImage(null); // Clear the selected file
      setPreviewImageURL(null); // Clear the preview URL
      setIsEditing(false); // Exit edit mode
      loadUserData(); // Refresh the data from the backend to ensure consistency
    } catch (error) {
      console.error("Failed to save profile", error);
      // Fix: If save fails, revert image states and profile_picture_url in formData to original
      if (newImage) {
        setNewImage(null);
        setPreviewImageURL(null);
        setFormData(prev => ({
          ...prev,
          profile_picture_url: user?.profile_picture_url || '' // Revert to last saved image URL
        }));
      }
      alert("Failed to save profile. Please try again."); // User feedback for network error
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleResetOnboarding = async () => {
    if (window.confirm("Are you sure you want to reset your onboarding status? This will clear all your AI chat history and allow you to re-run the initial AI setup as a completely new user.")) {
        setIsSaving(true);
        try {
            // Clear all chat history for this user
            if (user?.email) {
              const existingChats = await ChatHistory.filter({ created_by: user.email });
              if (existingChats.length > 0) {
                await Promise.all(existingChats.map(chat => ChatHistory.delete(chat.id)));
              }
            }
            
            // Reset onboarding status
            await User.updateMyUserData({ has_completed_onboarding: false });
            
            alert("Onboarding has been reset and chat history cleared. You will now be treated as a completely new user in the AI Assistant.");
            window.location.reload();
        } catch (error) {
            console.error("Failed to reset onboarding", error);
            alert("Failed to reset onboarding. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const isEmpty = !formData.full_name && !formData.professional_title && !formData.bio;

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Profile Header - Instagram/Twitter Style */}
      <div className="bg-card border-b border-border relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-4 md:px-8 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
              {/* Profile Picture */}
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-2xl ring-4 ring-emerald-300/50">
                  <AvatarImage src={isEditing && previewImageURL ? previewImageURL : formData.profile_picture_url} alt={formData.full_name} />
                  <AvatarFallback className="text-4xl md:text-5xl bg-white text-emerald-600 font-bold">
                    {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white"
                    >
                      <Edit className="w-4 h-4 text-white" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg, image/gif"
                    />
                  </>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left text-white">
                {isEmpty && !isEditing ? (
                  <div className="space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold">Welcome to ProfitPilot!</h1>
                    <p className="text-emerald-100 text-lg">Complete your profile to get started</p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-3 text-lg shadow-lg"
                    >
                      <Edit3 className="w-5 h-5 mr-2" />
                      Create Profile
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <h1 className="text-3xl md:text-4xl font-bold">
                        {formData.full_name || 'Your Name'}
                      </h1>
                      {!isEditing && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                    <p className="text-emerald-100 text-xl font-medium">
                      {formData.professional_title || 'Your Professional Title'}
                    </p>
                    <div className="flex items-center gap-4 text-emerald-100">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        <span>{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 md:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {isEditing ? (
            /* Edit Form */
            <Card className="border-border bg-card">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-t-lg">
                <CardTitle className="text-2xl font-bold">Edit Your Profile</CardTitle>
                <CardDescription>
                  Tell the world about yourself and your business
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Personal Information</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="font-semibold">
                            Full Name *
                          </Label>
                          <Input
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleInputChange}
                            className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl"
                            placeholder="Your full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="professional_title" className="font-semibold">
                            Professional Title *
                          </Label>
                          <Input
                            id="professional_title"
                            name="professional_title"
                            value={formData.professional_title}
                            onChange={handleInputChange}
                            className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl"
                            placeholder="e.g., Business Owner, Project Manager"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="font-semibold">
                          About You & Your Business *
                        </Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl min-h-[120px]"
                          placeholder="Tell people about your business, your experience..."
                          required
                        />
                      </div>
                  </div>
                  
                  {/* Business Information Section */}
                  <div className="space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Business Information</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="business_name" className="font-semibold">Business Name</Label>
                          <Input id="business_name" name="business_name" value={formData.business_name} onChange={handleInputChange} placeholder="Your Company LLC" className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_phone" className="font-semibold">Business Phone</Label>
                          <Input id="business_phone" name="business_phone" value={formData.business_phone} onChange={handleInputChange} placeholder="(555) 123-4567" className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_email" className="font-semibold">Business Email</Label>
                          <Input id="business_email" name="business_email" type="email" value={formData.business_email} onChange={handleInputChange} placeholder="contact@yourcompany.com" className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_website" className="font-semibold">Business Website</Label>
                          <Input id="business_website" name="business_website" value={formData.business_website} onChange={handleInputChange} placeholder="www.yourcompany.com" className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_address" className="font-semibold">Business Address</Label>
                        <Textarea id="business_address" name="business_address" value={formData.business_address} onChange={handleInputChange} placeholder="123 Main St, Anytown, USA 12345" className="text-base p-4 border-slate-300 focus:border-emerald-500 rounded-xl" rows={2}/>
                      </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setNewImage(null);
                        setPreviewImageURL(null);
                        loadUserData(); // Reloads original data on cancel
                      }}
                      disabled={isSaving}
                      className="px-6 py-3 text-base border-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 py-3 text-base font-semibold shadow-lg"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Profile Display */
            !isEmpty && (
              <div className="space-y-8">
                {/* About Section */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {formData.bio}
                    </p>
                  </CardContent>
                </Card>

                {/* Business Information Display */}
                <Card className="border-border bg-card">
                   <CardHeader>
                    <CardTitle className="text-xl font-bold">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6 text-lg">
                    <div className="flex items-center gap-4">
                      <Building className="w-6 h-6 text-emerald-600" />
                      <span className="text-muted-foreground">{formData.business_name || 'Not set'}</span>
                    </div>
                     <div className="flex items-center gap-4">
                      <Phone className="w-6 h-6 text-emerald-600" />
                      <span className="text-muted-foreground">{formData.business_phone || 'Not set'}</span>
                    </div>
                     <div className="flex items-center gap-4">
                      <Mail className="w-6 h-6 text-emerald-600" />
                      <span className="text-muted-foreground">{formData.business_email || 'Not set'}</span>
                    </div>
                     <div className="flex items-center gap-4">
                      <Globe className="w-6 h-6 text-emerald-600" />
                      <span className="text-muted-foreground">{formData.business_website || 'Not set'}</span>
                    </div>
                     <div className="flex items-start gap-4 md:col-span-2">
                      <MapPin className="w-6 h-6 text-emerald-600 mt-1" />
                      <span className="text-muted-foreground">{formData.business_address || 'Not set'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Stats - Coming Soon */}
                <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <CardContent className="p-8 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold">Your Business Metrics</h3>
                      <p className="text-slate-300">
                        Start creating bids and setting goals to see your business insights here!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          )}
          
          {/* Developer Tools Card */}
           <Card className="mt-8 border-destructive/50 bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Testing Tools
                </CardTitle>
                <CardDescription>Use these tools to test different application states.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                    <Label className="font-semibold">Reset AI Onboarding</Label>
                    <p className="text-sm text-muted-foreground">
                        Click this to see the first-time user experience in the AI Assistant again.
                    </p>
                  </div>
                   <Button
                      variant="destructive"
                      onClick={handleResetOnboarding}
                      disabled={isSaving}
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2"/>
                      {isSaving ? 'Resetting...' : 'Reset Onboarding Status'}
                    </Button>
              </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}
