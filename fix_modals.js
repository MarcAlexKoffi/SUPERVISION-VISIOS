const fs = require("fs");
const histPath = "FRONT/src/app/history/history.html";
const userHistPath = "FRONT/src/app/user-history/user-history.html";
const patch3Path = "FRONT/patch3.js";

let historyHtml = fs.readFileSync(histPath, "utf8");
let userHtml = fs.readFileSync(userHistPath, "utf8");
let patch3 = fs.readFileSync(patch3Path, "utf8");

// Extract the Details Modal from user-history
let detailsModalMatch = userHtml.match(/<!-- View Details Modal -->\s*<div[^>]*\*ngIf="showModal && selectedSupervision"[\s\S]*?<!-- End Modal Overlay -->/);
let detailsModal = detailsModalMatch ? detailsModalMatch[0] : "";

// Extract Confirmation Modal
let confModalMatch = userHtml.match(/<!-- Delete Confirmation Modal -->\s*<app-confirmation-modal[\s\S]*?<\/app-confirmation-modal>/);
let confModal = confModalMatch ? confModalMatch[0] : "";

// Extract Async details modal from patch3
let asyncModalMatch = patch3.match(/<!-- Async Supervision Details Modal -->[\s\S]*?(?=`;)/);
let asyncModal = asyncModalMatch ? asyncModalMatch[0] : "";

let newContent = historyHtml;
if (!historyHtml.includes('<!-- View Details Modal -->')) {
    newContent += "\n\n" + detailsModal;
}
if (!historyHtml.includes('<!-- Delete Confirmation Modal -->')) {
    newContent += "\n\n" + confModal;
}
if (!historyHtml.includes('<!-- Async Supervision Details Modal -->') && asyncModal) {
    newContent += "\n\n" + asyncModal;
}

fs.writeFileSync(histPath, newContent, "utf8");
console.log("Details, confirmation and async modals successfully added to history.html");
