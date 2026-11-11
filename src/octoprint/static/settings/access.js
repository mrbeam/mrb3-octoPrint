export const apiVersion = 1;
export async function mount(ctx) {
    const data = await ctx.legacy.prepare();
    await ctx.stylesheet("/static/settings/access.css");
    await ctx.legacy.script("/static/js/app/viewmodels/access.js");
    if (ctx.signal.aborted) throw Error("Settings section is closed.");
    window.CONFIG_ACCESS_CONTROL = true;
    window.CONFIG_USERSPERPAGE = 10;
    window.CONFIG_GROUPSPERPAGE = 10;
    window.PERMISSIONS = data.initial.permissions;
    const node = ctx.legacy.root(ctx.container, "settings-users", data);
    const Access = ctx.legacy.constructor("AccessViewModel");
    const loginState = ctx.legacy.login(data);
    const access = new Access([loginState]);
    let disposed = false,
        visible = false;
    const requests = new Set();
    for (const model of [access.groups, access.users]) {
        const receive = model.fromResponse;
        model.fromResponse = (...args) => {
            if (!disposed) return receive(...args);
        };
        const request = model.requestData;
        model.requestData = () => {
            if (disposed) return ctx.ui.$.Deferred().resolve().promise();
            const pending = request();
            if (pending) {
                requests.add(pending);
                pending.always(() => requests.delete(pending));
            }
            return pending;
        };
    }
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        requests.forEach((request) => request.abort?.());
        requests.clear();
        ctx.legacy.clean(node, access);
        const seen = new Set();
        const cleanComputeds = (value) => {
            if (!value || seen.has(value)) return;
            seen.add(value);
            if (ctx.ui.ko.isComputed(value)) value.dispose();
            else if (
                Array.isArray(value) ||
                (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
            )
                Object.values(value).forEach(cleanComputeds);
        };
        Object.values(access).forEach(cleanComputeds);
        node.remove();
    };
    ctx.cleanup(dispose);
    access.onServerConnect();
    access.onStartup();
    ctx.ui.ko.applyBindings({access, loginState}, node);
    await access.groups.requestData();
    if (!disposed) await access.users.requestData();
    return {
        setVisible(value) {
            if (disposed || visible === value) return;
            visible = value;
            if (!visible) ctx.ui.$(node).find(".modal").modal("hide");
        },
        dispose
    };
}
