import {prepare_server, login, await_support_info_page} from "../util/util";

context("Error free page load", () => {
    let spy;
    Cypress.on("uncaught:exception", (err, runnable) => {
        console.error(err);
        return false;
    });

    Cypress.on("window:before:load", (win) => {
        spy = cy.spy(win.console, "error");
    });

    const username = "admin";
    const password = "test";

    beforeEach(() => {
        prepare_server();
        login(username, password);

        cy.visit("/");

        await_support_info_page();
    });

    it("loads without error", () => {
        expect(spy).not.to.be.called;
    });
});
