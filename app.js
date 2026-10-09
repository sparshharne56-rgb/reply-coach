const imageInput = document.querySelector("#image-input");
const uploadZone = document.querySelector("#upload-zone");
const uploadEmpty = document.querySelector("#upload-empty");
const previewWrap = document.querySelector("#preview-wrap");
const previewImage = document.querySelector("#preview-image");
const ocrButton = document.querySelector("#ocr-button");
const ocrStatus = document.querySelector("#ocr-status");
const conversation = document.querySelector("#conversation");
const intent = document.querySelector("#intent");
const generateButton = document.querySelector("#generate-button");
const generateStatus = document.querySelector("#generate-status");
const emptyState = document.querySelector("#empty-state");
const suggestionList = document.querySelector("#suggestion-list");
const coachNote = document.querySelector("#coach-note");

let imageUrl = "";
let ocrScriptPromise;

function setImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    ocrStatus.textContent = "Choose an image file to read a screenshot.";
    ocrStatus.className = "ocr-status error";
    return;
  }
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file);
  previewImage.src = imageUrl;
  previewWrap.hidden = false;
  uploadEmpty.hidden = true;
  ocrButton.disabled = false;
  ocrStatus.textContent = "Screenshot ready. Text is read on this device.";
  ocrStatus.className = "ocr-status";
}

function clearImage() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = "";
  imageInput.value = "";
  previewImage.removeAttribute("src");
  previewWrap.hidden = true;
  uploadEmpty.hidden = false;
  ocrButton.disabled = true;
  ocrStatus.textContent = "Screenshot text is read on this device.";
  ocrStatus.className = "ocr-status";
}

async function loadOcrLibrary() {
  if (window.Tesseract) return window.Tesseract;
  if (!ocrScriptPromise) {
    ocrScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error("Could not load the on-device text reader. Check your internet connection, or paste the chat instead."));
      document.head.append(script);
    });
  }
  return ocrScriptPromise;
}

document.querySelector("#choose-image").addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => setImage(imageInput.files[0]));
document.querySelector("#remove-image").addEventListener("click", clearImage);

for (const eventName of ["dragenter", "dragover"]) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
  });
}
uploadZone.addEventListener("drop", (event) => setImage(event.dataTransfer.files[0]));

ocrButton.addEventListener("click", async () => {
  if (!imageUrl) return;
  ocrButton.disabled = true;
  ocrButton.querySelector("span").textContent = "Reading screenshot...";
  ocrStatus.textContent = "Loading the text reader. The screenshot stays on your device.";
  ocrStatus.className = "ocr-status";
  try {
    const tesseract = await loadOcrLibrary();
    const result = await tesseract.recognize(imageUrl, "eng", {
      logger: ({ status, progress }) => {
        if (status === "recognizing text") {
          ocrStatus.textContent = `Reading text... ${Math.round(progress * 100)}%`;
        }
      },
    });
    const text = result.data.text.trim();
    if (!text) {
      ocrStatus.textContent = "I couldn't find readable text. Try a clearer screenshot, or paste the chat below.";
      ocrStatus.className = "ocr-status error";
    } else {
      conversation.value = text;
      ocrStatus.textContent = "Done. Check the text below and fix anything that looks off.";
      ocrStatus.className = "ocr-status success";
    }
  } catch (error) {
    ocrStatus.textContent = error.message || "Couldn't read that image. You can paste the chat instead.";
    ocrStatus.className = "ocr-status error";
  } finally {
    ocrButton.disabled = false;
    ocrButton.querySelector("span").textContent = "Read screenshot";
  }
});

function getTone() {
  return document.querySelector('input[name="tone"]:checked').value;
}

function getLastMessage(text) {
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).at(-1) || "";
}

