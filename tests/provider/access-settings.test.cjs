const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    {execFileSync} = require("node:child_process");
const {JSDOM} = require("jsdom");
(async () => {
    const dom = new JSDOM('<div id="host"></div>', {url: "https://machine.test", runScripts: "outside-only"}),
        w = dom.window;
    const $ = require("jquery")(w);
    w.$ = w.jQuery = $;
    global.window = w;
    w.eval(fs.readFileSync(require.resolve("knockout"), "utf8"));
    const ko = w.ko;
    w._ = require("lodash");
    w._.contains = w._.includes;
    w.gettext = (s) => s;
    w.OCTOPRINT_VIEWMODELS = [];
    w.Modernizr = {localstorage: true};
    $.fn.modal = $.fn.tab = $.fn.tooltip = function () {
        return this;
    };
    w.eval(fs.readFileSync("src/octoprint/static/js/app/helpers.js", "utf8"));
    w.eval(fs.readFileSync("src/octoprint/static/js/app/viewmodels/access.js", "utf8"));
    await new Promise((r) => $(r));
    const permission = {
        key: "ADMIN",
        name: "Admin",
        description: "Administrator",
        needs: {role: ["admin"]},
        dangerous: true
    };
    const group = {
        key: "admins",
        name: "Admins",
        description: "Administrators",
        permissions: [permission],
        subgroups: [],
        default: false,
        dangerous: true,
        toggleable: true,
        changeable: false,
        removable: false
    };
    const user = {name: "Example", groups: ["admins"], permissions: ["ADMIN"], apikey: undefined, active: true};
    let calls = [],
        hold = false,
        pending,
        model,
        cleanups = [],
        style;
    const response = (kind, data) => {
        calls.push(kind);
        const d = $.Deferred();
        d.abort = () => d.reject({status: 0});
        if (hold) pending = d;
        else d.resolve(data);
        return d;
    };
    w.OctoPrint = {
        access: {
            groups: {list: () => response("groups", {groups: [group]})},
            users: {
                list: () => response("users", {users: [user]}),
                add: (data) => {
                    calls.push(["add", data]);
                    return $.Deferred().resolve({users: [user]});
                }
            }
        }
    };
    const html = execFileSync(
        process.env.SETTINGS_TEST_PYTHON || "python3",
        ["tests/provider/render_access_template.py"],
        {encoding: "utf8"}
    );
    const {mount} = await import(
        "data:text/javascript;base64," + fs.readFileSync("src/octoprint/static/settings/access.js").toString("base64")
    );
    const ctx = {
        container: w.document.querySelector("#host"),
        signal: new AbortController().signal,
        ui: {$, ko},
        cleanup: (f) => cleanups.push(f),
        stylesheet: async (p) => (style = p),
        legacy: {
            prepare: async () => ({html, initial: {permissions: [permission]}}),
            script: async () => {},
            constructor: () =>
                function (args) {
                    model = new w.OCTOPRINT_VIEWMODELS[0][0](args);
                    return model;
                },
            login: () => ({hasPermissionKo: () => true, hasPermission: () => true}),
            root: (c, id, d) => {
                const n = w.document.createElement("div");
                n.id = id;
                n.innerHTML = d.html;
                c.append(n);
                return n;
            },
            clean: (n) => ko.cleanNode(n)
        }
    };
    for (let i = 0; i < 3; i++) {
        const view = await mount(ctx);
        view.setVisible(true);
        assert.equal(style, "/static/settings/access.css");
        assert.equal(ctx.container.querySelector("#system_users tbody .settings_users_name").textContent, "Example");
        assert.equal(
            ctx.container.querySelector("#system_groups tbody .settings_groups_name span").textContent,
            "Admins"
        );
        assert.deepEqual(calls.slice(-2), ["groups", "users"]);
        model.users.showAddUserDialog();
        assert.equal(model.users.editor.new(), true);
        model.users.editor.password("one");
        model.users.editor.repeatedPassword("two");
        assert.equal(model.users.editor.passwordMismatch(), true);
        await model.users.addUser({name: "New", active: true, groups: ["admins"], permissions: []});
        assert.equal(calls.at(-1)[0], "add");
        hold = true;
        model.users.requestData().fail(() => {});
        view.setVisible(false);
        view.dispose();
        view.dispose();
        cleanups.forEach((f) => f());
        cleanups = [];
        assert.equal(pending.state(), "rejected");
        assert.equal(ctx.container.children.length, 0);
        const count = calls.length;
        await model.users.requestData();
        assert.equal(calls.length, count);
        hold = false;
    }
    dom.window.close();
    console.log(
        "PASS native Access Control template, users/groups, editor, API routing, repeat mounting and pending request cleanup"
    );
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
