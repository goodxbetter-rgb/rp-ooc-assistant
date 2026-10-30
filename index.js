import { getContext } from "../../../extensions.js";

const EXTENSION_ID = "rp-ooc-assistant";
const POSITION_KEY = `${EXTENSION_ID}-position`;

const OOC_PROMPT = (question) => `
You are an assistant for the user's ongoing roleplay.

Answer the user's question about the current story using the available chat context.
The user may ask about characters, NPCs, relationships, objects, events, locations,
worldbuilding, or details they may have forgotten or found confusing.

USER QUESTION:
${question}

RULES:
- Answer the question directly and clearly.
- Prioritize facts established in the current roleplay context.
- Do not invent facts and present them as established information.
- If the context does not contain the answer, say that it is not established or not clear.
- You may distinguish confirmed facts from reasonable interpretation when useful.
- Do not continue the roleplay scene.
- Do not write dialogue, actions, thoughts, or feelings for {{user}}.
- Do not send anything to the main chat.
- Answer in Thai unless the user asks for another language.
- Keep the answer focused; provide enough detail to resolve the user's question.
`;

let launcher;
let panel;
let questionView;
let answerView;
let questionInput;
let answerOutput;
let submitButton;
let regenerateButton;
let askAgainButton;
let isGenerating = false;
let lastQuestion = "";

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function getSavedPosition() {
    try {
        const value = JSON.parse(localStorage.getItem(POSITION_KEY));
        if (value && Number.isFinite(value.left) && Number.isFinite(value.top)) {
            return value;
        }
    } catch {
        // Ignore invalid saved position.
    }
    return null;
}

function clampPosition(left, top) {
    const margin = 8;
    const rect = panel.getBoundingClientRect();

    return {
        left: Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin)),
        top: Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin)),
    };
}

function savePosition() {
    if (!panel) return;

    const rect = panel.getBoundingClientRect();

    localStorage.setItem(POSITION_KEY, JSON.stringify({
        left: rect.left,
        top: rect.top,
    }));
}

function placePanel() {
    panel.style.transform = "none";

    const saved = getSavedPosition();

    if (saved) {
        const position = clampPosition(saved.left, saved.top);

        panel.style.left = `${position.left}px`;
        panel.style.top = `${position.top}px`;
    } else {
        const rect = panel.getBoundingClientRect();

        panel.style.left = `${Math.max(8, (window.innerWidth - rect.width) / 2)}px`;
        panel.style.top = `${Math.max(8, (window.innerHeight - rect.height) / 2)}px`;
    }
}

function showQuestionView() {
    questionView.hidden = false;
    answerView.hidden = true;

    panel.classList.remove("ooca-answer-mode");

    questionInput.focus();
}

function showAnswerView() {
    questionView.hidden = true;
    answerView.hidden = false;

    panel.classList.add("ooca-answer-mode");
}

function setGenerating(value) {
    isGenerating = value;

    submitButton.disabled = value;
    regenerateButton.disabled = value;

    submitButton.textContent = value ? "กำลังคิด..." : "ถามผู้ช่วย";
    regenerateButton.textContent = value ? "กำลังสร้าง..." : "สร้างใหม่";
}

function normalizeResult(result) {
    if (typeof result === "string") {
        return result.trim();
    }

    if (result && typeof result === "object") {
        for (const key of ["text", "content", "output", "response"]) {
            if (typeof result[key] === "string") {
                return result[key].trim();
            }
        }
    }

    return "";
}

async function askAssistant(question) {
    if (isGenerating) return;

    const cleanQuestion = String(question || "").trim();

    if (!cleanQuestion) return;

    lastQuestion = cleanQuestion;

    answerOutput.textContent = "กำลังอ่านบริบทและหาคำตอบ...";

    showAnswerView();
    setGenerating(true);

    try {
        const context = getContext();

        if (!context || typeof context.generateQuietPrompt !== "function") {
            throw new Error("ไม่พบ generateQuietPrompt ใน SillyTavern เวอร์ชันนี้");
        }

        const result = await context.generateQuietPrompt({
            quietPrompt: OOC_PROMPT(cleanQuestion),
        });

        const answer = normalizeResult(result);

        answerOutput.textContent =
            answer || "ไม่ได้รับคำตอบจาก AI ลองกดสร้างใหม่อีกครั้ง";

    } catch (error) {
        console.error(`[${EXTENSION_ID}]`, error);

        answerOutput.textContent =
            `เกิดข้อผิดพลาด: ${error?.message || "ไม่สามารถสร้างคำตอบได้"}`;

    } finally {
        setGenerating(false);
    }
}

function makeDraggable(handle) {
    let activePointer = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    handle.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const rect = panel.getBoundingClientRect();

        panel.style.transform = "none";
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;

        activePointer = event.pointerId;

        startX = event.clientX;
        startY = event.clientY;

        originLeft = rect.left;
        originTop = rect.top;

        handle.setPointerCapture(event.pointerId);

        event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
        if (activePointer !== event.pointerId) return;

        const position = clampPosition(
            originLeft + event.clientX - startX,
            originTop + event.clientY - startY,
        );

        panel.style.left = `${position.left}px`;
        panel.style.top = `${position.top}px`;
    });

    const stop = (event) => {
        if (activePointer !== event.pointerId) return;

        activePointer = null;

        savePosition();
    };

    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
}

