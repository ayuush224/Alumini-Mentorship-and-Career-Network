"use client";

import React, { useState, useTransition } from "react";
import {
  Link as LinkIcon,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";
import {
  addStudentSocialLink,
  removeStudentSocialLink,
  addStudentOtherLink,
  removeStudentOtherLink,
  updateStudentCodingProfiles,
} from "@/actions/profile";

export interface StudentLinksCardProps {
  initialCodingProfiles?: Array<{
    platform: string;
    username?: string;
    url?: string;
    synced?: boolean;
  }>;
  initialSocialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  initialOtherLinks?: Array<{
    title: string;
    url: string;
  }>;
}

export function StudentLinksCard({
  initialCodingProfiles = [{ platform: "LeetCode", username: "alex_chen", synced: true }],
  initialSocialLinks = [],
  initialOtherLinks = [],
}: StudentLinksCardProps) {
  const [codingProfiles, setCodingProfiles] = useState(initialCodingProfiles);
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks);
  const [otherLinks, setOtherLinks] = useState(initialOtherLinks);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState("LinkedIn");
  const [socialUrl, setSocialUrl] = useState("");

  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherTitle, setOtherTitle] = useState("");
  const [otherUrl, setOtherUrl] = useState("");

  const [showLeetCodeModal, setShowLeetCodeModal] = useState(false);
  const leetCodeProfile = codingProfiles.find((c) => c.platform.toLowerCase() === "leetcode") || {
    platform: "LeetCode",
    username: "alex_chen",
    synced: true,
  };
  const [leetCodeUsername, setLeetCodeUsername] = useState(leetCodeProfile.username || "alex_chen");

  // Handlers
  const handleSaveLeetCode = () => {
    const updated = codingProfiles.map((c) =>
      c.platform.toLowerCase() === "leetcode"
        ? { ...c, username: leetCodeUsername.trim(), synced: true }
        : c
    );
    if (!updated.some((c) => c.platform.toLowerCase() === "leetcode")) {
      updated.push({ platform: "LeetCode", username: leetCodeUsername.trim(), synced: true });
    }
    setCodingProfiles(updated);
    setShowLeetCodeModal(false);

    startTransition(async () => {
      await updateStudentCodingProfiles(updated);
    });
  };

  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialUrl.trim()) return;
    const platform = socialPlatform.trim() || "LinkedIn";
    const url = socialUrl.trim().startsWith("http") ? socialUrl.trim() : `https://${socialUrl.trim()}`;
    const updated = [...socialLinks, { platform, url }];
    setSocialLinks(updated);
    setShowSocialModal(false);
    setSocialUrl("");

    startTransition(async () => {
      await addStudentSocialLink(platform, url);
    });
  };

  const handleDeleteSocial = (url: string) => {
    const updated = socialLinks.filter((l) => l.url !== url);
    setSocialLinks(updated);

    startTransition(async () => {
      await removeStudentSocialLink(url);
    });
  };

  const handleAddOther = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherUrl.trim()) return;
    const title = otherTitle.trim() || "Website";
    const url = otherUrl.trim().startsWith("http") ? otherUrl.trim() : `https://${otherUrl.trim()}`;
    const updated = [...otherLinks, { title, url }];
    setOtherLinks(updated);
    setShowOtherModal(false);
    setOtherTitle("");
    setOtherUrl("");

    startTransition(async () => {
      await addStudentOtherLink(title, url);
    });
  };

  const handleDeleteOther = (url: string) => {
    const updated = otherLinks.filter((l) => l.url !== url);
    setOtherLinks(updated);

    startTransition(async () => {
      await removeStudentOtherLink(url);
    });
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-5 text-stone-900">
        {/* ===================================================================
            1. CODING PROFILES (MATCHING USER-PROVIDED SCREENSHOT)
        ==================================================================== */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            CODING PROFILES
          </span>

          <div
            onClick={() => setShowLeetCodeModal(true)}
            className="flex items-center justify-between py-2 px-1 hover:bg-stone-50 rounded-xl transition-all cursor-pointer group"
            title="Click to edit LeetCode username"
          >
            <div className="flex items-center gap-3">
              {/* LeetCode Icon matching Image 1 */}
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                  <path
                    fill="#262626"
                    d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"
                  />
                  <path
                    fill="#FFA116"
                    d="M9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-stone-900 tracking-tight">LeetCode</h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
              <span>Synced</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-stone-100" />

        {/* ===================================================================
            2. SOCIAL LINKS (MATCHING USER-PROVIDED SCREENSHOT)
        ==================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              SOCIAL LINKS
            </span>
            {socialLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSocialModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>

          {socialLinks.length > 0 ? (
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-800"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600 truncate max-w-[210px]"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold text-stone-900">{link.platform}</span>
                    <span className="text-stone-400 text-[11px] truncate">({link.url})</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteSocial(link.url)}
                    className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Dashed Box matching the exact design in the uploaded picture */
            <button
              type="button"
              onClick={() => setShowSocialModal(true)}
              className="w-full border border-dashed border-stone-300 hover:border-stone-400 rounded-xl py-6 px-4 text-center bg-stone-50/20 hover:bg-stone-50/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
            >
              <div className="relative w-9 h-9 rounded-full border border-stone-300 bg-white flex items-center justify-center text-stone-400 group-hover:text-blue-600 group-hover:border-blue-400 transition-colors shadow-2xs">
                <LinkIcon className="w-4 h-4 rotate-[-45deg]" />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
                  +
                </div>
              </div>
              <span className="text-xs font-medium text-stone-600 group-hover:text-stone-800">
                No links added
              </span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-b border-stone-100" />

        {/* ===================================================================
            3. OTHER LINKS (MATCHING USER-PROVIDED SCREENSHOT)
        ==================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              OTHER LINKS
            </span>
            {otherLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOtherModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>

          {otherLinks.length > 0 ? (
            <div className="space-y-2">
              {otherLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-800"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600 truncate max-w-[210px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold text-stone-900">{link.title}</span>
                    <span className="text-stone-400 text-[11px] truncate">({link.url})</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteOther(link.url)}
                    className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Dashed Box matching the exact design in the uploaded picture */
            <button
              type="button"
              onClick={() => setShowOtherModal(true)}
              className="w-full border border-dashed border-stone-300 hover:border-stone-400 rounded-xl py-6 px-4 text-center bg-stone-50/20 hover:bg-stone-50/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
            >
              <div className="relative w-9 h-9 rounded-full border border-stone-300 bg-white flex items-center justify-center text-stone-400 group-hover:text-blue-600 group-hover:border-blue-400 transition-colors shadow-2xs">
                <LinkIcon className="w-4 h-4 rotate-[-45deg]" />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
                  +
                </div>
              </div>
              <span className="text-xs font-medium text-stone-600 group-hover:text-stone-800">
                No links added
              </span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          LEETCODE CONFIG MODAL
      ====================================================================== */}
      {showLeetCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">LeetCode Profile</h3>
              <button
                type="button"
                onClick={() => setShowLeetCodeModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  LeetCode Username
                </label>
                <input
                  type="text"
                  value={leetCodeUsername}
                  onChange={(e) => setLeetCodeUsername(e.target.value)}
                  placeholder="e.g. alex_chen"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeetCodeModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLeetCode}
                  disabled={isPending || !leetCodeUsername.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
                >
                  Save & Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADD SOCIAL LINK MODAL
      ====================================================================== */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Add Social Link</h3>
              <button
                type="button"
                onClick={() => setShowSocialModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSocial} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Platform
                </label>
                <select
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Twitter">X / Twitter</option>
                  <option value="Discord">Discord</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Profile URL *
                </label>
                <input
                  type="url"
                  required
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSocialModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !socialUrl.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADD OTHER LINK MODAL
      ====================================================================== */}
      {showOtherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Add Other Link</h3>
              <button
                type="button"
                onClick={() => setShowOtherModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddOther} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={otherTitle}
                  onChange={(e) => setOtherTitle(e.target.value)}
                  placeholder="e.g. Personal Portfolio, Blog"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  required
                  value={otherUrl}
                  onChange={(e) => setOtherUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtherModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !otherUrl.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
