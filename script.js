
// ==========================================
// TBOLT IMAGE COMPRESSOR
// Main JavaScript Functionality
// ==========================================


// GET HTML ELEMENTS

const fileInput = document.getElementById("image-input");

const dropArea = document.getElementById("drop-area");

const browseButton = document.getElementById("browse-button");

const compressButton = document.getElementById("compress-button");

const qualitySlider = document.getElementById("quality");

const qualityValue = document.getElementById("quality-value");

const outputFormat = document.getElementById("output-format");

const errorMessage = document.getElementById("error-message");

const resultSection = document.getElementById("result-section");

const originalPreview = document.getElementById("original-preview");

const compressedPreview = document.getElementById("compressed-preview");

const originalSize = document.getElementById("original-size");

const compressedSize = document.getElementById("compressed-size");

const savingLabel = document.getElementById("saving-label");

const downloadButton = document.getElementById("download-button");


// GLOBAL VARIABLES

let selectedFile = null;

let originalURL = null;

let compressedURL = null;


// ==========================================
// FILE SIZE FORMATTER
// ==========================================

function formatBytes(bytes) {

    if (bytes < 1024) {
        return bytes + " B";
    }

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
// IMAGE SELECTION
// ==========================================

function loadImage(file) {

    clearError();

    resultSection.hidden = true;

    if (!file) return;


    // Supported formats

    const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!supportedTypes.includes(file.type)) {

        showError("Please select a JPG, PNG or WebP image.");

        return;

    }


    // Maximum file size: 20 MB

    if (file.size > 20 * 1024 * 1024) {

        showError("Image size must be less than 20 MB.");

        return;

    }


    selectedFile = file;


    // Clear previous image URL

    if (originalURL) {
        URL.revokeObjectURL(originalURL);
    }

    if (compressedURL) {
        URL.revokeObjectURL(compressedURL);
        compressedURL = null;
    }


    // Create preview

    originalURL = URL.createObjectURL(file);

    originalPreview.src = originalURL;

    originalSize.textContent = formatBytes(file.size);


    // Enable compression

    compressButton.disabled = false;

    compressButton.textContent = "Compress Image";

}


// ==========================================
// BROWSE BUTTON
// ==========================================

browseButton.addEventListener("click", function(event) {

    event.stopPropagation();

    fileInput.click();

});


dropArea.addEventListener("click", function(event) {

    if (event.target.closest("#browse-button")) return;

    fileInput.click();

});


fileInput.addEventListener("change", function() {

    loadImage(fileInput.files[0]);

    fileInput.value = "";

});


// ==========================================
// DRAG AND DROP
// ==========================================

["dragenter", "dragover"].forEach(function(eventName) {

    dropArea.addEventListener(eventName, function(event) {

        event.preventDefault();

        dropArea.classList.add("drag");

    });

});


["dragleave", "drop"].forEach(function(eventName) {

    dropArea.addEventListener(eventName, function(event) {

        event.preventDefault();

        dropArea.classList.remove("drag");

    });

});


dropArea.addEventListener("drop", function(event) {

    const file = event.dataTransfer.files[0];

    loadImage(file);

});


// ==========================================
// QUALITY SLIDER
// ==========================================

qualitySlider.addEventListener("input", function() {

    qualityValue.textContent = qualitySlider.value + "%";

});


// ==========================================
// OUTPUT FORMAT
// ==========================================

outputFormat.addEventListener("change", function() {

    if (outputFormat.value === "image/png") {

        qualitySlider.disabled = true;

        qualityValue.textContent = "Lossless";

    } else {

        qualitySlider.disabled = false;

        qualityValue.textContent = qualitySlider.value + "%";

    }

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

        // Load selected image

        const bitmap = await createImageBitmap(selectedFile);


        // Create canvas

        const canvas = document.createElement("canvas");

        canvas.width = bitmap.width;

        canvas.height = bitmap.height;


        const format = outputFormat.value;

        const context = canvas.getContext("2d");


        if (!context) {

            throw new Error("Your browser does not support image processing.");

        }


        // JPG does not support transparency

        if (format === "image/jpeg") {

            context.fillStyle = "#ffffff";

            context.fillRect(0, 0, canvas.width, canvas.height);

        }


        // Draw image

        context.drawImage(bitmap, 0, 0);

        bitmap.close();


        // Quality setting

        const quality = format === "image/png"
            ? undefined
            : Number(qualitySlider.value) / 100;


        // Convert canvas to compressed image

        const compressedBlob = await new Promise(function(resolve, reject) {

            canvas.toBlob(function(blob) {

                if (!blob) {

                    reject(new Error("Image compression failed. Try another format."));

                    return;

                }

                resolve(blob);

            }, format, quality);

        });


        // Release previous compressed URL

        if (compressedURL) {

            URL.revokeObjectURL(compressedURL);

        }


        // Create compressed preview

        compressedURL = URL.createObjectURL(compressedBlob);

        compressedPreview.src = compressedURL;


        // Calculate file size

        const originalBytes = selectedFile.size;

        const compressedBytes = compressedBlob.size;

        originalSize.textContent = formatBytes(originalBytes);

        compressedSize.textContent = formatBytes(compressedBytes);


        // Calculate savings

        const difference = originalBytes - compressedBytes;

        const percentage = Math.round(
            (difference / originalBytes) * 100
        );


        if (difference > 0) {

            savingLabel.textContent = percentage + "% smaller";

        } else {

            savingLabel.textContent = "No size reduction";

        }


        // File extension

        const extensions = {

            "image/jpeg": "jpg",

            "image/png": "png",

            "image/webp": "webp"

        };


        const extension = extensions[format];


        const originalName = selectedFile.name.replace(/\.[^.]+$/, "");

        const downloadName = originalName + "-compressed." + extension;


        // Download button

        downloadButton.href = compressedURL;

        downloadButton.download = downloadName;


        // Show result

        resultSection.hidden = false;

        resultSection.scrollIntoView({

            behavior: "smooth",

            block: "nearest"

        });


    } catch (error) {

        showError(
            error.message || "Something went wrong. Please try again."
        );

    } finally {

        compressButton.disabled = false;

        compressButton.textContent = "Compress Image";

    }

});


// ==========================================
// END OF TBOLT IMAGE COMPRESSOR
// ==========================================