function createUI() {
    if (document.getElementById(`${EXTENSION_ID}-launcher`)) return;

    launcher = el("button", "ooca-launcher", "OOC");

    launcher.id = `${EXTENSION_ID}-launcher`;
    launcher.type = "button";
    launcher.title = "เปิด RP OOC Assistant";
    launcher.setAttribute("aria-label", "เปิด RP OOC Assistant");

    panel = el("section", "ooca-panel");

    panel.id = `${EXTENSION_ID}-panel`;
    panel.setAttribute("aria-label", "RP OOC Assistant");

    const header = el("div", "ooca-header");

    const titleGroup = el("div", "ooca-title-group");

    titleGroup.append(
        el("div", "ooca-title", "RP OOC Assistant"),
        el("div", "ooca-subtitle", "ผู้ช่วยตอบคำถามเกี่ยวกับเนื้อเรื่อง"),
    );

    const headerButtons = el("div", "ooca-header-buttons");

    const minimizeButton = el("button", "ooca-icon-button", "—");

    minimizeButton.type = "button";
    minimizeButton.title = "ย่อหน้าต่าง";

    const closeButton = el("button", "ooca-icon-button", "×");

    closeButton.type = "button";
    closeButton.title = "ปิดหน้าต่าง";

    headerButtons.append(minimizeButton, closeButton);

    header.append(titleGroup, headerButtons);

    const body = el("div", "ooca-body");

    questionView = el("div", "ooca-question-view");

    const questionLabel = el("label", "ooca-label", "ถามเกี่ยวกับเนื้อเรื่อง");

    questionInput = el("textarea", "ooca-input");

    questionInput.rows = 4;
    questionInput.placeholder = "เช่น แมวสีดำที่ปรากฏในฉากเป็นแมวของใคร?";

    const questionHint = el(
        "div",
        "ooca-hint",
        "คำถามจะถูกส่งให้ AI แบบเงียบ ๆ ไม่ปรากฏในแชตหลัก"
    );

    submitButton = el("button", "ooca-primary-button", "ถามผู้ช่วย");

    submitButton.type = "button";

    questionView.append(
        questionLabel,
        questionInput,
        questionHint,
        submitButton
    );

    answerView = el("div", "ooca-answer-view");

    const answerLabel = el("div", "ooca-label", "คำตอบ");

    answerOutput = el("div", "ooca-answer-output");

    answerOutput.setAttribute("aria-live", "polite");

    const answerActions = el("div", "ooca-answer-actions");

    const copyButton = el("button", "ooca-secondary-button", "คัดลอก");

    copyButton.type = "button";

    regenerateButton = el("button", "ooca-primary-button", "สร้างใหม่");

    regenerateButton.type = "button";

    askAgainButton = el("button", "ooca-secondary-button", "ถามคำถามใหม่");

    askAgainButton.type = "button";

    answerActions.append(
        copyButton,
        regenerateButton,
        askAgainButton
    );

    answerView.append(
        answerLabel,
        answerOutput,
        answerActions
    );

    body.append(questionView, answerView);

    panel.append(header, body);

    document.body.append(launcher, panel);

    launcher.addEventListener("click", () => {
        const opening = !panel.classList.contains("ooca-visible");

        panel.classList.toggle("ooca-visible", opening);

        if (opening) {
            panel.classList.remove("ooca-minimized");

            minimizeButton.textContent = "—";

            placePanel();

            if (answerView.hidden) {
                questionInput.focus();
            }
        }
    });

    closeButton.addEventListener("click", () => {
        panel.classList.remove("ooca-visible");
    });

    minimizeButton.addEventListener("click", () => {
        panel.classList.toggle("ooca-minimized");

        minimizeButton.textContent =
            panel.classList.contains("ooca-minimized") ? "□" : "—";
    });

    submitButton.addEventListener("click", () => {
        askAssistant(questionInput.value);
    });

    questionInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();

            askAssistant(questionInput.value);
        }
    });

    regenerateButton.addEventListener("click", () => {
        if (lastQuestion) {
            askAssistant(lastQuestion);
        }
    });

    askAgainButton.addEventListener("click", () => {
        questionInput.value = "";

        showQuestionView();
    });

    copyButton.addEventListener("click", async () => {
        const text = answerOutput.textContent.trim();

        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);

            copyButton.textContent = "คัดลอกแล้ว";

            window.setTimeout(() => {
                copyButton.textContent = "คัดลอก";
            }, 1200);

        } catch (error) {
            console.warn(`[${EXTENSION_ID}] Clipboard unavailable`, error);

            copyButton.textContent = "คัดลอกไม่ได้";
        }
    });

    makeDraggable(header);

    showQuestionView();

    answerView.hidden = true;
}

function initialize() {
    createUI();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
    initialize();
}

window.addEventListener("resize", () => {
    if (!panel || !panel.classList.contains("ooca-visible")) return;

    const rect = panel.getBoundingClientRect();

    const position = clampPosition(rect.left, rect.top);

    panel.style.transform = "none";
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
});