function getSuggestions(chat, thought, tone) {
  const last = getLastMessage(chat).replace(/^[^:]{1,24}:\s*/, "");
  const lower = last.toLowerCase();
  const chosenThought = thought.trim().replace(/[.!?]+$/, "");
  const openings = {
    natural: ["That's fair.", "Oh, nice.", "I get that."],
    warm: ["Aw, I'm glad you told me.", "That sounds lovely.", "I appreciate you sharing that."],
    playful: ["Okay, I need the full story.", "Wait, now I'm curious.", "Well, you've got my attention."],
  }[tone];
  let first;
  let second;
  let third;

  if (/^(hey|heyy*|hi|hello|yo|sup)\b/i.test(lower)) {
    first = ["Hey! How's your day going?", "Hey, good to hear from you. What have you been up to?", "Hey :) what's new?"];
  } else if (/how are you|how's (your|it going)|how have you been|what's up|what are you up to/i.test(lower)) {
    first = ["I've been [how you actually feel] lately. How about you?", "Hey, thanks for asking. What's been the best part of your day?", "Doing okay, and glad you asked. How's your week going?"];
  } else if (/\b(sorry|apolog|my bad)\b/i.test(lower)) {
    first = ["Thanks for saying that. I appreciate it.", "I hear you. Thanks for being honest with me.", "Thanks for owning that. I wanted to talk about it too."];
  } else if (/\b(cute|handsome|pretty|beautiful|love your|like you)\b/i.test(lower)) {
    first = ["That's really nice of you to say. Thank you!", "Okay, that made me smile. You're pretty great yourself.", "You're making me blush a little. Thank you :) "];
  } else if (/\b(wanna|want to|should we|free on|are you free|come with)\b/i.test(lower)) {
    first = ["That sounds fun. What did you have in mind?", "I'd be up for that. When were you thinking?", "Maybe! Tell me a little more about the plan?"];
  } else if (last.includes("?")) {
    first = ["My honest answer is [your answer]. What about you?", "Good question. Let me think... [your answer].", "I think [your real take]. What made you ask?"];
  } else {
    first = [`${openings[0]} What was that like for you?`, `${openings[1]} How did you get into that?`, `${openings[2]} Tell me more?`];
  }

  if (chosenThought) {
    second = [`${chosenThought}. ${tone === "playful" ? "Okay, your turn:" : "What do you think?"}`, `${tone === "warm" ? "Honestly, " : ""}${chosenThought}. ${tone === "playful" ? "Now I'm curious about your take." : "How about you?"}`, `${chosenThought}. ${tone === "natural" ? "Anyway, tell me more about your side." : "I'd love to hear what you think, too."}`];
    third = [`${openings[0]} ${chosenThought}.`, `${chosenThought}. ${openings[1]}`, `${openings[2]} ${chosenThought}.`];
  } else {
    const followUps = {
      natural: ["What did you like most about it?", "How did you get into that?", "Wait, tell me more when you get a chance."],
      warm: ["What did you enjoy most about it?", "I'd love to hear how you got into that.", "No rush, but I'd love to hear more when you have a chance."],
      playful: ["Okay, what was the best part?", "Wait, how did this whole thing start?", "Okay, I need the director's cut."],
    }[tone];
    second = [first[1], followUps[0], followUps[1]];
    third = [first[2], followUps[1], followUps[2]];
  }

  if (tone === "warm" && !chosenThought) first = first.map((reply) => reply.replace("Hey!", "Hey, it's nice to hear from you!").replace("That sounds fun.", "That sounds really nice."));
  if (tone === "playful" && !chosenThought) first = first.map((reply) => reply.replace("Hey!", "Hey you!").replace("What was that like for you?", "Okay, I need the story.").replace("How did you get into that?", "Wait, how did this start?").replace("Tell me more?", "Go on, I'm listening."));

  return [first[0], Array.isArray(second) ? second[1] : second, Array.isArray(third) ? third[2] : third];
}

function makeSuggestionCard(text, index) {
  const labels = ["A SIMPLE REPLY", "KEEP IT GOING", "LOW-PRESSURE OPTION"];
  const card = document.createElement("article");
  card.className = "suggestion-card";
  const meta = document.createElement("div");
  meta.className = "suggestion-meta";
  const label = document.createElement("span");
  label.className = "suggestion-label";
  label.textContent = labels[index];
  const copy = document.createElement("button");
  copy.className = "copy-button";
  copy.type = "button";
  copy.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1"/><path d="M10 5V3.5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1"/></svg><span>Copy</span>';
  copy.addEventListener("click", async () => {
    const value = textBox.innerText.trim();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = value;
      document.body.append(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
    }
    copy.querySelector("span").textContent = "Copied";
    window.setTimeout(() => { copy.querySelector("span").textContent = "Copy"; }, 1400);
  });
  meta.append(label, copy);
  const textBox = document.createElement("div");
  textBox.className = "suggestion-text";
  textBox.contentEditable = "true";
  textBox.setAttribute("role", "textbox");
  textBox.setAttribute("aria-label", `${labels[index]}, editable reply`);
  textBox.textContent = text;
  card.append(meta, textBox);
  return card;
}

generateButton.addEventListener("click", () => {
  const chat = conversation.value.trim();
  if (!chat) {
    generateStatus.textContent = "Add the chat first, or paste the last message.";
    conversation.focus();
    return;
  }
  generateStatus.textContent = "";
  suggestionList.replaceChildren(...getSuggestions(chat, intent.value, getTone()).map(makeSuggestionCard));
  emptyState.hidden = true;
  suggestionList.hidden = false;
  coachNote.hidden = false;
});

conversation.addEventListener("input", () => { generateStatus.textContent = ""; });

window.addEventListener("beforeunload", () => {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
});
