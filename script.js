const processButton = document.getElementById("processButton");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const status = document.getElementById("status");
const urlList = document.getElementById("urlList");
const uploadArea = document.querySelector(".upload-area");
const saveTextButton = document.getElementById("saveTextButton");

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadArea.classList.remove("dragover");

  // Get the first dropped file
  const file = event.dataTransfer.files[0];

  // Set the fileInput's value to the dropped file
  fileInput.files = event.dataTransfer.files; 

  // Simulate a click on the process button
  processButton.click(); 
});

processButton.addEventListener("click", () => {
    const file = fileInput.files[0];

    if (!file) {
        output.textContent = "Please upload a file.";
        return;
    }

    const fileType = file.type;
    status.textContent = "Processing, please wait...";

    if (fileType.includes("pdf")) {
        processPDF(file);
    } else if (fileType.includes("image")) {
        processImage(file);
    } else if (fileType.includes("text")) {
        processText(file);
    } else {
        status.textContent = "Unsupported file type.";
    }
});

function processPDF(file) {
    const reader = new FileReader();
    reader.onload = function () {
        pdfjsLib.getDocument(new Uint8Array(reader.result)).promise.then(pdf => {
            let allTextContent = "";
            let promises = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                promises.push(pdf.getPage(pageNum).then(page => {
                    return page.getTextContent().then(textContent => {
                        let pageText = "";
                        let lastY = null; // Keep track of the last Y position

                        textContent.items.forEach(item => {
                            if (lastY !== null && item.transform[5] > lastY + 10) { // Check for a significant Y difference (line break)
                                pageText += "\n"; // Add a newline character
                            }
                            pageText += item.str + " ";
                            lastY = item.transform[5];
                        });
                        return pageText;
                    });
                }));
            }

            Promise.all(promises).then(pagesText => {
                allTextContent = pagesText.join("\n\n"); // Add paragraph breaks between pages
                const urls = extractURLs(allTextContent);
                output.textContent = allTextContent; // Display text in <pre> tag, preserving newlines
                displayUrls(urls, urlList);
                status.textContent = ""; 
            }).catch(error => {
                status.textContent = "Error processing PDF: " + error;
            });
        });
    };
    reader.readAsArrayBuffer(file);
}

saveTextButton.addEventListener("click", () => {
    const extractedText = output.textContent; 
    const blob = new Blob([extractedText], { type: 'text/plain' }); 
    const url = URL.createObjectURL(blob); 

    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_text.txt'; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
});

function processImage(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        status.textContent = "Processing Image...";
        recognizeText(e.target.result, output, urlList);
    };
    reader.readAsDataURL(file);
}

function recognizeText(imageURL, output, urlList) {
    Tesseract.recognize(imageURL, 'eng')
        .then(({ data: { text } }) => {
            const urls = extractURLs(text);
            output.textContent = `Extracted Text:\n${text}`;
            displayUrls(urls, urlList);
            status.textContent = ""; 
        })
        .catch(err => {
            status.textContent = "Error processing image: " + err;
        });
}

function processText(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const textContent = e.target.result;
        const urls = extractURLs(textContent);
        output.textContent = `Extracted Text:\n${textContent}`;
        displayUrls(urls, urlList);
        status.textContent = ""; 
    };
    reader.readAsText(file);
}

function extractURLs(text) {
    const urlRegex = /\b((https?:\/\/|www\.)?[a-zA-Z0-9.-]+\.(com|net|org|io|edu|gov|co|us|uk|info|biz|me|tech|ai|xyz)(\/[^\s]*)?)/gi;
    return text.match(urlRegex) || [];
}

function displayUrls(urls, urlList) {
    urlList.innerHTML = "";
    if (urls.length > 0) {
        urls.forEach(url => {
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
            }
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.href = url;
            link.textContent = url;
            link.target = "_blank";
            listItem.appendChild(link);
            urlList.appendChild(listItem);
        });
    } else {
        const noUrls = document.createElement("li");
        noUrls.textContent = "No URLs detected.";
        urlList.appendChild(noUrls);
    }
}