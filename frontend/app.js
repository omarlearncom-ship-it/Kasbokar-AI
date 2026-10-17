const API_BASE_URL = "https://kasbokar-ai.onrender.com";

const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "karbarChats";
const PREFS_KEY = "karbarPrefs";

let chats = [];
let currentChatId = null;
let selectedBusiness = "";
let installPrompt = null;
let toastTimer = null;

const WELCOME =
  "سلام! دربارهٔ کسب‌وکارت چه کمکی می‌خواهی؟";

// ساخت شناسهٔ یکتا
function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

// نمایش پیام کوتاه
function toast(message) {
  const element = $("#toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 3000);
}

// ذخیرهٔ تنظیمات کاربر
function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    toast("ذخیرهٔ تنظیمات ممکن نشد.");
  }
}

// ذخیرهٔ تاریخچه در همین مرورگر
function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    return true;
  } catch {
    toast("ذخیرهٔ تاریخچه ممکن نشد؛ فضای مرورگر را بررسی کن.");
    return false;
  }
}

// گفت‌وگوی فعال
function activeChat() {
  return chats.find(chat => chat.id === currentChatId) || null;
}

// ایجاد گفت‌وگوی جدید
function newChat() {
  const chat = {
    id: makeId(),
    title: "گفت‌وگوی جدید",
    messages: [
      { role: "assistant", text: WELCOME }
    ],
    business: "",
    updatedAt: Date.now()
  };

  chats.unshift(chat);
  currentChatId = chat.id;
  selectedBusiness = "";

  updateBusinessButtons();
  renderAll();
  saveChats();

  const input = $("#messageInput");
  if (input) input.focus();
}

// فهرست تاریخچه
function renderChatList() {
  const list = $("#chatList");
  if (!list) return;

  list.replaceChildren();

  if (chats.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-chats";
    empty.textContent = "هنوز گفت‌وگویی نداری.";
    list.appendChild(empty);
    return;
  }

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-history-item";

    if (chat.id === currentChatId) {
      item.classList.add("active");
    }

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "history-open";
    openButton.textContent = chat.title || "گفت‌وگوی جدید";
    openButton.title = chat.title || "گفت‌وگوی جدید";
    openButton.addEventListener("click", () => openChat(chat.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "×";
    deleteButton.title = "حذف گفت‌وگو";
    deleteButton.setAttribute("aria-label", "حذف گفت‌وگو");

    deleteButton.addEventListener("click", () => {
      deleteChat(chat.id);
    });

    item.append(openButton, deleteButton);
    list.appendChild(item);
  });
}

// نمایش پیام‌ها
function renderMessages() {
  const container = $("#messages");
  if (!container) return;

  container.replaceChildren();

  const chat = activeChat();
  if (!chat) return;

  chat.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = "message " +
      (message.role === "user"
        ? "user-message"
        : "assistant-message");

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent =
      message.role === "user" ? "تو" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // متن پیام به‌صورت متن ساده نمایش داده می‌شود
    bubble.textContent = message.text;

    row.append(avatar, bubble);
    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

// نمایش نوع کسب‌وکار انتخاب‌شده
function renderBusinessContext() {
  const element = $("#businessContext");
  if (!element) return;

  element.textContent = selectedBusiness
    ? "نوع کسب‌وکار: " + selectedBusiness
    : "";
}

// به‌روزرسانی کل رابط
function renderAll() {
  renderChatList();
  renderMessages();
  renderBusinessContext();
}

// بازکردن گفت‌وگوی قبلی
function openChat(id) {
  const chat = chats.find(item => item.id === id);
  if (!chat) return;

  currentChatId = id;
  selectedBusiness = chat.business || "";

  updateBusinessButtons();
  renderAll();
}

// حذف گفت‌وگو
function deleteChat(id) {
  const chat = chats.find(item => item.id === id);
  if (!chat) return;

  const confirmed = confirm(
    "گفت‌وگوی «" + (chat.title || "گفت‌وگوی جدید") +
    "» حذف شود؟"
  );

  if (!confirmed) return;

  chats = chats.filter(item => item.id !== id);

  if (currentChatId === id) {
    currentChatId = chats.length ? chats[0].id : null;
  }

  if (!currentChatId) {
    saveChats();
    newChat();
    return;
  }

  saveChats();
  openChat(currentChatId);
  toast("گفت‌وگو حذف شد.");
}

// افزودن پیام و ذخیره
function addMessage(role, text, chatId = currentChatId) {
  const chat = chats.find(item => item.id === chatId);
  if (!chat) return;

  chat.messages.push({ role, text });

  if (role === "user") {
    const firstUserMessage = chat.messages.find(
      message => message.role === "user"
    );

    if (firstUserMessage) {
      chat.title = firstUserMessage.text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 32) || "گفت‌وگوی جدید";
    }
  }

  chat.updatedAt = Date.now();

  chats.sort((a, b) => b.updatedAt - a.updatedAt);

  saveChats();

  if (currentChatId === chatId) {
    renderAll();
  }
}

// تغییر اندازهٔ خودکار کادر پیام
function resizeTextarea() {
  const input = $("#messageInput");
  if (!input) return;

  input.style.height = "auto";

  const maxHeight = window.innerWidth <= 700 ? 180 : 220;

  input.style.height =
    Math.min(input.scrollHeight, maxHeight) + "px";
}

// انتخاب نوع کسب‌وکار
function updateBusinessButtons() {
  document.querySelectorAll(".biz").forEach(button => {
    const isSelected =
      button.dataset.business === selectedBusiness;

    button.classList.toggle("active", isSelected);
    button.classList.toggle("selected", isSelected);
    button.setAttribute(
      "aria-pressed",
      String(isSelected)
    );
  });
}

