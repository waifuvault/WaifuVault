const Site = (function() {
    let isInit = false;

    const loading = function loading(show) {
        const loader = document.getElementById("loader");
        const overlay = document.getElementById("overlay");
        if (show) {
            overlay.classList.remove("hidden");
            loader.classList.remove("hidden");
        } else {
            overlay.classList.add("hidden");
            loader.classList.add("hidden");
        }
    };


    const showError = function showError(message) {
        const error = document.getElementById("error");
        if (message === null) {
            document.getElementById("errorContent").textContent = null;
            display(true, error);
            return;
        }
        const success = document.getElementById("success");
        if (!success.classList.contains("hidden")) {
            display(true, success);
        }
        document.getElementById("errorContent").textContent = message.trim();
        display(false, error);
    };


    const showSuccess = function showSuccess() {
        const error = document.getElementById("error");
        const success = document.getElementById("success");
        display(true, error);
        if (success.classList.contains("hidden")) {
            display(false, success);
        }
    };

    const display = function display(hide, element) {
        if (hide) {
            element.closest("div").classList.add("hidden");
        } else {
            element.closest("div").classList.remove("hidden");
        }
    };


    const loadPage = function loadPage(anon) {
        // eslint-disable-next-line require-await
        anon.call(this, Site).then(async () => {
            function initTooltips() {
                document.querySelectorAll("[data-bs-toggle=\"tooltip\"]").forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
            }

            function initTabs() {
                const triggerTabList = document.querySelectorAll("#resultTabs button");
                triggerTabList.forEach(triggerEl => {
                    const tabTrigger = new bootstrap.Tab(triggerEl);
                    triggerEl.addEventListener("click", event => {
                        event.preventDefault();
                        tabTrigger.show();
                    });
                });
            }

            initTooltips();
            initTabs();
            isInit = true;
        });
    };
    return {
        loadPage,
        loading,
        display,
        showSuccess,
        showError
    };
}());
