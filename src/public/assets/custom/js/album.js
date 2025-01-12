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

    function renderAlbum(album, tableview) {
        albumNameElt.innerText = album.name;
        if(album.files.length === 0) {
            const emptyWarning = document.createElement('p');
            emptyWarning.textContent = 'Empty Album';
            albumFilesElt.replaceWith(emptyWarning);
        } else if(tableview) {
            if(!filesRendered) {
                const tbody = document.createElement('tbody');
                album.files.forEach(e => {
                    const tr = document.createElement('tr');

                    const tdCheckbox = document.createElement('th');
                    tdCheckbox.setAttribute('scope','row');
                    tdCheckbox.setAttribute('style', 'padding-top:8px !important; padding-left:8px !important;');
                    tdCheckbox.innerHTML = `<input type="checkbox" data-id="${e.id}" id="${e.id}" class="fileCheck" />`;
                    tr.appendChild(tdCheckbox);

                    const tdName = document.createElement('td');
                    tdName.innerHTML = `${e.protected ? "<i class='bi bi-file-lock2-fill'></i>" : ""}<a href="${e.url}" target="_blank">${e.name}</a>`;
                    tr.appendChild(tdName);

                    const tdSize = document.createElement('td');
                    tdSize.textContent = sizeAsHuman(e.size);
                    tr.appendChild(tdSize);

                    tbody.appendChild(tr);
                });
                albumFilesElt.appendChild(tbody);
                filesRendered = true;
            }
            albumCardsElt.style.visibility = 'hidden';
            albumCardsElt.style.display = 'none';
            albumFilesElt.style.visibility = 'visible';
            albumFilesElt.style.display = ''
            document.getElementById('tableView').setAttribute('class', 'btn btn-primary');
            document.getElementById('cardView').setAttribute('class', 'btn btn-outline-primary');
        } else {
            if(!cardsRendered) {
                album.files.forEach( e => {
                    const colmain = document.createElement('div');
                    colmain.setAttribute('class', 'col-md-3 pb-3');
                    const cardmain = document.createElement('div');
                    cardmain.setAttribute('class','card');
                    const cardbody = document.createElement('div');
                    cardbody.setAttribute('class','card-body');
                    cardbody.innerHTML = `
                        <h5 class="card-title card-itm" data-bs-toggle="tooltip" data-bs-title="${e.name}">
                            <a href="${e.url}" target="_blank">${e.name}</a>
                        </h5>
                        <h6 class="card-subtitle mb-2 text-muted">${sizeAsHuman(e.size)}</h6>
                        <p class="card-text">
                            <i class="bi bi-file-earmark"></i>
                        </p>
                    `;
                    const cardfooter = document.createElement('div');
                    cardfooter.setAttribute('class','card-footer d-flex justify-content-between align-items-center');
                    const downloadSelect = `<input type="checkbox" data-id="${e.id}" id="${e.id}" class="fileCheck" />`;
                    const rightJustify = '<div class="d-flex justify-content-end">';
                    const directDownload = `<a href="${e.url}?download=true" target="_blank" class="btn btn-outline-primary border-0" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Download"><i class="bi bi-box-arrow-down"></i></a>`;
                    const copyUrl = `<button class="copyUrl btn btn-outline-primary border-0" data-url="${e.url}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy URL"><i class="bi bi-clipboard"></i></button></div>`;
                    cardfooter.innerHTML = downloadSelect + rightJustify + directDownload + copyUrl;
                    colmain.appendChild(cardmain);
                    cardmain.appendChild(cardbody);
                    cardmain.appendChild(cardfooter);
                    albumCardsElt.appendChild(colmain);
                })
                cardsRendered = true;
            }
            const copyButtons = document.querySelectorAll('.copyUrl');
            copyButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const url = button.getAttribute('data-url');

                    navigator.clipboard.writeText(url).then(() => {
                        const icon = button.querySelector('i');
                        const originalClass = icon.className;
                        icon.className = 'bi bi-check2';
                        setTimeout(() => {
                            icon.className = originalClass;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy URL: ', err);
                    });
                });
            });
            albumFilesElt.style.visibility = 'hidden';
            albumFilesElt.style.display = 'none';
            albumCardsElt.style.visibility = 'visible';
            albumCardsElt.style.display = '';
            document.getElementById('tableView').setAttribute('class', 'btn btn-outline-primary');
            document.getElementById('cardView').setAttribute('class', 'btn btn-primary');
        }
    }

    async function getAlbum() {
        Site.loading(true);
        let response;
        try {
            response = await fetch(`${baseUrl}/album/public/${publicToken}`);
        } catch(e) {
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

    document.getElementById('tableView').addEventListener('click', () => {
        renderAlbum(album, true);
    });

    document.getElementById('cardView').addEventListener('click', () => {
        renderAlbum(album, false);
    });

    document.getElementById('downloadFiles').addEventListener('click', () => {
        const checkedIds = Array.from(document.querySelectorAll('.fileCheck:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id, 10))
            .filter(id => !isNaN(id));

        fetch(`${baseUrl}/album/download/${publicToken}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(checkedIds)
        })
            .then(response => {
                if(!response.ok) {
                    Site.showError(response.status);
                    throw new Error(response.status);
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'files.zip';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(e => {
                alert(e.message);
            })
    });

    const album = await getAlbum();
    albumNameElt.innerText = album.name;
    renderAlbum(album, false);
})
