// The sign-in page is independent of the main application. Remove its HTML
// autofocus before the browser processes it on touch devices.
if (navigator.maxTouchPoints > 0 || window.matchMedia?.("(any-pointer: coarse)").matches) {
    const removeTypingAutofocus = (root) => {
        if (root.nodeType !== 1) return;
        const fields = root.matches("input[autofocus], textarea[autofocus]") ? [root] : [];
        fields.push(...root.querySelectorAll("input[autofocus], textarea[autofocus]"));
        for (const field of fields) {
            const disabled = field.disabled;
            let tapped = false;
            const allowTap = () => {
                tapped = true;
                field.disabled = disabled;
            };
            // Removing the attribute does not cancel an already queued native
            // autofocus request. Keep it non-editable until that request flushes.
            field.disabled = true;
            field.removeAttribute("autofocus");
            field.addEventListener("pointerdown", allowTap, { once: true });
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!tapped && document.activeElement === field) field.blur();
                field.disabled = disabled;
                field.removeEventListener("pointerdown", allowTap);
            }));
        }
    };
    removeTypingAutofocus(document.documentElement);
    new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === "attributes") removeTypingAutofocus(record.target);
            else for (const node of record.addedNodes) removeTypingAutofocus(node);
        }
    }).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["autofocus"]
    });
}

/*
 * Will get included into the login dialog, NOT into the regular OctoPrint
 * web application.
 */

$(function () {
    var OctoPrint = window.OctoPrint;

    OctoPrint.loginui = {
        startedUp: false
    };

    var overlayElement = $("#login-overlay");
    var errorElement = $("#login-error");
    var offlineElement = $("#login-offline");
    var buttonElement = $("#login-button");
    var reconnectElement = $("#login-reconnect");

    var ignoreDisconnect = false;

    buttonElement.click(function () {
        var usernameElement = $("#login-user");
        var passwordElement = $("#login-password");
        var rememberElement = $("#login-remember");

        var username = usernameElement.val();
        var password = passwordElement.val();
        var remember = rememberElement.prop("checked");

        overlayElement.addClass("in");
        errorElement.removeClass("in");

        OctoPrint.browser
            .login(username, password, remember)
            .done(function () {
                ignoreDisconnect = true;
                window.location.href = REDIRECT_URL;
            })
            .fail(function () {
                usernameElement.val("");
                passwordElement.val("");

                overlayElement.removeClass("in");
                errorElement.addClass("in");
            });

        return false;
    });

    OctoPrint.options.baseurl = BASE_URL;

    OctoPrint.socket.onConnected = function () {
        buttonElement.prop("disabled", false);
        offlineElement.removeClass("in");
    };

    OctoPrint.socket.onDisconnected = function () {
        if (ignoreDisconnect) return;
        buttonElement.prop("disabled", true);
        offlineElement.addClass("in");
    };

    reconnectElement.click(function () {
        OctoPrint.socket.reconnect();
    });

    OctoPrint.socket.connect();
    OctoPrint.loginui.startedUp = true;
});
