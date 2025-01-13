Site.loadPage(async site => {
    const albumNameElt = document.getElementById("albumName");
    const albumFilesElt = document.getElementById("albumFiles");
    let filesRendered = false;
    const albumCardsElt = document.getElementById("albumCards");
    let cardsRendered = false;

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

    function mimeIcon(mime) {
        const defaultIcon = "bi-file-earmark";
        if (!mime) {
            return defaultIcon;
        }
        if (mime.startsWith("audio")) {
            return "bi-file-earmark-music";
        }
        if (mime.startsWith("video")) {
            return "bi-file-earmark-play";
        }
        if (mime.startsWith("text")) {
            return "bi-file-earmark-text";
        }
        if (mime.startsWith("octet")) {
            return "bi-file-earmark-binary.svg";
        }
        return defaultIcon;
    }

    function renderAlbum(album, viewMode) {
        albumNameElt.innerText = album.name;
        if (album.files.length === 0) {
            const emptyWarning = document.createElement("p");
            emptyWarning.textContent = "Empty Album";
            albumFilesElt.replaceWith(emptyWarning);
            return;
        }

        switch (viewMode) {
            case "table":
                renderTable(album);
                break;
            case "card":
                renderCard(album);
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
                tdName.innerHTML = `${e.protected ? "<i class='bi bi-file-lock2-fill'></i>" : ""}<a href="${e.url}" target="_blank">${e.name}</a>`;
                tr.appendChild(tdName);

                const tdSize = document.createElement("td");
                tdSize.textContent = sizeAsHuman(e.size);
                tr.appendChild(tdSize);

                tbody.appendChild(tr);
            }
            albumFilesElt.appendChild(tbody);
            filesRendered = true;
        }

        function renderCard(album) {
            site.display(true, albumFilesElt, true);
            site.display(false, albumCardsElt, true);
            document.getElementById("tableView").classList.replace("btn-primary", "btn-outline-primary");
            document.getElementById("cardView").classList.replace("btn-outline-primary", "btn-primary");

            if (cardsRendered) {
                return;
            }

            for (const e of album.files) {
                const colmain = document.createElement("div");
                colmain.setAttribute("class", "col-md-3 pb-3");
                const cardmain = document.createElement("div");
                cardmain.setAttribute("class", "card");

                let cardimage;
                if (e.metadata.thumbnail) {
                    cardimage = document.createElement("img");
                    cardimage.src = e.metadata.thumbnail;
                    cardimage.setAttribute("class", "card-img-top");
                } else {
                    cardimage = document.createElement("i");
                    cardimage.setAttribute("class", `bi ${mimeIcon(e.metadata.mediaType)} card-svg-top card-img-top`);
                }

                cardmain.appendChild(cardimage);

                const cardbody = document.createElement("div");
                cardbody.setAttribute("class", "card-body");
                cardbody.innerHTML = `
                        <h5 class="card-title card-itm" data-bs-toggle="tooltip" data-bs-title="${e.name}">
                            <a href="${e.url}" target="_blank">${e.name}</a>
                        </h5>
                        <h6 class="card-subtitle mb-2 text-muted">${sizeAsHuman(e.size)}</h6>`;
                const cardfooter = document.createElement("div");
                cardfooter.setAttribute("class", "card-footer d-flex justify-content-between align-items-center");
                const downloadSelect = `<input type="checkbox" data-id="${e.id}" id="${e.id}" class="fileCheck" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Select File" />`;
                const rightJustify = "<div class=\"d-flex justify-content-end\">";
                const directDownload = `<a href="${e.url}?download=true" target="_blank" class="btn btn-outline-primary border-0" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Download"><i class="bi bi-box-arrow-down"></i></a>`;
                const copyUrl = `<button class="copyUrl btn btn-outline-primary border-0" data-url="${e.url}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy URL"><i class="bi bi-clipboard"></i></button></div>`;
                cardfooter.innerHTML = downloadSelect + rightJustify + directDownload + copyUrl;
                colmain.appendChild(cardmain);
                cardmain.appendChild(cardbody);
                cardmain.appendChild(cardfooter);
                albumCardsElt.appendChild(colmain);
            }
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
            Site.showError(responseJson.message);
            throw new Error(responseJson.message);
        }
        return responseJson;
    }

    document.getElementById("tableView").addEventListener("click", () => {
        renderAlbum(album, "table");
    });

    document.getElementById("cardView").addEventListener("click", () => {
        renderAlbum(album, "card");
    });

    document.getElementById("downloadFiles").addEventListener("click", () => {
        const checkedIds = Array.from(document.querySelectorAll(".fileCheck:checked"))
            .map(checkbox => parseInt(checkbox.dataset.id, 10))
            .filter(id => !isNaN(id));

        fetch(`${baseUrl}/album/download/${publicToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkedIds)
        })
            .then(response => {
                if (!response.ok) {
                    Site.showError(response.status);
                    throw new Error(response.status);
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "files.zip";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(e => {
                alert(e.message);
            });
    });

    const album = await getAlbum();
    albumNameElt.innerText = album.name;
    document.title = `Waifuvault|${album.name}`;
    renderAlbum(album, "card");
});
