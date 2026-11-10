export const apiVersion = 1;
export async function mount(ctx) {
    const data = await ctx.legacy.prepare();
    await ctx.stylesheet("/plugin/logging/static/css/logging.css");
    await ctx.legacy.script("/plugin/logging/static/clientjs/logging.js");
    await ctx.legacy.script("/plugin/logging/static/js/logging.js");
    if (ctx.signal.aborted) throw Error("Settings section is closed.");
    window.CONFIG_LOGFILESPERPAGE = 10;
    const node = ctx.legacy.root(ctx.container, "settings_plugin_logging", data);
    const Model = ctx.legacy.constructor("LoggingViewModel");
    const model = new Model([
        ctx.legacy.login(data),
        {
            permissions: {PLUGIN_LOGGING_MANAGE: "PLUGIN_LOGGING_MANAGE"}
        }
    ]);
    let disposed = false,
        visible = false,
        generation = 0,
        baseline;
    const levels = () => Object.fromEntries(model.configuredLoggers().map((item) => [item.component, item.level()]));
    const queue = ctx.settings.createAutosave(
        async () => {
            const snapshot = levels();
            await ctx.request("/plugin/logging/setup/levels", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(snapshot)
            });
            baseline = {...baseline, levels: snapshot};
            model.configuredLoggersChanged = false;
        },
        () => {
            if (baseline) model.fromSetupResponse(baseline);
        }
    );
    model.configuredLoggersHasChanged = () => {
        if (disposed) return;
        model.configuredLoggersChanged = true;
        queue.schedule().catch(() => {}); // Shared autosave reports failures and retains the draft.
    };
    model.requestData = async () => {
        if (disposed || !visible) return;
        const active = ++generation;
        try {
            const response = await ctx.request("/plugin/logging/");
            const snapshot = await response.json();
            if (disposed || !visible || active !== generation) return;
            // Refresh file listings without overwriting an unsaved logging configuration.
            if (queue.dirty()) {
                model.fromLogsResponse(snapshot.logs);
                model.fromSerialLogResponse(snapshot.serial_log);
                model.fromPluginTimingsLogResponse(snapshot.plugintimings_log);
            } else {
                baseline = snapshot.setup;
                model.fromResponse(snapshot);
            }
        } catch (error) {
            if (!disposed && visible && active === generation) ctx.ui.notify(error);
        }
    };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        generation++;
        model.levelSubscriptions.forEach((sub) => sub.dispose());
        ctx.ui.$(node).find("[data-toggle='popover']").popover("destroy");
        ctx.legacy.clean(node, model);
        node.remove();
    };
    ctx.cleanup(dispose);
    ctx.ui.ko.applyBindings(model, node);
    return {
        setVisible(value) {
            if (disposed || visible === value) return;
            visible = value;
            if (visible) void model.requestData();
            else generation++;
        },
        dispose
    };
}
