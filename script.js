
// ==========================================
// TBOLT IMAGE COMPRESSOR
// Complete JavaScript
// ==========================================


// HTML ELEMENTS

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
// RESET PREVIOUS RESULTS
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
// IMAGE VALIDATION AND SELECTION
// ==========================================

function loadImage(file) {

    clearError();

    if (!file) return;

    const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    // Validate image format

    if (!supportedTypes.includes(file.type)) {

        showError("Please select a JPG, PNG or WebP image.");

        return;

    }

    // Maximum file size: 20 MB

    if (file.size > 20 * 1024 * 1024) {

        showError("Image size must be less than 20 MB.");

        return;

    }

    // Save selected file

    selectedFile = file;

    resetResults();

    // Remove previous original preview URL

    if (originalURL) {
        URL.revokeObjectURL(originalURL);
    }

    // Create original preview

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

    // Allows selecting the same file again

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
// IMAGE COMPRESSION
// ==========================================

compressButton.addEventListener("click", async function() {

    if (!selectedFile) return;

    clearError();

    compressButton.disabled = true;

    compressButton.textContent = "Compressing...";


    try {

        // Load image

        const bitmap = await createImageBitmap(selectedFile);


        // Create canvas

        const canvas = document.createElement("canvas");

        canvas.width = bitmap.width;

        canvas.height = bitmap.height;


        const context = canvas.getContext("2d");

        if (!context) {

            bitmap.close();

            throw new Error("Your browser does not support image processing.");

        }


        // Preserve JPEG compatibility

        if (selectedFile.type === "image/jpeg") {

            context.fillStyle = "#ffffff";

            context.fillRect(0, 0, canvas.width, canvas.height);

        }


        // Draw image

        context.drawImage(bitmap, 0, 0);

        bitmap.close();


        // Automatically preserve original format

        const originalFormat = selectedFile.type;


        // PNG does not use the quality slider

        const quality = originalFormat === "image/png"
            ? undefined
            : Number(qualitySlider.value) / 100;


        // Compress image

        const compressedBlob = await new Promise(function(resolve, reject) {

            canvas.toBlob(function(blob) {

                if (!blob) {

                    reject(new Error("Image compression failed. Please try again."));

                    return;

                }


                // Verify original format is preserved

                if (blob.type !== originalFormat) {

                    reject(new Error("Your browser could not preserve the original image format."));

                    return;

                }

                resolve(blob);

            }, originalFormat, quality);

        });


        // Remove previous compressed URL

        if (compressedURL) {

            URL.revokeObjectURL(compressedURL);

        }


        // Create compressed preview

        compressedURL = URL.createObjectURL(compressedBlob);

        compressedPreview.src = compressedURL;


        // Calculate file sizes

        const originalBytes = selectedFile.size;

        const compressedBytes = compressedBlob.size;


        originalSize.textContent = formatBytes(originalBytes);

        compressedSize.textContent = formatBytes(compressedBytes);


        // Calculate compression result

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


        // Preserve original filename and extension

        const originalName = selectedFile.name.replace(/\.[^.]+$/, "");

        const extension = selectedFile.name.split(".").pop();

        const downloadName = originalName + "-compressed." + extension;


        // Download compressed image

        downloadButton.href = compressedURL;

        downloadButton.download = downloadName;


        // Display results

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
// INITIAL SETTINGS
// ==========================================

compressButton.disabled = true;

qualityValue.textContent = qualitySlider.value + "%";


// ==========================================
// END OF TBOLT IMAGE COMPRESSOR
// ==========================================
