// ==========================================
// Bakir Hisab PWA - Main Application Logic
// ==========================================

// ১. URL থেকে ডাইনামিক site_id রিড করার ফাংশন
function getSiteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let siteId = params.get('site_id');
  
  // যদি ইউআরএল-এ site_id না থাকে, তবে ডিফল্ট হিসেবে 'rahim_store' বা লোকালস্টোরেজ থেকে নেবে
  if (!siteId) {
    siteId = localStorage.getItem('current_site_id') || 'rahim_store';
  } else {
    // ভবিষ্যতে ব্যবহারের জন্য সেভ করে রাখা
    localStorage.setItem('current_site_id', siteId);
  }
  return siteId;
}

const CURRENT_SITE_ID = getSiteIdFromUrl();
console.log("Current Site ID:", CURRENT_SITE_ID);

// ২. ডাইনামিক স্টোরেজ কি (Key) তৈরি করার জন্য প্রিফিক্স
const STORAGE_PREFIX = `site_${CURRENT_SITE_ID}_`;

function getScopedKey(key) {
  return STORAGE_PREFIX + key;
}

// ৩. এপিআই লিংক (আপনার গুগল শিট ব্যাকএন্ড)
const ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbyaJI5U91iG4ZzYRhpfRrnVAsBePWazIoR9Lw6-ayraPcoXsaQLGT1uEJfPgMcWTPR6/exec";

// ৪. সাবস্ক্রিপশন এবং লাইসেন্স ভ্যালিডেশন চেক করার ফাংশন
function checkSubscription() {
  const apiEndpoint = `${ADMIN_API_URL}?site_id=${CURRENT_SITE_ID}`;
  
  fetch(apiEndpoint)
    .then(response => response.json())
    .then(data => {
      console.log("API Response:", data);

      const isActive = data.status && data.status.toLowerCase() === "active";
      
      let isValidDate = false;
      if (data.expiry_date) {
        const expiryDate = new Date(data.expiry_date);
        const today = new Date();
        
        // সময় রিসেট করে শুধু তারিখের তুলনা করা
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        if (expiryDate >= today) {
          isValidDate = true;
        }
      }

      if (isActive && isValidDate) {
        console.log("Subscription is Active. App Unlocked.");
        unlockAppInterface();
      } else {
        console.log("Subscription Paused or Expired.");
        lockAppInterface();
      }
    })
    .catch(error => {
      console.error("API Connection Error:", error);
      // অফলাইন মোড বা নেটওয়ার্ক না থাকলে আগের লোকাল ডাটা দিয়ে অ্যাপ চালু রাখার ব্যবস্থা
      unlockAppInterface();
    });
}

// ৫. অ্যাপ আনলক বা চালু রাখার ইন্টারফেস
function unlockAppInterface() {
  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen) {
    pauseScreen.style.display = 'none';
  }
  // এখানে আপনার মেইন অ্যাপ লোড হওয়ার ফাংশন কল করতে পারেন
  loadAppData();
}

// ৬. অ্যাপ পজ বা লক করার ইন্টারফেস
function lockAppInterface() {
  // পুরো স্ক্রিনে পজ মেসেজ বা লক স্ক্রিন দেখিয়ে দেওয়া
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8d7da; color: #721c24; font-family: Arial, sans-serif; text-align: center; padding: 20px;">
      <div>
        <h1 style="font-size: 24px; margin-bottom: 10px;">⚠️ হিসাব অ্যাপ সাময়িকভাবে পজ বা স্থগিত করা হয়েছে</h1>
        <p style="font-size: 16px;">দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন অথবা সাবস্ক্রিপশন রিনিউ করুন।</p>
        <p style="font-size: 14px; margin-top: 15px; color: #555;">Site ID: ${CURRENT_SITE_ID}</p>
      </div>
    </div>
  `;
}

// ৭. লোকাল ডাটা লোড করার বেসিক ফাংশন (আপনার অ্যাপের মূল লজিক এখানে থাকবে)
function loadAppData() {
  // উদাহরণস্বরূপ ডাইনামিক স্টোরেজ ব্যবহার করে ডাটা সেভ বা রিড করার নিয়ম:
  // const savedData = localStorage.getItem(getScopedKey('ledger_data'));
  console.log("Loading app data for storage prefix:", STORAGE_PREFIX);
}

// পেজ লোড হওয়ার সাথে সাথে সাবস্ক্রিপশন চেক রান হবে
window.addEventListener('DOMContentLoaded', () => {
  checkSubscription();
});
