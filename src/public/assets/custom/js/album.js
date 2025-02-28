Site.loadPage(async site => {
    const albumNameElt = document.getElementById("albumName");
    const albumFilesElt = document.getElementById("albumFiles");
    let filesRendered = false;
    const albumCardsElt = document.getElementById("albumCards");
    let cardsRendered = false;
    const downloadButton = document.getElementById("downloadFiles");
    let isDownloading = false;

    const iconMap = new Map([
        ['audio', 'bi-file-earmark-music'],
        ['video', 'bi-file-earmark-play'],
        ['text', 'bi-file-earmark-text'],
        ['image', 'bi-file-earmark-image'],
        ['octet', 'bi-file-earmark-binary'],
        ['application/pdf', 'bi-file-earmark-pdf'],
        ['application/x-pdf', 'bi-file-earmark-pdf'],
        ['application/zip', 'bi-file-earmark-zip'],
        ['application/x-zip-compressed', 'bi-file-earmark-zip'],
        ['application/x-7z-compressed', 'bi-file-earmark-zip'],
        ['application/vnd.rar', 'bi-file-earmark-zip'],
        ['application/x-rar-compressed', 'bi-file-earmark-zip'],
        ['application/tar', 'bi-file-earmark-zip'],
        ['application/x-tar', 'bi-file-earmark-zip'],
        ['application/x-gtar', 'bi-file-earmark-zip'],
        ['application/gzip', 'bi-file-earmark-zip'],
        ['application/x-gzip', 'bi-file-earmark-zip'],
        ['application/x-tgz', 'bi-file-earmark-zip'],
        ['application/x-compress', 'bi-file-earmark-zip'],
        ['application/x-compressed', 'bi-file-earmark-zip']
    ]);

    function sizeAsHuman(data) {
        const sizeKB = Math.floor(data / 1024);
        const sizeMB = sizeKB / 1024;
        const sizeGB = sizeMB / 1024;
        if (data < 1024) {
            return `${data} B`;
        }
        if (sizeKB < 1024) {
            return `${sizeKB} KB`;
        }
        if (sizeMB < 1024) {
            return `${sizeMB.toFixed(2)} MB`;
        }
        return `${sizeGB.toFixed(2)} GB`;
    }

    function linkCopyButtons() {
        const copyButtons = document.querySelectorAll(".copyUrl");
        copyButtons.forEach(button => {
            button.addEventListener("click", () => {
                const url = button.getAttribute("data-url");

                navigator.clipboard.writeText(url).then(() => {
                    const icon = button.querySelector("i");
                    const originalClass = icon.className;
                    icon.className = "bi bi-check2";
                    setTimeout(() => {
                        icon.className = originalClass;
                    }, 2000);
                }).catch(err => {
                    console.error("Failed to copy URL: ", err);
                });
            });
        });
    }

    function initLightGal(){
        lightGallery(document.getElementById('albumCards'), {
            speed: 500,
            plugins: [lgVideo],
            selector: '.item',
        });
    }

    function linkCheckboxes(target) {
        const checkboxes = document.querySelectorAll(`#${target} .fileCheck`);
        const originalText = albumTooBigToDownload ? "Album too large to download" : "Download Album as Zip";
        checkboxes.forEach(chk => {
            chk.addEventListener("change", () => {
                const anySelected = Array.from(checkboxes).some(checkbox => checkbox.checked);
                if(!isDownloading) {
                    downloadButton.textContent = anySelected ? "Download Selected as Zip" : originalText;
                }
                if(albumTooBigToDownload){
                    if(anySelected){
                        downloadButton.removeAttribute("disabled");
                        downloadButton.classList.remove("disabled");
                    }else{
                        downloadButton.setAttribute("disabled", "true");
                        downloadButton.classList.add("disabled");
                    }
                }
                if (target === "albumCards") {
                    const card = chk.closest(".card");
                    if (card) {
                        if (chk.checked) {
                            card.classList.add("rainbow-box");
                        } else {
                            card.classList.remove("rainbow-box");
                        }
                    }
                }
            });
        });
    }

    function mimeIcon(mime) {
        const defaultIcon = "bi-file-earmark";
        if (!mime) {
            return defaultIcon;
        }
        const key = mime.split('/')[0];
        return iconMap.get(key) ?? iconMap.get(mime) ?? defaultIcon;
    }

    function renderAlbum(album, viewMode) {
        albumNameElt.innerText = album.name;
        if (album.files.length === 0) {
            const emptyWarning = document.createElement("p");
            emptyWarning.textContent = "Empty Album";
            albumFilesElt.replaceWith(emptyWarning);
            return;
        }

        const newViewMode = document.querySelector("#albumViewControls .btn-outline-primary")?.id;
        if (newViewMode === "tableView") {
            resetSelectedFiles("card");
        } else if (newViewMode === "cardView") {
            resetSelectedFiles("table");
        } else {
            resetSelectedFiles();
        }

        switch (viewMode) {
            case "table":
                renderTable(album);
                window.location.hash = "table";
                break;
            case "card":
                renderCard(album);
                window.location.hash = "card";
        }


        function renderTable(album) {
            site.display(true, albumCardsElt, true);
            site.display(false, albumFilesElt, true);

            document.getElementById("tableView").classList.replace("btn-outline-primary", "btn-primary");
            document.getElementById("cardView").classList.replace("btn-primary", "btn-outline-primary");

            if (filesRendered) {
                return;
            }

            const tbody = document.createElement("tbody");
            for (const e of album.files) {
                const tr = document.createElement("tr");
                const tdCheckbox = document.createElement("th");
                tdCheckbox.setAttribute("scope", "row");
                tdCheckbox.innerHTML = `<input type="checkbox" data-id="${e.id}" id="${e.id}" class="fileCheck" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Select File" />`;
                tr.appendChild(tdCheckbox);

                const tdName = document.createElement("td");
                tdName.innerHTML = `<a href="${e.url}" target="_blank">${e.name}</a> ${e.protected ? "<i class='bi bi-file-lock2-fill'></i>" : ""}`;
                tr.appendChild(tdName);

                const tdSize = document.createElement("td");
                tdSize.textContent = sizeAsHuman(e.size);
                tr.appendChild(tdSize);

                const tdActions = document.createElement("td");
                const directDownload = `<a href="${e.url}?download=true" target="_blank" class="btn btn-outline-primary border-0" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Download"><i class="bi bi-box-arrow-down"></i></a>`;
                const copyUrl = `<button class="copyUrl btn btn-outline-primary border-0" data-url="${e.url}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy URL"><i class="bi bi-clipboard"></i></button></div>`;
                tdActions.innerHTML = directDownload + copyUrl;
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }
            albumFilesElt.appendChild(tbody);
            linkCopyButtons();
            linkCheckboxes("albumFiles");
            filesRendered = true;
        }

        function renderCard(album) {
            const html5VideoMime = ["video/mp4", "video/webm", "video/ogg"];
            site.display(true, albumFilesElt, true);
            site.display(false, albumCardsElt, true);
            document.getElementById("tableView").classList.replace("btn-primary", "btn-outline-primary");
            document.getElementById("cardView").classList.replace("btn-outline-primary", "btn-primary");

            if (cardsRendered) {
                return;
            }

            let i = 0;
            let rowopen;
            for (const e of album.files) {
                const colmain = document.createElement("div");
                colmain.setAttribute("class", "col-md-3");
                const cardmain = document.createElement("div");
                cardmain.setAttribute("class", "card");

                let cardimage;
                if (e.metadata.thumbnail) {
                    const cardImageAnchor = document.createElement("a");
                    if (!e.metadata.isVideo) {
                        cardmain.setAttribute("data-src", e.url);
                    }
                    cardImageAnchor.classList.add("item");
                    if (!e.metadata.isVideo) {
                        cardImageAnchor.setAttribute("data-src", e.url);
                    }
                    //cardImageAnchor.setAttribute("href", e.url); -- CANNOT have href for lightGallery
                    cardimage = document.createElement("img");
                    cardimage.src = e.metadata.thumbnail;
                    cardimage.setAttribute("loading", "lazy");
                    cardimage.setAttribute("alt", e.name);
                    cardimage.setAttribute("class", "card-img-top");
                    cardImageAnchor.setAttribute("data-sub-html", `<h4>${e.name}</h4>`);

                    if(e.metadata.isVideo) {
                        if(html5VideoMime.includes(e.metadata.mediaType)) {
                            cardImageAnchor.dataset.video = `{"source": [{"src":"${e.url}", "type":"${e.metadata.mediaType}"}], "attributes": {"preload": false, "playinline":true, "controls": true}}`;
                            cardImageAnchor.setAttribute("data-poster", e.metadata.thumbnail);
                        } else {
                            cardImageAnchor.setAttribute("data-src", e.metadata.thumbnail);
                        }
                    }

                    cardImageAnchor.appendChild(cardimage);
                    cardimage = cardImageAnchor
                } else {
                    const icon = e.protected ? 'bi-lock' : mimeIcon(e.metadata.mediaType);
                    cardimage = document.createElement("i");
                    cardimage.setAttribute("class", `bi ${icon} card-svg-top card-img-top`);
                }

                cardmain.appendChild(cardimage);

                const cardbody = document.createElement("div");
                cardbody.setAttribute("class", "card-body");
                cardbody.innerHTML = `
                        <h5 class="card-title card-itm">
                            <a href="${e.url}" target="_blank"  data-bs-toggle="tooltip" data-bs-title="${e.name}">${e.name}</a> 
                        </h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            ${sizeAsHuman(e.size)} ${e.protected ? "<span class=\"badge rounded-pill text-bg-secondary\">Protected</span>" : ""}
                        </h6>`;
                const cardfooter = document.createElement("div");
                cardfooter.setAttribute("class", "card-footer d-flex justify-content-between align-items-center");
                const downloadSelect = `<input type="checkbox" data-id="${e.id}" id="${e.id}" class="fileCheck" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Select File" />`;
                const rightJustify = "<div class=\"d-flex justify-content-end\">";
                const directDownload = `<a href="${e.url}?download=true" target="_blank" class="btn btn-outline-primary border-0" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Download"><i class="bi bi-box-arrow-down"></i></a>`;
                const copyUrl = `<button class="copyUrl btn btn-outline-primary border-0" data-url="${e.url}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy URL"><i class="bi bi-clipboard"></i></button></div>`;
                cardfooter.innerHTML = downloadSelect + rightJustify + directDownload + copyUrl;

                if (i % 4 === 0) {
                    rowopen = document.createElement("div");
                    rowopen.setAttribute("class", "row pb-3");
                    albumCardsElt.appendChild(rowopen);
                }

                colmain.appendChild(cardmain);
                cardmain.appendChild(cardbody);
                cardmain.appendChild(cardfooter);
                rowopen.appendChild(colmain);
                i++;
            }
            linkCopyButtons();
            linkCheckboxes("albumCards");
            cardsRendered = true;
        }

    }

    async function getAlbum() {
        Site.loading(true);
        let response;
        try {
            response = await fetch(`${baseUrl}/album/public/${publicToken}`);
        } catch (e) {
            alert(e.message);
            return null;
        } finally {
            Site.loading(false);
        }
        const responseStatus = response.status;
        const responseJson = await response.json();
        if (responseStatus !== 200) {
            alert(responseJson.message);
            throw new Error(responseJson.message);
        }
        return responseJson;
    }

    function resetSelectedFiles(type) {
        let checkboxes;
        if (type === "table") {
            checkboxes = document.querySelectorAll("#albumFiles .fileCheck");
        } else if (type === "card") {
            checkboxes = document.querySelectorAll("#albumCards .fileCheck");
        } else {
            checkboxes = document.querySelectorAll(".fileCheck");
        }
        const evt = new Event("change");
        checkboxes.forEach(chk => {
            chk.checked = false;
            chk.dispatchEvent(evt);
        });
    }

    document.getElementById("tableView").addEventListener("click", () => {
        renderAlbum(album, "table");
    });

    document.getElementById("cardView").addEventListener("click", () => {
        renderAlbum(album, "card");
    });

    downloadButton.addEventListener("click", async () => {
        function progress({loaded, total}) {
            const downloadDone = Math.round(loaded / total * 100) + "%";
            downloadButton.textContent = `Downloading Files - ${downloadDone}`;
        }

        if (downloadButton.hasAttribute("disabled")) {
            return;
        }

        const checkedIds = Array.from(document.querySelectorAll(".fileCheck:checked"))
            .map(checkbox => parseInt(checkbox.dataset.id, 10))
            .filter(id => !isNaN(id));

        if (checkedIds.length === 0 && albumTooBigToDownload) {
            return;
        }

        downloadButton.setAttribute("disabled", "true");
        downloadButton.classList.add("disabled");

        const originalText = downloadButton.textContent;
        downloadButton.textContent = "Compressing Files, please wait...";
        isDownloading = true;

        try {
            const response = await fetch(`${baseUrl}/album/download/${publicToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(checkedIds),
            });

            if (!response.ok) {
                const json = await response.json();
                const errModal = createBasicModal('zipDownloadError', 'Error', `<div class="alert alert-danger">${json.message}</div>`);
                errModal.show();
                return;
            }

            const contentDisposition = response.headers.get("Content-Disposition");
            const filenameRegex = /filename="([^"]+)"/;
            const match = contentDisposition.match(filenameRegex);
            const filename = match ? match[1] : "files.zip";

            const contentLength = response.headers.get("x-content-length");
            const total = Number.parseInt(contentLength);

            let loaded = 0;
            const res = new Response(
                new ReadableStream({
                        async start(controller) {
                            const reader = response.body.getReader();
                            for (; ;) {
                                try {
                                    const {done, value} = await reader.read();
                                    if (done) {
                                        break;
                                    }
                                    loaded += value.byteLength;
                                    progress({loaded, total});
                                    controller.enqueue(value);
                                } catch (e) {
                                    controller.error(e);
                                    return;
                                }
                            }
                            controller.close();
                        }
                    }
                ), {
                    headers: response.headers,
                    status: response.status,
                    statusText: response
                }
            );

            const blob = await res.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("An error occurred during the download process:", error);
        } finally {
            // Restore the state of the download button
            downloadButton.textContent = originalText;
            downloadButton.removeAttribute("disabled");
            downloadButton.classList.remove("disabled");
            isDownloading = false;
        }
    });

    const album = await getAlbum();
    albumNameElt.innerText = album.name;
    document.title = `Waifuvault|${album.name}`;

    const hash = window.location.hash.substring(1);
    renderAlbum(album, hash ? hash : "card");
    initLightGal();
});
