
// ==========================================
// TBOLT IMAGE COMPRESSOR
// Fixed Image Selection + Preview
// ==========================================

const fileInput = document.getElementById("image-input");
const dropArea = document.getElementById("drop-area");
const browseButton = document.getElementById("browse-button");
const compressButton = document.getElementById("compress-button");

const qualitySlider = document.getElementById("quality");
const qualityValue = document.getElementById("quality-value");

const errorMessage = document.getElementById("error-message");
const resultSection = document.getElementById("result-section");

const originalPreview = document.getElementById("original-preview");
const compressedPreview = document.getElementById("compressed-preview");

const originalSize = document.getElementById("original-size");
const compressedSize = document.getElementById("compressed-size");

const savingLabel = document.getElementById("saving-label");
const downloadButton = document.getElementById("download-button");

let selectedFile = null;
let originalURL = null;
let compressedURL = null;


// ==========================================
// FILE FORMAT DETECTION
// ==========================================

function getImageType(file) {

    if (file.type && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return file.type;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    const formats = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp"
    };

    return formats[extension] || null;
}


// ==========================================
// FILE SIZE FORMATTER
// ==========================================

function formatBytes(bytes) {

    if (bytes < 1024) return bytes + " B";

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// ==========================================
// ERROR HANDLING
// ==========================================

function showError(message) {

    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {

    errorMessage.textContent = "";
    errorMessage.hidden = true;
}


// ==========================================
// RESET RESULTS
// ==========================================

function resetResults() {

    resultSection.hidden = true;

    if (compressedURL) {
        URL.revokeObjectURL(compressedURL);
        compressedURL = null;
    }

    compressedPreview.removeAttribute("src");
    downloadButton.removeAttribute("href");

    savingLabel.textContent = "";
}


// ==========================================
// IMAGE LOADING
// ==========================================

function loadImage(file) {

    clearError();

    if (!file) return;

    const imageType = getImageType(file);

    if (!imageType) {
        showError("Please select a JPG, PNG or WebP image.");
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showError("Image size must be less than 20 MB.");
        return;
    }

    selectedFile = file;

    resetResults();

    if (originalURL) {
        URL.revokeObjectURL(originalURL);
    }

    originalURL = URL.createObjectURL(file);

    originalPreview.onload = function() {

        originalSize.textContent = formatBytes(file.size);

        compressButton.disabled = false;
        compressButton.textContent = "Compress Image";

    };

    originalPreview.onerror = function() {

        showError("Could not display this image. Please try another file.");

        compressButton.disabled = true;

    };

    originalPreview.src = originalURL;
}


// ==========================================
// BROWSE BUTTON
// ==========================================

browseButton.addEventListener("click", function(event) {

    event.preventDefault();
    event.stopPropagation();

    fileInput.click();
});


// Clicking upload area opens picker

dropArea.addEventListener("click", function(event) {

    if (event.target.closest("#browse-button")) return;

    fileInput.click();
});


// File picker selection

fileInput.addEventListener("change", function(event) {

    const file = event.target.files && event.target.files[0];

    if (file) {
        loadImage(file);
    }

    // Allow selecting the same file again
    fileInput.value = "";
});


// ==========================================
// DRAG & DROP
// ==========================================

["dragenter", "dragover"].forEach(function(eventName) {

    dropArea.addEventListener(eventName, function(event) {

        event.preventDefault();
        event.stopPropagation();

        dropArea.classList.add("drag");
    });
});


["dragleave", "drop"].forEach(function(eventName) {

    dropArea.addEventListener(eventName, function(event) {

        event.preventDefault();
        event.stopPropagation();

        dropArea.classList.remove("drag");
    });
});


dropArea.addEventListener("drop", function(event) {

    const files = event.dataTransfer.files;

    if (files && files.length > 0) {
        loadImage(files[0]);
    }
});


// ==========================================
// QUALITY SLIDER
// ==========================================

qualitySlider.addEventListener("input", function() {

    qualityValue.textContent = qualitySlider.value + "%";
});


// ==========================================
// IMAGE COMPRESSION
// ==========================================

compressButton.addEventListener("click", async function() {

    if (!selectedFile) return;

    clearError();

    compressButton.disabled = true;
    compressButton.textContent = "Compressing...";

    try {

        const imageType = getImageType(selectedFile);

        const bitmap = await createImageBitmap(selectedFile);

        const canvas = document.createElement("canvas");

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const context = canvas.getContext("2d");

        if (!context) {
            bitmap.close();
            throw new Error("Image processing is not supported in this browser.");
        }

        // White background for JPEG only
        if (imageType === "image/jpeg") {

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(bitmap, 0, 0);

        bitmap.close();

        // Preserve the original format
        const quality = imageType === "image/png"
            ? undefined
            : Number(qualitySlider.value) / 100;

        const compressedBlob = await new Promise(function(resolve, reject) {

            canvas.toBlob(function(blob) {

                if (!blob) {
                    reject(new Error("Compression failed. Please try again."));
                    return;
                }

                if (blob.type !== imageType) {
                    reject(new Error("Browser could not preserve original format."));
                    return;
                }

                resolve(blob);

            }, imageType, quality);
        });


        if (compressedURL) {
            URL.revokeObjectURL(compressedURL);
        }

        compressedURL = URL.createObjectURL(compressedBlob);

        compressedPreview.src = compressedURL;

        const originalBytes = selectedFile.size;
        const compressedBytes = compressedBlob.size;

        originalSize.textContent = formatBytes(originalBytes);
        compressedSize.textContent = formatBytes(compressedBytes);

        const difference = originalBytes - compressedBytes;

        const percentage = Math.round(
            (difference / originalBytes) * 100
        );

        if (difference > 0) {
            savingLabel.textContent = percentage + "% smaller";
        } else if (difference === 0) {
            savingLabel.textContent = "Same file size";
        } else {
            savingLabel.textContent = "File size increased";
        }

        const originalName = selectedFile.name.replace(/\.[^.]+$/, "");

        const extensions = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        const extension = extensions[imageType];

        downloadButton.href = compressedURL;

        downloadButton.download =
            originalName + "-compressed." + extension;

        resultSection.hidden = false;

        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } catch (error) {

        showError(error.message || "Something went wrong.");

    } finally {

        compressButton.disabled = false;
        compressButton.textContent = "Compress Image";
    }
});


// ==========================================
// INITIAL SETTINGS
// ==========================================

compressButton.disabled = true;

qualityValue.textContent = qualitySlider.value + "%";

// ==========================================
// END
// ==========================================
