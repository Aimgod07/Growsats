import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Copy, Check, HelpCircle, Trophy, Languages, Loader2 } from "lucide-react";
import "../../styles/Profile.css";
import Footer from "./Footer";


async function fetchProfile() {

  //  Replace this block with a real call,
  // const res = await fetch("/api/user/profile");
  // if (!res.ok) throw new Error("Failed to load profile");
  // return res.json();

  await mockDelay(400);
  return {
    name: "Deepanshu",
    email: "deep447@gmail.com",
    emailVerified: true,
    avatarUrl: null, 
    country: { code: "IN", label: "India", flag: "🇮🇳" },
    dateJoined: "2026-07-17",
    userId: "sBKlqMOjhKMyssMG8xTKkf9z9Ls1",
  };
}


async function uploadAvatar(file) {

  // --- Replace this block with a real call,
  // const formData = new FormData();
  // formData.append("avatar", file);
  // const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
  // if (!res.ok) throw new Error("Upload failed");
  // return res.json();

  await mockDelay(500);
  return { avatarUrl: URL.createObjectURL(file) };
}

function mockDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatJoinDate(isoDate) {
  const date = new Date(isoDate);
  return date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();
}

//main

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch (err) {
      setError(err.message || "Couldn't load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const handleCopyUserId = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail silently, no need to block the user.
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
    } catch (err) {
      setError(err.message || "Couldn't update your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page profile-page--center">
        <Loader2 size={28} className="spin icon-teal" />
        <p className="profile-page__loading-text">Loading your profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page profile-page--center">
        <p className="profile-page__error-text">{error}</p>
        <button className="profile-page__retry" onClick={loadProfile}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* ---------------- Hero section ---------------- */}
      <div className="profile-hero">
  
        {/* ---------------- Section heading ---------------- */}
      <div className="section-heading">
        <h2 className="section-heading__title">Date joined</h2>
        <p className="section-heading__caption">{formatJoinDate(profile.dateJoined)}</p>
      </div>
      <br></br>
        <div className="avatar-wrap">
          <div className="avatar-ring" />
          <div className="avatar">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="avatar__image" />
            ) : (
              <span className="avatar__emoji">👨</span>
            )}
          </div>
          <label className="avatar-edit" aria-label="Change profile photo">
            {uploading ? <Loader2 size={14} className="spin" /> : <Pencil size={14} />}
            <input
              type="file"
              accept="image/*"
              className="avatar-edit__input"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </label>
        </div>

        <p className="profile-name">{profile.name.toUpperCase()}</p>
        <p className="profile-email">
          {profile.email}
          {profile.emailVerified && (
            <span className="verified-badge" aria-label="Verified email">
              <Check size={12} />
            </span>
          )}
        </p>
      </div>

      {/* ---------------- Wavy divider ---------------- */}
      <div className="wavy-divider-wrap">
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="wavy-divider">
          <path
            d="M0,4 L150,4 C165,4 165,20 185,20 L215,20 C235,20 235,4 250,4 L400,4"
            fill="none"
            stroke="rgba(45,212,191,0.3)"
            strokeWidth="2"
          />
        </svg>
      </div>

      

      {/* ---------------- Body ---------------- */}
      <div className="profile-body">
        {/* User ID card */}
        <div className="info-card">
          <div className="info-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 3H4v3M17 3h3v3M7 21H4v-3M17 21h3v-3" strokeLinecap="round" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </div>
          <div className="info-card__text">
            <p className="info-card__title">User ID</p>
            <p className="info-card__subtitle">{profile.userId}</p>
          </div>
          <button className="info-card__action" onClick={handleCopyUserId} aria-label="Copy user ID">
            {copied ? <Check size={16} className="icon-teal" /> : <Copy size={16} />}
          </button>
        </div>

        {/* System info link */}
        <button className="system-info-link">
          <HelpCircle size={16} />
          <span>View the system information</span>
        </button>

        {/* Menu list */}
        <div className="menu-list">
          <button className="menu-item">
            <div className="menu-item__icon">
              <Trophy size={18} />
            </div>
            <div className="menu-item__text">
              <p className="menu-item__title">Reward History</p>
              <p className="menu-item__subtitle">View all your rewards</p>
            </div>
          </button>

          <div className="menu-item__divider" />

          <button className="menu-item">
            <div className="menu-item__icon">
              <Languages size={18} />
            </div>
            <div className="menu-item__text">
              <p className="menu-item__title">App language</p>
              <p className="menu-item__subtitle">Change your app language</p>
            </div>
          </button>
        </div>

        <button className="rate-us-link">Rate Us!</button>
      </div>
      <Footer/>
    </div>
  );
}