// خواندن پاسخ API
async function readApiResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = typeof data.detail === "string"
      ? data.detail
      : "خطا در ارتباط با سرور";

    throw new Error(detail);
  }

  if (typeof data.reply === "string") return data.reply;
  if (typeof data.response === "string") return data.response;
  if (typeof data.answer === "string") return data.answer;
  if (typeof data.message === "string") return data.message;

  if (
    Array.isArray(data.choices) &&
    data.choices[0]?.message?.content
  ) {
    return data.choices[0].message.content;
  }

  throw new Error("پاسخ سرور در قالب مورد انتظار نبود.");
}

// ارسال پیام به هوش مصنوعی
async function sendMessage(text) {
  const message = text.trim();
  if (!message) return;

  if (!activeChat()) {
    newChat();
  }

  const chat = activeChat();
  if (!chat) return;

  const chatId = chat.id;
  const input = $("#messageInput");
  const sendButton = $("#sendButton");

  addMessage("user", message, chatId);

  if (input) {
    input.value = "";
    resizeTextarea();
  }

  if (sendButton) sendButton.disabled = true;

  try {
    const prefs = getPrefs();

    const response = await fetch(
      API_BASE_URL + "/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          country: prefs.country || "افغانستان",
          language: prefs.language || "فارسی",
          business_type:
            chats.find(item => item.id === chatId)?.business || ""
        })
      }
    );

    const reply = await readApiResponse(response);

    addMessage("assistant", reply, chatId);
  } catch (error) {
    console.error("Chat API error:", error);

    addMessage(
      "assistant",
      "متأسفم، در ارتباط با سرور مشکلی پیش آمد. " +
      "اتصال اینترنت را بررسی کن و دوباره تلاش کن.\n" +
      "جزئیات: " + (error.message || "خطای ناشناخته"),
      chatId
    );
  } finally {
    if (sendButton) sendButton.disabled = false;

    if (input && currentChatId === chatId) {
      input.focus();
    }
  }
}

// تنظیمات اولیه
function initializeSettings() {
  const prefs = getPrefs();

  if ($("#businessName")) {
    $("#businessName").value = prefs.businessName || "";
  }

  if ($("#country") && prefs.country) {
    $("#country").value = prefs.country;
  }

  if ($("#language") && prefs.language) {
    $("#language").value = prefs.language;
  }

  const saveButton = $("#saveSetup");

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const updated = {
        businessName: $("#businessName")?.value.trim() || "",
        country: $("#country")?.value || "افغانستان",
        language: $("#language")?.value || "فارسی"
      };

      savePrefs(updated);
      toast("تنظیمات ذخیره شد.");
    });
  }
}

// دکمه‌های نوع کسب‌وکار
function initializeBusinessButtons() {
  document.querySelectorAll(".biz").forEach(button => {
    button.addEventListener("click", () => {
      selectedBusiness = button.dataset.business || "";

      const chat = activeChat();
      if (chat) {
        chat.business = selectedBusiness;
        chat.updatedAt = Date.now();
        saveChats();
      }

      updateBusinessButtons();
      renderBusinessContext();
      toast("نوع کسب‌وکار انتخاب شد.");
    });
  });
}

// فرم ارسال پیام
function initializeChatForm() {
  const form = $("#chatForm");
  const input = $("#messageInput");

  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();

      if (input) {
        sendMessage(input.value);
      }
    });
  }

  if (input) {
    input.addEventListener("input", resizeTextarea);
  }

  const newButton = $("#newChatButton");
  if (newButton) {
    newButton.addEventListener("click", newChat);
  }
}

// ابزارهای آماده
function initializeTools() {
  document.querySelectorAll(".tool-info").forEach(button => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt;
      if (!prompt) return;

      if (!activeChat()) newChat();

      const input = $("#messageInput");
      if (input) {
        input.value = prompt;
        resizeTextarea();
        input.focus();
      }

      $("#chat")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  const socialButton = $("#socialHelp");

  if (socialButton) {
    socialButton.addEventListener("click", () => {
      const prompt =
        "برای کسب‌وکارم یک برنامه کاربردی برای بازاریابی در شبکه‌های اجتماعی تهیه کن.";

      if (!activeChat()) newChat();

      const input = $("#messageInput");

      if (input) {
        input.value = prompt;
        resizeTextarea();
        input.focus();
      }

      $("#chat")?.scrollIntoView({ behavior: "smooth" });
    });
  }
}

// نصب برنامه
function initializeInstall() {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });

  const installButton = $("#installApp");

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!installPrompt) {
        toast(
          "اگر گزینهٔ نصب نمایش داده نمی‌شود، از منوی مرورگر «Add to Home screen» را بررسی کن."
        );
        return;
      }

      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    });
  }
}

// بازیابی تاریخچه از مرورگر
function loadChats() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (Array.isArray(stored)) {
      chats = stored.filter(chat =>
        chat &&
        typeof chat.id === "string" &&
        Array.isArray(chat.messages)
      );
    }
  } catch (error) {
    console.error("Could not load chat history:", error);
    chats = [];
  }

  chats.sort((a, b) =>
    (b.updatedAt || 0) - (a.updatedAt || 0)
  );

  if (chats.length > 0) {
    openChat(chats[0].id);
  } else {
    newChat();
  }
}

// راه‌اندازی برنامه
function initializeApp() {
  initializeSettings();
  initializeChatForm();
  initializeBusinessButtons();
  initializeTools();
  initializeInstall();

  loadChats();
  resizeTextarea();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch(error => {
          console.warn("Service worker:", error);
        });
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );
} else {
  initializeApp();
}
